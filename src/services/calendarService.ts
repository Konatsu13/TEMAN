import { requireSupabaseClient } from '../lib/supabase';
import type { Database, EventType, Tables, TablesInsert, TablesUpdate } from '../types/database.types';

export type CalendarEvent = Tables<'calendar_events'>;
export type CalendarEventInsert = TablesInsert<'calendar_events'>;
export type CalendarEventUpdate = TablesUpdate<'calendar_events'>;

export interface CalendarEventWithDetails extends CalendarEvent {
  competition?: {
    id: string;
    name: string;
  } | null;
  creator?: {
    id: string;
    username: string;
    full_name: string;
  } | null;
}

export interface UnifiedCalendarItem {
  id: string;
  source: 'event' | 'competition_deadline' | 'task_deadline';
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  eventType?: EventType;
  competitionId?: string | null;
  competitionName?: string | null;
  location?: string | null;
  assigneeName?: string | null;
  status?: string | null;
  isOverdue?: boolean;
  canEdit?: boolean;
}

export async function fetchCalendarEvents(
  competitionId?: string
): Promise<CalendarEventWithDetails[]> {
  const client = requireSupabaseClient();
  let query = client
    .from('calendar_events')
    .select(`
      *,
      competition:competitions (id, name),
      creator:profiles!calendar_events_created_by_fkey (id, username, full_name)
    `)
    .order('starts_at', { ascending: true });

  if (competitionId && competitionId !== 'all') {
    query = query.eq('competition_id', competitionId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Gagal memuat event kalender: ${error.message}`);
  }

  return (data || []) as unknown as CalendarEventWithDetails[];
}

export async function createCalendarEvent(
  payload: Omit<CalendarEventInsert, 'id' | 'created_at' | 'updated_at'>
): Promise<CalendarEvent> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('calendar_events')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Gagal membuat jadwal event: ${error.message}`);
  }

  // Log activity
  try {
    if (payload.competition_id) {
      await client.from('activity_logs').insert({
        competition_id: payload.competition_id,
        actor_id: payload.created_by,
        action: 'created_calendar_event',
        details: { title: data.title, event_type: data.event_type },
      });
    }
  } catch {
    // Non-blocking log
  }

  return data;
}

export async function updateCalendarEvent(
  id: string,
  payload: CalendarEventUpdate
): Promise<CalendarEvent> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('calendar_events')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Gagal memperbarui jadwal event: ${error.message}`);
  }

  return data;
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.from('calendar_events').delete().eq('id', id);

  if (error) {
    throw new Error(`Gagal menghapus jadwal event: ${error.message}`);
  }
}

/**
 * Aggregates all schedule points:
 * 1. Calendar Events (meetings, presentations, general events)
 * 2. Competition Deadlines (from competitions.deadline)
 * 3. Task Due Dates (from tasks.due_date)
 */
export async function fetchUnifiedCalendarItems(
  competitionId?: string
): Promise<UnifiedCalendarItem[]> {
  const client = requireSupabaseClient();

  // 1. Fetch Calendar Events
  let eventsQuery = client
    .from('calendar_events')
    .select(`
      *,
      competition:competitions (id, name),
      creator:profiles!calendar_events_created_by_fkey (id, username, full_name)
    `);

  if (competitionId && competitionId !== 'all') {
    eventsQuery = eventsQuery.eq('competition_id', competitionId);
  }

  // 2. Fetch Competitions with deadline
  let compsQuery = client
    .from('competitions')
    .select('id, name, deadline, status')
    .not('deadline', 'is', null);

  if (competitionId && competitionId !== 'all') {
    compsQuery = compsQuery.eq('id', competitionId);
  }

  // 3. Fetch Tasks with due_date
  let tasksQuery = client
    .from('tasks')
    .select(`
      id,
      title,
      description,
      due_date,
      status,
      competition_id,
      competition:competitions (id, name),
      assignee:profiles!tasks_assignee_id_fkey (id, username, full_name)
    `)
    .not('due_date', 'is', null);

  if (competitionId && competitionId !== 'all') {
    tasksQuery = tasksQuery.eq('competition_id', competitionId);
  }

  const [eventsRes, compsRes, tasksRes] = await Promise.all([
    eventsQuery,
    compsQuery,
    tasksQuery,
  ]);

  const items: UnifiedCalendarItem[] = [];
  const now = Date.now();

  // Map calendar events
  if (eventsRes.data) {
    for (const ev of eventsRes.data as any[]) {
      items.push({
        id: `event-${ev.id}`,
        source: 'event',
        title: ev.title,
        description: ev.description,
        startsAt: ev.starts_at,
        endsAt: ev.ends_at,
        eventType: ev.event_type,
        competitionId: ev.competition_id,
        competitionName: ev.competition?.name || null,
        location: ev.location,
        isOverdue: false,
        canEdit: true,
      });
    }
  }

  // Map competition deadlines
  if (compsRes.data) {
    for (const comp of compsRes.data) {
      if (comp.deadline) {
        const isPast = new Date(comp.deadline).getTime() < now;
        items.push({
          id: `comp-deadline-${comp.id}`,
          source: 'competition_deadline',
          title: `Batas Pengumpulan: ${comp.name}`,
          description: `Deadline submission resmi untuk kompetisi ${comp.name}.`,
          startsAt: comp.deadline,
          competitionId: comp.id,
          competitionName: comp.name,
          status: comp.status,
          isOverdue: isPast && comp.status !== 'completed' && comp.status !== 'submitted',
          canEdit: false,
        });
      }
    }
  }

  // Map task deadlines
  if (tasksRes.data) {
    for (const task of tasksRes.data as any[]) {
      if (task.due_date) {
        const isPast = new Date(task.due_date).getTime() < now;
        items.push({
          id: `task-deadline-${task.id}`,
          source: 'task_deadline',
          title: `Tenggat Tugas: ${task.title}`,
          description: task.description,
          startsAt: task.due_date,
          competitionId: task.competition_id,
          competitionName: task.competition?.name || null,
          assigneeName: task.assignee?.full_name || null,
          status: task.status,
          isOverdue: isPast && task.status !== 'done',
          canEdit: false,
        });
      }
    }
  }

  // Sort by startsAt ascending
  return items.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );
}
