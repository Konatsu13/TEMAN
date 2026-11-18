import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  Filter,
  Layers,
  LayoutGrid,
  List,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchCompetitions,
  type Competition,
} from '../../services/competitionService';
import {
  fetchMembersWithRoles,
  type MemberListItem,
} from '../../services/memberService';
import {
  addTaskComment,
  createTask,
  deleteTask,
  fetchTaskAttachments,
  fetchTaskById,
  fetchTaskComments,
  fetchTasks,
  getAttachmentDownloadUrl,
  updateTask,
  updateTaskStatus,
  uploadTaskAttachment,
  type AttachmentItem,
  type CommentWithAuthor,
  type TaskWithDetails,
} from '../../services/taskService';
import type { TaskStatus } from '../../types/database.types';
import {
  formatDateWIB,
  formatDateTimeWIB,
  formatFileSize,
  getInitials,
} from '../../utils/formatters';

const STATUS_COLUMNS: {
  status: TaskStatus;
  label: string;
  variant: 'default' | 'primary' | 'warning' | 'success';
  bgLight: string;
  bgDark: string;
}[] = [
  {
    status: 'todo',
    label: 'Akan Dikerjakan',
    variant: 'default',
    bgLight: 'bg-slate-50/70 border-slate-200/80',
    bgDark: 'dark:bg-slate-900/40 dark:border-slate-800',
  },
  {
    status: 'in_progress',
    label: 'Sedang Dikerjakan',
    variant: 'primary',
    bgLight: 'bg-blue-50/30 border-blue-100',
    bgDark: 'dark:bg-blue-950/20 dark:border-blue-900/40',
  },
  {
    status: 'review',
    label: 'Dalam Review',
    variant: 'warning',
    bgLight: 'bg-amber-50/30 border-amber-100',
    bgDark: 'dark:bg-amber-950/20 dark:border-amber-900/40',
  },
  {
    status: 'done',
    label: 'Selesai',
    variant: 'success',
    bgLight: 'bg-emerald-50/30 border-emerald-100',
    bgDark: 'dark:bg-emerald-950/20 dark:border-emerald-900/40',
  },
];

export function MyTasksPage() {
  const { user, profile } = useAuth();

  // Primary Data
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Task Form State
  const [taskForm, setTaskForm] = useState<{
    title: string;
    description: string;
    competition_id: string;
    assignee_id: string;
    due_date: string;
    status: TaskStatus;
  }>({
    title: '',
    description: '',
    competition_id: '',
    assignee_id: '',
    due_date: '',
    status: 'todo',
  });

  // Detail Modal State
  const [detailTask, setDetailTask] = useState<TaskWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'attachments'>('details');
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Initial Data Fetch
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [tasksData, compsData, membersData] = await Promise.all([
        fetchTasks(),
        fetchCompetitions(),
        fetchMembersWithRoles(),
      ]);
      setTasks(tasksData);
      setCompetitions(compsData);
      setMembers(membersData);
    } catch (err: any) {
      console.error('Failed to load tasks data:', err);
      setErrorMsg(err.message || 'Gagal memuat data tugas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInitialData();
  }, []);

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDesc = (t.description || '').toLowerCase().includes(q);
        const matchesComp = (t.competition?.name || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesComp) return false;
      }

      // Competition Filter
      if (selectedCompetition !== 'all' && t.competition_id !== selectedCompetition) {
        return false;
      }

      // Assignee Filter
      if (selectedAssignee === 'me') {
        if (t.assignee_id !== profile?.id) return false;
      } else if (selectedAssignee === 'unassigned') {
        if (t.assignee_id !== null) return false;
      } else if (selectedAssignee !== 'all') {
        if (t.assignee_id !== selectedAssignee) return false;
      }

      // Status Filter
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, selectedCompetition, selectedAssignee, statusFilter, profile?.id]);

  // Open Create Modal
  const openCreateModal = (initialStatus: TaskStatus = 'todo') => {
    setModalMode('create');
    setEditingTaskId(null);
    setTaskForm({
      title: '',
      description: '',
      competition_id: competitions[0]?.id || '',
      assignee_id: profile?.id || '',
      due_date: '',
      status: initialStatus,
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (task: TaskWithDetails) => {
    setModalMode('edit');
    setEditingTaskId(task.id);

    // Format ISO string to datetime-local value (YYYY-MM-DDTHH:mm)
    let formattedDueDate = '';
    if (task.due_date) {
      const d = new Date(task.due_date);
      if (!Number.isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        formattedDueDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }

    setTaskForm({
      title: task.title,
      description: task.description || '',
      competition_id: task.competition_id,
      assignee_id: task.assignee_id || '',
      due_date: formattedDueDate,
      status: task.status,
    });
    setIsModalOpen(true);
  };

  // Submit Create / Edit Task
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      alert('Judul tugas wajib diisi.');
      return;
    }
    if (!taskForm.competition_id) {
      alert('Pilih kompetisi untuk tugas ini.');
      return;
    }

    try {
      setIsSubmitting(true);
      const isoDueDate = taskForm.due_date ? new Date(taskForm.due_date).toISOString() : null;

      if (modalMode === 'create') {
        const created = await createTask({
          competition_id: taskForm.competition_id,
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || null,
          assignee_id: taskForm.assignee_id || null,
          due_date: isoDueDate,
          status: taskForm.status,
          created_by: profile?.id || null,
        });

        // Refresh task list
        const refreshedTasks = await fetchTasks();
        setTasks(refreshedTasks);
      } else if (modalMode === 'edit' && editingTaskId) {
        await updateTask(editingTaskId, {
          competition_id: taskForm.competition_id,
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || null,
          assignee_id: taskForm.assignee_id || null,
          due_date: isoDueDate,
          status: taskForm.status,
        });

        const refreshedTasks = await fetchTasks();
        setTasks(refreshedTasks);

        // Update detailTask if currently open
        if (detailTask?.id === editingTaskId) {
          const updatedDetail = await fetchTaskById(editingTaskId);
          if (updatedDetail) setDetailTask(updatedDetail);
        }
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save task:', err);
      alert(err.message || 'Gagal menyimpan tugas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Status Update
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      if (detailTask && detailTask.id === taskId) {
        setDetailTask((prev) => (prev ? { ...prev, status: newStatus } : null));
      }

      await updateTaskStatus(taskId, newStatus);
    } catch (err: any) {
      console.error('Failed to update task status:', err);
      alert(err.message || 'Gagal mengubah status tugas.');
      void loadInitialData();
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (detailTask?.id === taskId) {
        setDetailTask(null);
      }
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error('Failed to delete task:', err);
      alert(err.message || 'Gagal menghapus tugas.');
    }
  };

  // Open Detail Modal
  const openDetailModal = async (task: TaskWithDetails) => {
    setDetailTask(task);
    setActiveTab('details');
    setIsModalOpen(false);

    // Fetch comments and attachments in background
    void loadComments(task.id);
    void loadAttachments(task.id);
  };

  const loadComments = async (taskId: string) => {
    try {
      setLoadingComments(true);
      const data = await fetchTaskComments(taskId);
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const loadAttachments = async (taskId: string) => {
    try {
      setLoadingAttachments(true);
      const data = await fetchTaskAttachments(taskId);
      setAttachments(data);
    } catch (err) {
      console.error('Failed to load attachments:', err);
    } finally {
      setLoadingAttachments(false);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !detailTask || !profile) return;

    try {
      setSubmittingComment(true);
      const createdComment = await addTaskComment(
        detailTask.id,
        profile.id,
        newComment,
        detailTask.competition_id
      );
      setComments((prev) => [...prev, createdComment]);
      setNewComment('');

      // Update comment count on task card
      setTasks((prev) =>
        prev.map((t) =>
          t.id === detailTask.id
            ? { ...t, comments_count: (t.comments_count || 0) + 1 }
            : t
        )
      );
    } catch (err: any) {
      console.error('Failed to add comment:', err);
      alert(err.message || 'Gagal menambahkan komentar.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Upload Attachment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !detailTask || !profile) return;

    try {
      setUploadingAttachment(true);
      const item = await uploadTaskAttachment(detailTask.id, file, profile.id);
      setAttachments((prev) => [item, ...prev]);
      e.target.value = '';
    } catch (err: any) {
      console.error('Failed to upload attachment:', err);
      alert(err.message || 'Gagal mengunggah berkas.');
    } finally {
      setUploadingAttachment(false);
    }
  };

  // Download Attachment
  const handleDownloadAttachment = async (filePath: string) => {
    try {
      const url = await getAttachmentDownloadUrl(filePath);
      window.open(url, '_blank');
    } catch (err: any) {
      console.error('Failed to get download URL:', err);
      alert(err.message || 'Gagal mengunduh berkas.');
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      await handleStatusChange(taskId, targetStatus);
    }
  };

  // Check if due date is overdue
  const isOverdue = (dueDate: string | null, status: TaskStatus) => {
    if (!dueDate || status === 'done') return false;
    return new Date(dueDate).getTime() < Date.now();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              Tugas Tim & Saya
            </h2>
            <Badge variant="primary" size="sm">
              {filteredTasks.length} Tugas
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Kelola pembagian tugas, koordinasi via komentar @mention, dan lampiran berkas terintegrasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-800 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'board'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Daftar</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => openCreateModal('todo')}
            disabled={competitions.length === 0}
          >
            Tambah Tugas
          </Button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <Card variant="subtle" className="p-3.5 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {/* Search Input */}
          <div className="lg:col-span-4">
            <Input
              placeholder="Cari tugas atau kompetisi..."
              leftIcon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter by Competition */}
          <div className="lg:col-span-3">
            <select
              value={selectedCompetition}
              onChange={(e) => setSelectedCompetition(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">Semua Kompetisi ({competitions.length})</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Assignee */}
          <div className="lg:col-span-3">
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">Semua Penanggung Jawab</option>
              <option value="me">Tugas Saya</option>
              <option value="unassigned">Belum Ditugaskan</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter (especially useful in List View or small screens) */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">Semua Status</option>
              <option value="todo">Akan Dikerjakan</option>
              <option value="in_progress">Sedang Dikerjakan</option>
              <option value="review">Dalam Review</option>
              <option value="done">Selesai</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Error Banner */}
      {errorMsg && (
        <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void loadInitialData()}>
            Coba Lagi
          </Button>
        </div>
      )}

      {/* If No Competitions Exist at All */}
      {!loading && competitions.length === 0 && (
        <Card variant="default">
          <CardContent className="pt-6">
            <EmptyState
              icon={<Layers className="h-6 w-6" />}
              title="Belum Ada Kompetisi"
              description="Anda harus membuat minimal satu kompetisi terlebih dahulu sebelum dapat mendistribusikan tugas tim."
            />
          </CardContent>
        </Card>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((col) => (
            <div key={col} className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      {!loading && competitions.length > 0 && (
        <>
          {/* VIEW MODE 1: KANBAN BOARD */}
          {viewMode === 'board' && (
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STATUS_COLUMNS.map((col) => {
                const colTasks = filteredTasks.filter((t) => t.status === col.status);

                return (
                  <div
                    key={col.status}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.status)}
                    className={`flex min-h-[500px] flex-col rounded-xl border p-3 transition-colors ${col.bgLight} ${col.bgDark}`}
                  >
                    {/* Column Header */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={col.variant} size="sm" dot>
                          {col.label}
                        </Badge>
                        <span className="font-mono text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                          {colTasks.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openCreateModal(col.status)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-white/60 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                        title={`Tambah tugas ke ${col.label}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Column Task List */}
                    <div className="flex flex-1 flex-col gap-2.5">
                      {colTasks.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200/80 p-4 text-center dark:border-slate-800/80">
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            Tarik tugas ke sini atau klik +
                          </p>
                        </div>
                      ) : (
                        colTasks.map((task) => {
                          const overdue = isOverdue(task.due_date, task.status);

                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              className="group relative cursor-grab rounded-lg border border-slate-200/90 bg-white p-3.5 shadow-xs transition-all hover:border-blue-400 hover:shadow-sm active:cursor-grabbing dark:border-slate-800 dark:bg-slate-900"
                              onClick={() => openDetailModal(task)}
                            >
                              {/* Competition Label & Actions */}
                              <div className="flex items-center justify-between gap-1 text-[11px]">
                                <span className="max-w-[170px] truncate font-medium text-blue-600 dark:text-blue-400">
                                  {task.competition?.name || 'Kompetisi'}
                                </span>
                                <div
                                  className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(task)}
                                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                    title="Edit Tugas"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Task Title */}
                              <h4 className="entity-name mt-1 text-xs font-semibold leading-snug line-clamp-2">
                                {task.title}
                              </h4>

                              {/* Task Description Preview */}
                              {task.description && (
                                <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 dark:text-slate-400">
                                  {task.description}
                                </p>
                              )}

                              {/* Card Meta Footer */}
                              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800/70">
                                {/* Due Date */}
                                <div
                                  className={`flex items-center gap-1 font-mono tabular-nums ${
                                    overdue
                                      ? 'font-semibold text-rose-600 dark:text-rose-400'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`}
                                  title={
                                    task.due_date
                                      ? `Deadline: ${formatDateTimeWIB(task.due_date)}`
                                      : 'Tanpa deadline'
                                  }
                                >
                                  <Clock className="h-3 w-3 shrink-0" />
                                  <span>
                                    {task.due_date ? formatDateWIB(task.due_date) : '—'}
                                  </span>
                                </div>

                                {/* Right Side: Comments count & Assignee */}
                                <div className="flex items-center gap-2">
                                  {(task.comments_count || 0) > 0 && (
                                    <div className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400">
                                      <MessageSquare className="h-3 w-3" />
                                      <span className="font-mono text-[10px]">
                                        {task.comments_count}
                                      </span>
                                    </div>
                                  )}

                                  {task.assignee ? (
                                    <div
                                      className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 font-mono text-[9px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                      title={`Ditugaskan ke: ${task.assignee.full_name}`}
                                    >
                                      {getInitials(task.assignee.full_name)}
                                    </div>
                                  ) : (
                                    <span
                                      className="text-[10px] text-slate-400"
                                      title="Belum ada penanggung jawab"
                                    >
                                      —
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Quick Move Status Selector */}
                              <div
                                className="mt-2.5 flex items-center justify-between border-t border-dashed border-slate-100 pt-2 dark:border-slate-800/70"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-[10px] text-slate-400">Status:</span>
                                <select
                                  value={task.status}
                                  onChange={(e) =>
                                    handleStatusChange(task.id, e.target.value as TaskStatus)
                                  }
                                  className="h-6 rounded border border-slate-200 bg-slate-50 px-1 text-[10px] font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                                >
                                  <option value="todo">To Do</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="review">Review</option>
                                  <option value="done">Done</option>
                                </select>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 2: LIST VIEW */}
          {viewMode === 'list' && (
            <Card variant="default">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Judul Tugas</th>
                      <th className="px-4 py-3">Kompetisi</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Tenggat Waktu WIB</th>
                      <th className="px-4 py-3">Penanggung Jawab</th>
                      <th className="px-4 py-3 text-center">Diskusi</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          Tidak ada tugas yang sesuai dengan kriteria filter.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((task) => {
                        const overdue = isOverdue(task.due_date, task.status);

                        return (
                          <tr
                            key={task.id}
                            className="cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-850/50"
                            onClick={() => openDetailModal(task)}
                          >
                            <td className="px-4 py-3">
                              <div className="entity-name font-semibold">
                                {task.title}
                              </div>
                              {task.description && (
                                <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                                  {task.description}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {task.competition?.name || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={
                                  task.status === 'done'
                                    ? 'success'
                                    : task.status === 'in_progress'
                                    ? 'primary'
                                    : task.status === 'review'
                                    ? 'warning'
                                    : 'default'
                                }
                                size="sm"
                                dot
                              >
                                {task.status === 'todo'
                                  ? 'Akan Dikerjakan'
                                  : task.status === 'in_progress'
                                  ? 'Sedang Dikerjakan'
                                  : task.status === 'review'
                                  ? 'Dalam Review'
                                  : 'Selesai'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-mono tabular-nums">
                              <span
                                className={
                                  overdue
                                    ? 'font-semibold text-rose-600 dark:text-rose-400'
                                    : 'text-slate-600 dark:text-slate-300'
                                }
                              >
                                {formatDateTimeWIB(task.due_date)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {task.assignee ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 font-mono text-[9px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                    {getInitials(task.assignee.full_name)}
                                  </div>
                                  <span className="text-slate-700 dark:text-slate-300">
                                    {task.assignee.full_name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">Belum ditugaskan</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1 text-slate-500">
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span className="font-mono text-xs">
                                  {task.comments_count || 0}
                                </span>
                              </div>
                            </td>
                            <td
                              className="px-4 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(task)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDetailModal(task)}
                                >
                                  Detail
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* MODAL 1: CREATE / EDIT TASK */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Tambah Tugas Baru' : 'Edit Tugas'}
        description="Isi detail tugas tim. Prioritas tugas ditentukan oleh tenggat waktu (WIB)."
        maxWidth="md"
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Judul Tugas <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Selesaikan proposal bab 2 & diagram arsitektur"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            />
          </div>

          {/* Competition */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Kompetisi Terkait <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={taskForm.competition_id}
              onChange={(e) => setTaskForm({ ...taskForm, competition_id: e.target.value })}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="" disabled>
                Pilih kompetisi
              </option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Deskripsi & Instruksi Pengerjaan
            </label>
            <textarea
              rows={3}
              placeholder="Catatan detail mengenai target tugas, link referensi, atau kriteria kelulusan..."
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Assignee */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Penanggung Jawab (Assignee)
              </label>
              <select
                value={taskForm.assignee_id}
                onChange={(e) => setTaskForm({ ...taskForm, assignee_id: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="">Belum Ditugaskan</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Status Tugas
              </label>
              <select
                value={taskForm.status}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })
                }
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="todo">Akan Dikerjakan (To Do)</option>
                <option value="in_progress">Sedang Dikerjakan (In Progress)</option>
                <option value="review">Dalam Review</option>
                <option value="done">Selesai</option>
              </select>
            </div>
          </div>

          {/* Due Date (WIB) */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tenggat Waktu (WIB)
            </label>
            <Input
              type="datetime-local"
              value={taskForm.due_date}
              onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
              hint="Waktu pengerjaan mengacu pada zona waktu Asia/Jakarta (WIB)."
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              {modalMode === 'create' ? 'Buat Tugas' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: TASK DETAIL & COLLABORATION (Comments & Attachments) */}
      <Modal
        isOpen={Boolean(detailTask)}
        onClose={() => setDetailTask(null)}
        title={detailTask?.title || 'Detail Tugas'}
        description={detailTask?.competition?.name || 'Kompetisi'}
        maxWidth="lg"
      >
        {detailTask && (
          <div className="space-y-5">
            {/* Quick Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  Status:
                </span>
                <select
                  value={detailTask.status}
                  onChange={(e) =>
                    handleStatusChange(detailTask.id, e.target.value as TaskStatus)
                  }
                  className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="todo">Akan Dikerjakan</option>
                  <option value="in_progress">Sedang Dikerjakan</option>
                  <option value="review">Dalam Review</option>
                  <option value="done">Selesai</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Deadline: {formatDateTimeWIB(detailTask.due_date)}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                  activeTab === 'details'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Rincian & PIC</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                  activeTab === 'comments'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Diskusi ({comments.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('attachments')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                  activeTab === 'attachments'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span>Lampiran Berkas ({attachments.length})</span>
              </button>
            </div>

            {/* TAB 1: DETAILS & PIC */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Deskripsi Tugas
                  </h4>
                  <div className="mt-1.5 rounded-lg border border-slate-200/80 bg-slate-50/50 p-3.5 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
                    {detailTask.description || (
                      <span className="italic text-slate-400">
                        Tidak ada deskripsi rinci untuk tugas ini.
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200/80 p-3 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Penanggung Jawab:
                    </span>
                    <div className="mt-1.5 flex items-center gap-2">
                      {detailTask.assignee ? (
                        <>
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 font-mono text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            {getInitials(detailTask.assignee.full_name)}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {detailTask.assignee.full_name}
                            </div>
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Belum ditugaskan ke anggota tim
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200/80 p-3 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Waktu Pembuatan:
                    </span>
                    <div className="mt-1.5 font-mono text-xs text-slate-800 dark:text-slate-200">
                      {formatDateTimeWIB(detailTask.created_at)}
                    </div>
                    {detailTask.completed_at && (
                      <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                        Selesai: {formatDateTimeWIB(detailTask.completed_at)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center justify-between border-t border-slate-200/80 pt-4 dark:border-slate-800">
                  {deleteConfirmId === detailTask.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-rose-600">
                        Hapus tugas ini?
                      </span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteTask(detailTask.id)}
                      >
                        Ya, Hapus
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Batal
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 className="h-3.5 w-3.5 text-rose-500" />}
                      className="text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      onClick={() => setDeleteConfirmId(detailTask.id)}
                    >
                      Hapus Tugas
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                    onClick={() => {
                      openEditModal(detailTask);
                    }}
                  >
                    Edit Detail
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 2: COMMENTS & MENTIONS */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                {/* Comments List */}
                <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                  {loadingComments ? (
                    <div className="space-y-2 py-4">
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Belum ada komentar untuk tugas ini. Diskusikan progres atau mention rekan tim dengan format @username.
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 font-mono text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {getInitials(comment.author?.full_name)}
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {comment.author?.full_name || 'Anggota'}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">
                            {formatDateTimeWIB(comment.created_at)}
                          </span>
                        </div>
                        <p className="mt-2 text-slate-700 whitespace-pre-wrap dark:text-slate-300">
                          {comment.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Input Form */}
                <form onSubmit={handleAddComment} className="space-y-2 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Tulis komentar:</span>
                    <span className="italic text-slate-400">
                      Gunakan format @username untuk notifikasi
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Tulis diskusi progres, mention @fathan, dll..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      disabled={submittingComment}
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={submittingComment}
                      disabled={!newComment.trim()}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: ATTACHMENTS */}
            {activeTab === 'attachments' && (
              <div className="space-y-4">
                {/* Upload Button */}
                <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-200 p-3 dark:border-slate-800">
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Unggah Berkas Tugas
                    </div>
                    <div className="text-[11px] text-slate-500">
                      PDF, dokumen, gambar, atau ZIP disimpan ke Supabase Storage.
                    </div>
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploadingAttachment}
                      className="hidden"
                    />
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{uploadingAttachment ? 'Mengunggah...' : 'Pilih Berkas'}</span>
                    </span>
                  </label>
                </div>

                {/* Attachment List */}
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {loadingAttachments ? (
                    <div className="space-y-2 py-4">
                      <Skeleton className="h-10 w-full rounded-lg" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                  ) : attachments.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Belum ada berkas lampiran yang diunggah untuk tugas ini.
                    </div>
                  ) : (
                    attachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Paperclip className="h-4 w-4 shrink-0 text-blue-500" />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                              {file.file_name}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400">
                              {formatFileSize(file.file_size)} · {formatDateTimeWIB(file.created_at)}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Download className="h-3.5 w-3.5" />}
                          onClick={() => handleDownloadAttachment(file.file_path)}
                        >
                          Unduh
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
