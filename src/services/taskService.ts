import { requireSupabaseClient } from '../lib/supabase';
import type { Database, Tables, TablesInsert, TablesUpdate, TaskStatus } from '../types/database.types';

export type Task = Tables<'tasks'>;
export type TaskInsert = TablesInsert<'tasks'>;
export type TaskUpdate = TablesUpdate<'tasks'>;

export interface TaskWithDetails extends Task {
  competition?: {
    id: string;
    name: string;
  } | null;
  assignee?: {
    id: string;
    username: string;
    full_name: string;
  } | null;
  comments_count?: number;
}

export interface TaskFilterOptions {
  competitionId?: string;
  assigneeId?: string;
  status?: TaskStatus;
  search?: string;
}

export async function fetchTasks(filter?: TaskFilterOptions): Promise<TaskWithDetails[]> {
  const client = requireSupabaseClient();
  let query = client
    .from('tasks')
    .select(`
      *,
      competition:competitions (id, name),
      assignee:profiles!tasks_assignee_id_fkey (id, username, full_name),
      task_comments (id)
    `)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });

  if (filter?.competitionId && filter.competitionId !== 'all') {
    query = query.eq('competition_id', filter.competitionId);
  }

  if (filter?.status) {
    query = query.eq('status', filter.status);
  }

  if (filter?.assigneeId) {
    query = query.eq('assignee_id', filter.assigneeId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Gagal memuat tugas: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    ...row,
    comments_count: row.task_comments?.length || 0,
  }));
}

export async function fetchTaskById(id: string): Promise<TaskWithDetails | null> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('tasks')
    .select(`
      *,
      competition:competitions (id, name),
      assignee:profiles!tasks_assignee_id_fkey (id, username, full_name),
      task_comments (id)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memuat detail tugas: ${error.message}`);
  }

  if (!data) return null;

  return {
    ...(data as any),
    comments_count: (data as any).task_comments?.length || 0,
  } as TaskWithDetails;
}

export async function createTask(
  payload: Omit<TaskInsert, 'id' | 'created_at' | 'updated_at'>
): Promise<Task> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('tasks')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Gagal membuat tugas: ${error.message}`);
  }

  // Record activity log & send assignment notification
  try {
    await client.from('activity_logs').insert({
      competition_id: payload.competition_id,
      task_id: data.id,
      actor_id: payload.created_by,
      action: 'created_task',
      details: { title: data.title },
    });

    if (payload.assignee_id && payload.assignee_id !== payload.created_by) {
      await client.from('notifications').insert({
        user_id: payload.assignee_id,
        actor_id: payload.created_by || null,
        type: 'assignment',
        title: 'Anda ditugaskan pada tugas baru',
        body: `Tugas "${data.title}" telah ditugaskan kepada Anda.`,
        task_id: data.id,
        competition_id: payload.competition_id,
      });
    }
  } catch {
    // Ignore secondary log and notification failures
  }

  return data;
}

export async function updateTask(
  id: string,
  payload: TaskUpdate
): Promise<Task> {
  const client = requireSupabaseClient();

  const updates: TaskUpdate = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  if (payload.status === 'done') {
    updates.completed_at = new Date().toISOString();
  } else if (payload.status !== undefined) {
    updates.completed_at = null;
  }

  const { data, error } = await client
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Gagal memperbarui tugas: ${error.message}`);
  }

  if (payload.assignee_id) {
    try {
      await client.from('notifications').insert({
        user_id: payload.assignee_id,
        actor_id: null,
        type: 'assignment',
        title: 'Penugasan tugas diperbarui',
        body: `Anda ditugaskan pada tugas "${data.title}".`,
        task_id: data.id,
        competition_id: data.competition_id,
      });
    } catch {
      // Ignore secondary notification errors
    }
  }

  return data;
}

export async function updateTaskStatus(
  id: string,
  newStatus: TaskStatus
): Promise<Task> {
  return updateTask(id, { status: newStatus });
}

export async function deleteTask(id: string): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.from('tasks').delete().eq('id', id);

  if (error) {
    throw new Error(`Gagal menghapus tugas: ${error.message}`);
  }
}

// Comments & Mentions
export interface CommentWithAuthor {
  id: string;
  task_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  author?: {
    id: string;
    username: string;
    full_name: string;
  } | null;
}

export async function fetchTaskComments(taskId: string): Promise<CommentWithAuthor[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('task_comments')
    .select(`
      id,
      task_id,
      author_id,
      content,
      created_at,
      author:profiles!task_comments_author_id_fkey (id, username, full_name)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Gagal memuat komentar: ${error.message}`);
  }

  return (data || []) as unknown as CommentWithAuthor[];
}

export async function addTaskComment(
  taskId: string,
  authorId: string,
  content: string,
  competitionId?: string
): Promise<CommentWithAuthor> {
  const client = requireSupabaseClient();

  const { data, error } = await client
    .from('task_comments')
    .insert({
      task_id: taskId,
      author_id: authorId,
      content: content.trim(),
    })
    .select(`
      id,
      task_id,
      author_id,
      content,
      created_at,
      author:profiles!task_comments_author_id_fkey (id, username, full_name)
    `)
    .single();

  if (error) {
    throw new Error(`Gagal menambahkan komentar: ${error.message}`);
  }

  // Scan for @username mentions to notify users
  const mentions = content.match(/@([a-zA-Z0-9_.]+)/g);
  if (mentions && mentions.length > 0) {
    const rawUsernames = mentions.map((m) => m.slice(1).toLowerCase());
    try {
      const { data: mentionedUsers } = await client
        .from('profiles')
        .select('id, username')
        .in('username', rawUsernames);

      if (mentionedUsers && mentionedUsers.length > 0) {
        for (const user of mentionedUsers) {
          if (user.id !== authorId) {
            await client.from('notifications').insert({
              user_id: user.id,
              actor_id: authorId,
              type: 'mention',
              title: 'Anda disebut dalam komentar tugas',
              body: content.slice(0, 150),
              task_id: taskId,
              competition_id: competitionId || null,
            });
          }
        }
      }
    } catch {
      // Ignore non-blocking notification errors
    }
  }

  // Also notify task assignee if exists and not the author
  try {
    const { data: taskData } = await client
      .from('tasks')
      .select('assignee_id, title')
      .eq('id', taskId)
      .maybeSingle();

    if (taskData?.assignee_id && taskData.assignee_id !== authorId) {
      await client.from('notifications').insert({
        user_id: taskData.assignee_id,
        actor_id: authorId,
        type: 'comment',
        title: 'Komentar baru pada tugas Anda',
        body: `Komentar baru pada tugas "${taskData.title}": ${content.slice(0, 100)}`,
        task_id: taskId,
        competition_id: competitionId || null,
      });
    }
  } catch {
    // Non-blocking
  }

  return data as unknown as CommentWithAuthor;
}

// Attachments
export interface AttachmentItem {
  id: string;
  task_id: string;
  uploaded_by: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  created_at: string;
}

export async function fetchTaskAttachments(taskId: string): Promise<AttachmentItem[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('task_attachments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Gagal memuat lampiran: ${error.message}`);
  }

  return (data || []) as AttachmentItem[];
}

export async function uploadTaskAttachment(
  taskId: string,
  file: File,
  uploadedBy: string
): Promise<AttachmentItem> {
  const client = requireSupabaseClient();

  const fileExt = file.name.split('.').pop();
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${taskId}/${Date.now()}_${cleanName}`;

  // Upload to Supabase Storage bucket 'task-attachments'
  const { error: uploadError } = await client.storage
    .from('task-attachments')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    throw new Error(`Gagal mengunggah file ke Storage: ${uploadError.message}`);
  }

  // Insert metadata into task_attachments
  const { data, error: dbError } = await client
    .from('task_attachments')
    .insert({
      task_id: taskId,
      uploaded_by: uploadedBy,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type || fileExt || 'application/octet-stream',
    })
    .select()
    .single();

  if (dbError) {
    throw new Error(`Gagal menyimpan data lampiran: ${dbError.message}`);
  }

  return data as AttachmentItem;
}

export async function getAttachmentDownloadUrl(filePath: string): Promise<string> {
  const client = requireSupabaseClient();
  const { data, error } = await client.storage
    .from('task-attachments')
    .createSignedUrl(filePath, 3600); // 1 hour signed URL

  if (error) {
    throw new Error(`Gagal membuat tautan unduh: ${error.message}`);
  }

  return data.signedUrl;
}
