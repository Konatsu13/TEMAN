import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  CheckSquare,
  Clock,
  Coins,
  History,
  Layers,
  Plus,
  Trophy,
  TrendingUp,
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
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchCompetitionParticipation,
  fetchCompetitions,
  type CompetitionParticipation,
  type Competition,
} from '../../services/competitionService';
import {
  fetchTasks,
  type TaskWithDetails,
} from '../../services/taskService';
import {
  formatCurrencyIDR,
  formatDateTimeWIB,
  formatDateWIB,
  getInitials,
} from '../../utils/formatters';
import { calculateCompetitionAnalytics } from '../../utils/competitionAnalytics';
import { getCompetitionLinks } from '../../utils/competitionLinks';

export function OverviewPage() {
  const { profile, role } = useAuth();
  const isOwner = role === 'owner';

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [participation, setParticipation] = useState<CompetitionParticipation[]>([]);
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [participationError, setParticipationError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [compsData, tasksData] = await Promise.all([
          fetchCompetitions(),
          fetchTasks(),
        ]);
        if (isMounted) {
          setCompetitions(compsData);
          setTasks(tasksData);
          try {
            const participationData = await fetchCompetitionParticipation();
            if (!isMounted) return;
            setParticipation(participationData);
            setParticipationError(null);
          } catch (err) {
            if (isMounted) {
              setParticipationError(
                err instanceof Error
                  ? err.message
                  : 'Gagal memuat data keikutsertaan lomba.'
              );
            }
          }
        }
      } catch (err) {
        console.error('Failed to load overview data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Format today's date in WIB
  const todayWIB = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date());
    } catch {
      return 'Zona Waktu WIB';
    }
  }, []);

  // Calculate real metrics from database
  const activeComps = competitions.filter((c) => c.status === 'active');
  const completedComps = competitions.filter((c) => c.status === 'completed');
  const competitionAnalytics = calculateCompetitionAnalytics(competitions);
  const highestCompetitionFee = competitionAnalytics.feeItems[0]?.amount ?? 0;
  const totalParticipation = participation.reduce(
    (sum, item) => sum + item.competition_count,
    0
  );
  const highestParticipation = Math.max(
    1,
    ...participation.map((item) => item.competition_count)
  );

  const unfinishedTasks = tasks.filter((t) => t.status !== 'done');
  const urgentTasks = [...unfinishedTasks].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  const stats = [
    {
      label: 'Total Kompetisi',
      value: competitions.length.toString(),
      description: `${activeComps.length} Aktif · ${completedComps.length} Selesai`,
      icon: Trophy,
      variant: 'primary' as const,
    },
    {
      label: 'Tugas Belum Selesai',
      value: unfinishedTasks.length.toString(),
      description: `${tasks.filter((t) => t.status === 'in_progress').length} Berjalan · ${tasks.filter((t) => t.status === 'review').length} Review`,
      icon: CheckSquare,
      variant: 'default' as const,
    },
    {
      label: 'Biaya Pendaftaran',
      value: formatCurrencyIDR(competitionAnalytics.totalFee),
      description: `${competitionAnalytics.paidCount} Lomba berbayar`,
      icon: Coins,
      variant: 'warning' as const,
    },
    {
      label: 'Deadline Terdekat',
      value: activeComps.length > 0 && activeComps[0].deadline ? 'Aktif' : '—',
      description:
        activeComps.length > 0 && activeComps[0].deadline
          ? formatDateTimeWIB(activeComps[0].deadline)
          : 'Belum ada deadline',
      icon: Clock,
      variant: 'danger' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Greeting Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              Halo, {profile?.full_name ?? 'Pengguna TEMAN'}
            </h2>
            <Badge variant={isOwner ? 'primary' : 'default'} size="sm">
              {isOwner ? 'Owner' : 'Member'}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {todayWIB} · Seluruh waktu ditampilkan akurat dalam WIB (UTC+7).
          </p>
        </div>

        {isOwner && (
          <Link to="/competitions">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Kelola Kompetisi
            </Button>
          </Link>
        )}
      </div>

      {/* 4 Focused Metrics Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} variant="default" className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {stat.label}
                </span>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    stat.variant === 'primary'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                      : stat.variant === 'warning'
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                      : stat.variant === 'danger'
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3 font-mono text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
                {loading ? <Skeleton className="h-8 w-16" /> : stat.value}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {stat.description}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card variant="default">
          <CardHeader>
            <div>
              <CardTitle>Analisis Biaya Lomba</CardTitle>
              <CardDescription>
                Biaya pendaftaran per kompetisi, dari data yang tersimpan.
              </CardDescription>
            </div>
            <Coins className="h-5 w-5 text-amber-500" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Total biaya
                </p>
                <div className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
                  {loading ? <Skeleton className="h-6 w-28" /> : formatCurrencyIDR(competitionAnalytics.totalFee)}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Berbayar · Gratis
                </p>
                <div className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
                  {loading ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    `${competitionAnalytics.paidCount} · ${competitionAnalytics.freeCount}`
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : competitionAnalytics.feeItems.length === 0 ? (
              <EmptyState
                variant="compact"
                icon={<Coins className="h-5 w-5" />}
                title="Belum Ada Biaya Terdaftar"
                description="Biaya dari kompetisi berbayar akan dianalisis di sini."
              />
            ) : (
              <div className="space-y-4" aria-label="Grafik biaya per kompetisi">
                {competitionAnalytics.feeItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-300">
                        {item.name}
                      </span>
                      <span className="shrink-0 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {formatCurrencyIDR(item.amount)}
                      </span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{
                          width: `${highestCompetitionFee > 0 ? (item.amount / highestCompetitionFee) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
                {competitionAnalytics.feeItems.length > 5 && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Menampilkan 5 biaya tertinggi dari {competitionAnalytics.feeItems.length} kompetisi berbayar.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="default">
          <CardHeader>
            <div>
              <CardTitle>Keikutsertaan Lomba</CardTitle>
              <CardDescription>
                Jumlah kompetisi yang diikuti setiap anggota tim.
              </CardDescription>
            </div>
            <TrendingUp className="h-5 w-5 text-blue-500" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Kompetisi terdaftar
                </p>
                <div className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
                  {loading ? <Skeleton className="h-6 w-12" /> : competitions.length}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Total keikutsertaan
                </p>
                <div className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
                  {loading ? <Skeleton className="h-6 w-12" /> : totalParticipation}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : participationError ? (
              <p
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
              >
                Gagal menampilkan grafik keikutsertaan: {participationError}
              </p>
            ) : participation.length === 0 ? (
              <EmptyState
                variant="compact"
                icon={<Users className="h-5 w-5" />}
                title="Belum Ada Anggota Terdaftar"
                description="Keikutsertaan setiap anggota akan muncul setelah mereka ditambahkan ke kompetisi."
              />
            ) : (
              <div className="space-y-4" aria-label="Grafik keikutsertaan kompetisi per anggota">
                {participation.slice(0, 6).map((item) => (
                  <div key={item.user_id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-300">
                        {item.full_name}
                        <span className="ml-1.5 font-normal text-slate-400">
                          @{item.username}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {item.competition_count} lomba
                      </span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                      role="progressbar"
                      aria-label={`${item.full_name}: ${item.competition_count} lomba`}
                      aria-valuemin={0}
                      aria-valuemax={highestParticipation}
                      aria-valuenow={item.competition_count}
                    >
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{
                          width: `${(item.competition_count / highestParticipation) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
                {participation.length > 6 && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Menampilkan 6 anggota dengan keikutsertaan terbanyak dari {participation.length} anggota.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Competitions, Tasks, Calendar, Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols): Competitions & Tasks */}
        <div className="space-y-6 lg:col-span-8">
          {/* Active Competitions */}
          <Card variant="default">
            <CardHeader>
              <div>
                <CardTitle>Kompetisi Berjalan</CardTitle>
                <CardDescription>
                  Daftar kompetisi aktif tim yang terdaftar di database Supabase.
                </CardDescription>
              </div>
              <Link to="/competitions">
                <Button
                  variant="ghost"
                  size="sm"
                  rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}
                >
                  Semua Lomba
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : activeComps.length === 0 ? (
                <EmptyState
                  variant="compact"
                  icon={<Trophy className="h-5 w-5" />}
                  title="Belum Ada Kompetisi Aktif"
                  description={
                    isOwner
                      ? 'Buat kompetisi pertama Anda untuk mulai mengatur tim, tugas, dan deadline.'
                      : 'Belum ada kompetisi aktif yang dibuat oleh Owner workspace.'
                  }
                  action={
                    isOwner ? (
                      <Link to="/competitions">
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Plus className="h-3.5 w-3.5" />}
                        >
                          Tambah Kompetisi
                        </Button>
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <div className="space-y-3.5">
                  {activeComps.map((comp) => {
                    const compTasks = tasks.filter((t) => t.competition_id === comp.id);
                    const compDoneTasks = compTasks.filter((t) => t.status === 'done');
                    const progressVal =
                      compTasks.length > 0
                        ? Math.round((compDoneTasks.length / compTasks.length) * 100)
                        : 0;

                    return (
                      <div
                        key={comp.id}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/40"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="primary" size="sm" dot>
                                Active
                              </Badge>
                              <Badge variant="info" size="sm">
                                {comp.mode}
                              </Badge>
                              {comp.team_name && (
                                <span className="entity-name text-xs">
                                  Tim: {comp.team_name}
                                </span>
                              )}
                            </div>
                            <h4 className="entity-name mt-1.5 font-display text-sm font-semibold">
                              {comp.name}
                            </h4>
                            {comp.organizer && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Penyelenggara: {comp.organizer}
                              </p>
                            )}
                          </div>

                          <div className="text-left sm:text-right">
                            <span className="text-[11px] text-slate-400">
                              Progres Kerja
                            </span>
                            <div className="font-mono text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">
                              {progressVal}%
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all dark:bg-blue-500"
                            style={{ width: `${progressVal}%` }}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 pt-2.5 text-xs dark:border-slate-800">
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            {getCompetitionLinks(comp).map((link) => (
                              <a
                                key={`${link.label}-${link.url}`}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {link.label}
                              </a>
                            ))}
                          </div>
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            {comp.deadline
                              ? `Deadline: ${formatDateTimeWIB(comp.deadline)}`
                              : 'Tanpa deadline'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Priority Tasks */}
          <Card variant="default">
            <CardHeader>
              <div>
                <CardTitle>Tugas Prioritas</CardTitle>
                <CardDescription>
                  Tugas aktif dengan tenggat waktu terdekat.
                </CardDescription>
              </div>
              <Link to="/tasks">
                <Button
                  variant="ghost"
                  size="sm"
                  rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}
                >
                  Semua Tugas
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2.5">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : urgentTasks.length === 0 ? (
                <EmptyState
                  variant="compact"
                  icon={<CheckSquare className="h-5 w-5" />}
                  title="Tidak Ada Tugas Mendesak"
                  description={
                    tasks.length === 0
                      ? 'Belum ada tugas yang dibuat. Buka halaman Tugas untuk menambahkan tugas tim pertama.'
                      : 'Bagus! Semua tugas tim saat ini telah terselesaikan.'
                  }
                  action={
                    <Link to="/tasks">
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                      >
                        Kelola Tugas
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-2.5">
                  {urgentTasks.slice(0, 5).map((task) => {
                    const isOverdue =
                      task.due_date && new Date(task.due_date).getTime() < Date.now();
                    return (
                      <Link
                        key={task.id}
                        to="/tasks"
                        className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 transition-colors hover:border-slate-300 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/40"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                task.status === 'in_progress'
                                  ? 'primary'
                                  : task.status === 'review'
                                  ? 'warning'
                                  : 'default'
                              }
                              size="sm"
                            >
                              {task.status === 'in_progress'
                                ? 'In Progress'
                                : task.status === 'review'
                                ? 'Review'
                                : 'To Do'}
                            </Badge>
                            <span className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                              <span className="entity-name">{task.title}</span>
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {task.competition?.name || 'Kompetisi'}
                            </span>
                            {task.assignee && (
                              <span>· PIC: {task.assignee.full_name}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums sm:text-right">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span
                            className={
                              isOverdue
                                ? 'font-semibold text-rose-600 dark:text-rose-400'
                                : 'text-slate-600 dark:text-slate-300'
                            }
                          >
                            {task.due_date ? formatDateTimeWIB(task.due_date) : 'Tanpa deadline'}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (4 cols): Agenda & Activity */}
        <div className="space-y-6 lg:col-span-4">
          {/* Agenda & Deadlines */}
          <Card variant="default">
            <CardHeader>
              <div>
                <CardTitle>Agenda & Deadline WIB</CardTitle>
                <CardDescription>
                  Batas waktu pengumpulan kompetisi terdaftar.
                </CardDescription>
              </div>
              <Link to="/calendar">
                <Button variant="ghost" size="sm">
                  Kalender
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {activeComps.filter((c) => c.deadline).length === 0 ? (
                <EmptyState
                  variant="compact"
                  icon={<CalendarDays className="h-5 w-5" />}
                  title="Tidak Ada Jadwal Mendekat"
                  description="Batas waktu kompetisi yang memiliki tanggal deadline akan tampil otomatis di sini."
                />
              ) : (
                <div className="space-y-3">
                  {activeComps
                    .filter((c) => c.deadline)
                    .map((comp) => (
                      <div
                        key={comp.id}
                        className="flex items-start gap-3 rounded-lg border border-slate-100 p-2.5 dark:border-slate-800/80"
                      >
                        <Clock
                          className="mt-0.5 h-4 w-4 shrink-0 text-rose-500"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="entity-name truncate text-xs font-semibold">
                            {comp.name}
                          </div>
                          <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Deadline Lomba</span>
                            <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400">
                              {formatDateTimeWIB(comp.deadline!)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Log Feed */}
          <Card variant="default">
            <CardHeader>
              <div>
                <CardTitle>Aktivitas Terkini</CardTitle>
                <CardDescription>Pembaruan progres tim terbaru.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <EmptyState
                variant="compact"
                icon={<History className="h-5 w-5" />}
                title="Belum Ada Catatan Aktivitas"
                description="Aktivitas pembuatan kompetisi, perubahan status task, dan komentar akan dicatat ke tabel activity_logs."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
