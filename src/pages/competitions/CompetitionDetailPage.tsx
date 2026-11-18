import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  Copy,
  ExternalLink,
  History,
  LayoutGrid,
  List,
  Plus,
  Trash2,
  User,
  UserPlus,
  Users,
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
  fetchUnifiedCalendarItems,
  type UnifiedCalendarItem,
} from '../../services/calendarService';
import {
  addMemberToCompetition,
  copyCompetitionMembers,
  fetchCompetitionActivityLogs,
  fetchCompetitionById,
  fetchCompetitionMembers,
  fetchCompetitions,
  removeMemberFromCompetition,
  type ActivityLogItem,
  type Competition,
  type CompetitionMemberInfo,
} from '../../services/competitionService';
import {
  fetchMembersWithRoles,
  type MemberListItem,
} from '../../services/memberService';
import {
  createTask,
  fetchTasks,
  updateTaskStatus,
  type TaskWithDetails,
} from '../../services/taskService';
import type { TaskStatus } from '../../types/database.types';
import {
  formatCurrencyIDR,
  formatDateWIB,
  formatDateTimeWIB,
  getInitials,
} from '../../utils/formatters';
import { getCompetitionLinks } from '../../utils/competitionLinks';

type WorkspaceTab = 'overview' | 'board' | 'list' | 'calendar' | 'activity';

export function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, profile } = useAuth();
  const isOwner = role === 'owner';

  // Workspace Data
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [allCompetitions, setAllCompetitions] = useState<Competition[]>([]);
  const [members, setMembers] = useState<CompetitionMemberInfo[]>([]);
  const [allSystemMembers, setAllSystemMembers] = useState<MemberListItem[]>([]);
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [calendarItems, setCalendarItems] = useState<UnifiedCalendarItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');

  // Modals State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedNewUserId, setSelectedNewUserId] = useState('');
  const [isCopyMembersOpen, setIsCopyMembersOpen] = useState(false);
  const [selectedSourceCompId, setSelectedSourceCompId] = useState('');
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  // Quick Task Create State
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignee_id: '',
    due_date: '',
    status: 'todo' as TaskStatus,
  });
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const loadWorkspaceData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setErrorMessage(null);

      const [compData, compsList, membersData, systemMembers, tasksData, calData, logsData] =
        await Promise.all([
          fetchCompetitionById(id),
          fetchCompetitions(),
          fetchCompetitionMembers(id),
          fetchMembersWithRoles(),
          fetchTasks({ competitionId: id }),
          fetchUnifiedCalendarItems(id),
          fetchCompetitionActivityLogs(id),
        ]);

      if (!compData) {
        setErrorMessage('Kompetisi tidak ditemukan atau Anda tidak memiliki akses.');
      } else {
        setCompetition(compData);
        setAllCompetitions(compsList.filter((c) => c.id !== id));
        setMembers(membersData);
        setAllSystemMembers(systemMembers);
        setTasks(tasksData);
        setCalendarItems(calData);
        setActivityLogs(logsData);
      }
    } catch (err: any) {
      console.error('Failed to load competition workspace:', err);
      setErrorMessage(err.message || 'Gagal memuat workspace kompetisi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspaceData();
  }, [id]);

  // Dynamic Progress Calculation
  const progressPercent = useMemo(() => {
    if (tasks.length === 0) return 0;
    const doneTasks = tasks.filter((t) => t.status === 'done');
    return Math.round((doneTasks.length / tasks.length) * 100);
  }, [tasks]);

  // Handle Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedNewUserId) return;
    try {
      setIsSubmittingMember(true);
      await addMemberToCompetition(id, selectedNewUserId);
      setIsAddMemberOpen(false);
      setSelectedNewUserId('');
      await loadWorkspaceData();
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan anggota.');
    } finally {
      setIsSubmittingMember(false);
    }
  };

  // Handle Copy Members from another competition
  const handleCopyMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedSourceCompId) return;
    try {
      setIsSubmittingMember(true);
      const copiedCount = await copyCompetitionMembers(selectedSourceCompId, id);
      alert(`Berhasil menyalin ${copiedCount} anggota dari kompetisi sebelumnya.`);
      setIsCopyMembersOpen(false);
      setSelectedSourceCompId('');
      await loadWorkspaceData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyalin anggota.');
    } finally {
      setIsSubmittingMember(false);
    }
  };

  // Handle Remove Member
  const handleRemoveMember = async (userId: string) => {
    if (!id) return;
    if (!confirm('Hapus anggota ini dari kompetisi?')) return;
    try {
      await removeMemberFromCompetition(id, userId);
      await loadWorkspaceData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus anggota.');
    }
  };

  // Handle Create Task for this competition
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !taskForm.title.trim()) return;
    try {
      setIsSubmittingTask(true);
      const isoDueDate = taskForm.due_date
        ? new Date(taskForm.due_date).toISOString()
        : null;

      await createTask({
        competition_id: id,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        assignee_id: taskForm.assignee_id || null,
        due_date: isoDueDate,
        status: taskForm.status,
        created_by: profile?.id || null,
      });

      setIsCreateTaskOpen(false);
      setTaskForm({
        title: '',
        description: '',
        assignee_id: '',
        due_date: '',
        status: 'todo',
      });
      await loadWorkspaceData();
    } catch (err: any) {
      alert(err.message || 'Gagal membuat tugas.');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Quick Status Change on Kanban
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      await updateTaskStatus(taskId, newStatus);
      await loadWorkspaceData();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui status tugas.');
      void loadWorkspaceData();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (errorMessage || !competition) {
    return (
      <Card variant="default">
        <CardContent className="pt-6">
          <EmptyState
            icon={<AlertCircle className="h-6 w-6 text-rose-500" />}
            title="Kompetisi Tidak Ditemukan"
            description={errorMessage || 'Data kompetisi tidak dapat dimuat.'}
            action={
              <Link to="/competitions">
                <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                  Kembali ke Daftar Kompetisi
                </Button>
              </Link>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/competitions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Daftar Kompetisi</span>
        </Link>
      </div>

      {/* Hero Workspace Header */}
      <Card variant="subtle" className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  competition.status === 'active'
                    ? 'primary'
                    : competition.status === 'completed'
                    ? 'success'
                    : 'default'
                }
                size="sm"
                dot
              >
                {competition.status.toUpperCase()}
              </Badge>
              <Badge variant="info" size="sm">
                {competition.mode.toUpperCase()}
              </Badge>
              <Badge
                variant={competition.fee_type === 'free' ? 'success' : 'warning'}
                size="sm"
              >
                {competition.fee_type === 'free'
                  ? 'Gratis'
                  : formatCurrencyIDR(competition.fee_amount)}
              </Badge>
              {competition.team_name && (
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Tim: <span className="entity-name">{competition.team_name}</span>
                </span>
              )}
            </div>

            <h1 className="entity-name mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {competition.name}
            </h1>

            {competition.organizer && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Diselenggarakan oleh: <span className="font-semibold">{competition.organizer}</span>
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
              {getCompetitionLinks(competition).map((link) => (
                <a
                  key={`${link.label}-${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {link.label} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>

          {/* Progress Box */}
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-4 text-xs sm:w-64 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">
                Progres (Otomatis)
              </span>
              <span className="font-mono text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {progressPercent}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-600 transition-all dark:bg-blue-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>{tasks.filter((t) => t.status === 'done').length} dari {tasks.length} tugas selesai</span>
              <span className="font-mono tabular-nums text-slate-400">
                {competition.deadline ? formatDateWIB(competition.deadline) : 'Tanpa deadline'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 5 Workspace Tabs (PRD Section 5.B) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview', label: 'Ringkasan', icon: LayoutGrid },
          { id: 'board', label: 'Board Kanban', icon: CheckSquare },
          { id: 'list', label: 'Daftar Tugas', icon: List },
          { id: 'calendar', label: 'Kalender', icon: Calendar },
          { id: 'activity', label: 'Catatan Aktivitas', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as WorkspaceTab)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.id === 'board' && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-slate-800">
                  {tasks.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Objectives & Info */}
          <div className="space-y-6 lg:col-span-8">
            <Card variant="default">
              <CardHeader>
                <div>
                  <CardTitle>Tujuan & Sasaran Pengerjaan</CardTitle>
                  <CardDescription>
                    Arahan fokus tim untuk memenangkan kompetisi ini.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Tujuan Kompetisi
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {competition.objective || 'Belum ada sasaran kompetisi yang ditetapkan.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tasks Summary */}
            <Card variant="default">
              <CardHeader>
                <div>
                  <CardTitle>Distribusi Status Tugas</CardTitle>
                  <CardDescription>
                    Ringkasan pembagian pengerjaan tugas kompetisi ini.
                  </CardDescription>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => setIsCreateTaskOpen(true)}
                >
                  Tambah Tugas
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'To Do', count: tasks.filter((t) => t.status === 'todo').length, variant: 'default' },
                    { label: 'In Progress', count: tasks.filter((t) => t.status === 'in_progress').length, variant: 'primary' },
                    { label: 'Review', count: tasks.filter((t) => t.status === 'review').length, variant: 'warning' },
                    { label: 'Done', count: tasks.filter((t) => t.status === 'done').length, variant: 'success' },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-center dark:border-slate-800 dark:bg-slate-900/40"
                    >
                      <div className="text-[11px] font-semibold text-slate-500">{s.label}</div>
                      <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {s.count}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Members Sidebar (4 cols) */}
          <div className="space-y-6 lg:col-span-4">
            <Card variant="default">
              <CardHeader>
                <div>
                  <CardTitle>Anggota Tim ({members.length})</CardTitle>
                  <CardDescription>Daftar anggota yang ditugaskan ke lomba ini.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isOwner && (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                      onClick={() => setIsAddMemberOpen(true)}
                    >
                      Tambah Anggota
                    </Button>
                    {allCompetitions.length > 0 && (
                      <Button
                        variant="subtle"
                        size="sm"
                        leftIcon={<Copy className="h-3.5 w-3.5" />}
                        onClick={() => setIsCopyMembersOpen(true)}
                      >
                        Salin dari Lomba Lain
                      </Button>
                    )}
                  </div>
                )}

                {members.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    Belum ada anggota yang ditugaskan ke kompetisi ini.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/50 p-2 text-xs dark:border-slate-800 dark:bg-slate-900/40"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 font-mono text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            {getInitials(m.profile?.full_name)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                              {m.profile?.full_name}
                            </div>
                          </div>
                        </div>

                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.user_id)}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                            title="Hapus dari kompetisi"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: BOARD (KANBAN) */}
      {activeTab === 'board' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Papan tugas khusus untuk <span className="entity-name">{competition.name}</span>
            </span>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setIsCreateTaskOpen(true)}
            >
              Tambah Tugas Lomba
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                { status: 'todo', label: 'To Do', variant: 'default' },
                { status: 'in_progress', label: 'In Progress', variant: 'primary' },
                { status: 'review', label: 'Review', variant: 'warning' },
                { status: 'done', label: 'Done', variant: 'success' },
              ] as const
            ).map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.status);

              return (
                <div
                  key={col.status}
                  className="flex min-h-[420px] flex-col rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/30"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Badge variant={col.variant as any} size="sm" dot>
                      {col.label}
                    </Badge>
                    <span className="font-mono text-xs font-semibold tabular-nums text-slate-400">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-2">
                    {colTasks.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200/80 p-3 text-center text-xs text-slate-400 dark:border-slate-800">
                        Belum ada tugas
                      </div>
                    ) : (
                      colTasks.map((t) => (
                        <div
                          key={t.id}
                          className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                        >
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {t.title}
                          </h4>
                          {t.description && (
                            <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                              {t.description}
                            </p>
                          )}
                          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 dark:border-slate-800">
                            <span>
                              {t.due_date ? formatDateWIB(t.due_date) : '—'}
                            </span>
                            <select
                              value={t.status}
                              onChange={(e) =>
                                handleStatusChange(t.id, e.target.value as TaskStatus)
                              }
                              className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] dark:border-slate-800 dark:bg-slate-800"
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="review">Review</option>
                              <option value="done">Done</option>
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: LIST VIEW */}
      {activeTab === 'list' && (
        <Card variant="default">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3">Judul Tugas</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tenggat Waktu WIB</th>
                  <th className="px-4 py-3">Penanggung Jawab</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      Belum ada tugas yang dibuat untuk kompetisi ini.
                    </td>
                  </tr>
                ) : (
                  tasks.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {t.title}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            t.status === 'done'
                              ? 'success'
                              : t.status === 'in_progress'
                              ? 'primary'
                              : t.status === 'review'
                              ? 'warning'
                              : 'default'
                          }
                          size="sm"
                          dot
                        >
                          {t.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {formatDateTimeWIB(t.due_date)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {t.assignee?.full_name || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: CALENDAR */}
      {activeTab === 'calendar' && (
        <Card variant="default">
          <CardHeader>
            <div>
              <CardTitle>Jadwal & Deadline Terkait</CardTitle>
              <CardDescription>
                Batas pengumpulan lomba, deadline tugas, dan agenda pertemuan.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {calendarItems.length === 0 ? (
              <EmptyState
                variant="compact"
                icon={<Calendar className="h-5 w-5" />}
                title="Belum Ada Jadwal Khusus"
                description="Tenggat waktu tugas dan batas pengumpulan lomba ini akan tampil di sini."
              />
            ) : (
              <div className="space-y-3">
                {calendarItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/40"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        <span className="entity-name">{item.title}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {item.description || 'Tidak ada deskripsi'}
                      </div>
                    </div>
                    <div className="font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                      {formatDateTimeWIB(item.startsAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 5: ACTIVITY */}
      {activeTab === 'activity' && (
        <Card variant="default">
          <CardHeader>
            <div>
              <CardTitle>Catatan Riwayat Aktivitas</CardTitle>
              <CardDescription>
                Aktivitas penting yang tercatat pada kompetisi ini.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {activityLogs.length === 0 ? (
              <EmptyState
                variant="compact"
                icon={<History className="h-5 w-5" />}
                title="Belum Ada Catatan Aktivitas"
                description="Aktivitas pembuatan tugas, perubahan status, dan penambahan agenda akan dicatat otomatis."
              />
            ) : (
              <div className="space-y-3">
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between rounded-lg border border-slate-100 p-3 text-xs dark:border-slate-800"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {log.actor?.full_name || 'Anggota'}
                      </span>{' '}
                      <span className="text-slate-500">
                        melakukan aksi {log.action}
                      </span>
                      {log.details?.title && (
                        <div className="mt-1 font-medium text-slate-700 dark:text-slate-300">
                          "{log.details.title}"
                        </div>
                      )}
                    </div>
                    <span className="font-mono text-[11px] tabular-nums text-slate-400">
                      {formatDateTimeWIB(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL: ADD MEMBER */}
      <Modal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        title="Tambah Anggota ke Kompetisi"
        description="Pilih akun anggota terdaftar untuk ditugaskan pada kompetisi ini."
        maxWidth="md"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pilih Anggota <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={selectedNewUserId}
              onChange={(e) => setSelectedNewUserId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="" disabled>
                Pilih anggota dari sistem
              </option>
              {allSystemMembers
                .filter((sm) => !members.some((m) => m.user_id === sm.id))
                .map((sm) => (
                  <option key={sm.id} value={sm.id}>
                    {sm.full_name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddMemberOpen(false)}
              disabled={isSubmittingMember}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingMember}
              disabled={!selectedNewUserId}
            >
              Tambahkan
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: COPY MEMBERS FROM OTHER COMPETITION (PRD 5.B) */}
      <Modal
        isOpen={isCopyMembersOpen}
        onClose={() => setIsCopyMembersOpen(false)}
        title="Salin Anggota dari Lomba Lain"
        description="Salin seluruh anggota tim dari kompetisi sebelumnya tanpa perlu mendaftarkan akun baru."
        maxWidth="md"
      >
        <form onSubmit={handleCopyMembers} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pilih Kompetisi Asal <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={selectedSourceCompId}
              onChange={(e) => setSelectedSourceCompId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="" disabled>
                Pilih kompetisi sumber
              </option>
              {allCompetitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCopyMembersOpen(false)}
              disabled={isSubmittingMember}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingMember}
              disabled={!selectedSourceCompId}
            >
              Salin Anggota
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: QUICK CREATE TASK */}
      <Modal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        title={`Tambah Tugas untuk ${competition.name}`}
        description="Tugas baru akan otomatis terhubung ke kompetisi ini."
        maxWidth="md"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Judul Tugas <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Buat wireframe user flow registrasi"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Deskripsi
            </label>
            <textarea
              rows={3}
              placeholder="Catatan pengerjaan tugas..."
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Penanggung Jawab
              </label>
              <select
                value={taskForm.assignee_id}
                onChange={(e) => setTaskForm({ ...taskForm, assignee_id: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="">Belum Ditugaskan</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Status Awal
              </label>
              <select
                value={taskForm.status}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })
                }
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tenggat Waktu (WIB)
            </label>
            <Input
              type="datetime-local"
              value={taskForm.due_date}
              onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateTaskOpen(false)}
              disabled={isSubmittingTask}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingTask}
            >
              Simpan Tugas
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
