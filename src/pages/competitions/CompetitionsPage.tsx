import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronDown,
  ExternalLink,
  Grid,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { requireSupabaseClient } from '../../lib/supabase';
import {
  createCompetition,
  deleteCompetition,
  fetchCompetitionMembers,
  fetchCompetitions,
  updateCompetition,
  type Competition,
} from '../../services/competitionService';
import {
  fetchMembersWithRoles,
  type MemberListItem,
} from '../../services/memberService';
import {
  fetchTasks,
  type TaskWithDetails,
} from '../../services/taskService';
import {
  formatCurrencyIDR,
  formatDateTimeLocalWIB,
  formatDateTimeWIB,
  formatDateWIB,
  parseDateTimeLocalWIB,
} from '../../utils/formatters';
import {
  buildCompetitionLinkPayload,
  getCompetitionLinks,
  type SupportingLink,
} from '../../utils/competitionLinks';

type CompFilterStatus =
  | 'all'
  | 'active'
  | 'planning'
  | 'submitted'
  | 'completed'
  | 'cancelled';

interface FormData {
  name: string;
  organizer: string;
  mode: 'online' | 'offline';
  team_name: string;
  objective: string;
  deadline: string;
  fee_type: 'free' | 'paid';
  fee_amount: number;
  supportingLinks: SupportingLink[];
  status: 'planning' | 'active' | 'submitted' | 'completed' | 'cancelled';
}

const DEFAULT_FORM_DATA: FormData = {
  name: '',
  organizer: '',
  mode: 'online',
  team_name: '',
  objective: '',
  deadline: '',
  fee_type: 'free',
  fee_amount: 0,
  supportingLinks: [{ label: '', url: '' }],
  status: 'active',
};

export function CompetitionsPage() {
  const { role, user } = useAuth();
  const isOwner = role === 'owner';

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [allMembers, setAllMembers] = useState<MemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CompFilterStatus>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<Competition | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [compsData, tasksData, membersData] = await Promise.all([
        fetchCompetitions(),
        fetchTasks(),
        fetchMembersWithRoles(),
      ]);
      setCompetitions(compsData);
      setTasks(tasksData);
      setAllMembers(membersData);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal memuat kompetisi dari database.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(DEFAULT_FORM_DATA);
    setFormStep(1);
    setSelectedMemberIds([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (comp: Competition) => {
    const supportingLinks = getCompetitionLinks(comp);
    setEditingId(comp.id);
    setFormData({
      name: comp.name,
      organizer: comp.organizer || '',
      mode: comp.mode,
      team_name: comp.team_name || '',
      objective: comp.objective || '',
      deadline: formatDateTimeLocalWIB(comp.deadline),
      fee_type: comp.fee_type,
      fee_amount: comp.fee_amount || 0,
      supportingLinks: supportingLinks.length ? supportingLinks : [{ label: '', url: '' }],
      status: comp.status,
    });
    setFormStep(1);
    setSelectedMemberIds([]);
    setFormError(null);

    try {
      const compMembers = await fetchCompetitionMembers(comp.id);
      setSelectedMemberIds(compMembers.map((m) => m.user_id));
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat anggota kompetisi yang sudah dipilih.'
      );
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formStep === 1) {
      if (
        !formData.name.trim() ||
        !formData.organizer.trim() ||
        !formData.objective.trim() ||
        !formData.deadline
      ) {
        setFormError('Nama, penyelenggara, tujuan, dan deadline wajib diisi.');
        return;
      }
      if (!parseDateTimeLocalWIB(formData.deadline)) {
        setFormError('Tanggal deadline tidak valid. Periksa kembali tanggal dan waktu WIB.');
        return;
      }

      setFormStep(2);
      return;
    }

    if (!formData.team_name.trim()) {
      setFormError('Nama tim wajib diisi.');
      return;
    }
    if (selectedMemberIds.length === 0) {
      setFormError('Pilih minimal satu anggota kompetisi.');
      return;
    }
    if (formData.fee_type === 'paid' && Number(formData.fee_amount) <= 0) {
      setFormError('Masukkan nominal biaya pendaftaran yang lebih besar dari 0.');
      return;
    }

    const enteredLinks = formData.supportingLinks.filter(
      (link) => link.label.trim() || link.url.trim()
    );
    if (enteredLinks.some((link) => !link.label.trim() || !link.url.trim())) {
      setFormError('Lengkapi nama dan URL setiap link, atau kosongkan keduanya.');
      return;
    }
    if (
      enteredLinks.some((link) => {
        try {
          const parsed = new URL(link.url);
          return parsed.protocol !== 'http:' && parsed.protocol !== 'https:';
        } catch {
          return true;
        }
      })
    ) {
      setFormError('Link pendukung harus berupa URL yang diawali http:// atau https://.');
      return;
    }

    try {
      setSaving(true);
      const linksPayload = buildCompetitionLinkPayload(enteredLinks);

      const payload = {
        name: formData.name.trim(),
        organizer: formData.organizer.trim() || null,
        mode: formData.mode,
        team_name: formData.team_name.trim() || null,
        objective: formData.objective.trim() || null,
        deadline: formData.deadline ? parseDateTimeLocalWIB(formData.deadline) : null,
        fee_type: formData.fee_type,
        fee_amount: formData.fee_type === 'paid' ? Number(formData.fee_amount) || 0 : 0,
        ...linksPayload,
        status: formData.status,
        progress_mode: 'auto' as const,
        manual_progress: null,
        created_by: user?.id || null,
      };

      const client = requireSupabaseClient();

      if (editingId) {
        await updateCompetition(editingId, payload);
        const { error: deleteMembersError } = await client
          .from('competition_members')
          .delete()
          .eq('competition_id', editingId);
        if (deleteMembersError) {
          throw new Error(`Gagal memperbarui anggota kompetisi: ${deleteMembersError.message}`);
        }
        if (selectedMemberIds.length > 0) {
          const { error: insertMembersError } = await client.from('competition_members').insert(
            selectedMemberIds.map((uid) => ({
              competition_id: editingId,
              user_id: uid,
            }))
          );
          if (insertMembersError) {
            throw new Error(`Gagal menyimpan anggota kompetisi: ${insertMembersError.message}`);
          }
        }
      } else {
        const created = await createCompetition(payload);
        setEditingId(created.id);
        if (selectedMemberIds.length > 0) {
          const { error: insertMembersError } = await client.from('competition_members').insert(
            selectedMemberIds.map((uid) => ({
              competition_id: created.id,
              user_id: uid,
            }))
          );
          if (insertMembersError) {
            throw new Error(`Kompetisi tersimpan, tetapi anggota gagal ditambahkan: ${insertMembersError.message}`);
          }
        }
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan data kompetisi.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteCompetition(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus kompetisi.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredCompetitions = competitions.filter((comp) => {
    const matchesStatus =
      statusFilter === 'all' || comp.status === statusFilter;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      comp.name.toLowerCase().includes(query) ||
      (comp.organizer && comp.organizer.toLowerCase().includes(query)) ||
      (comp.team_name && comp.team_name.toLowerCase().includes(query));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              Daftar Kompetisi
            </h2>
            <Badge variant="primary" size="sm">
              {competitions.length} Terdaftar
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Kelola kompetisi tim, berkas sumber daya, progres pengerjaan, dan tenggat waktu WIB.
          </p>
        </div>

        {isOwner && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenAdd}
          >
            Tambah Kompetisi
          </Button>
        )}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{errorMessage}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            className="ml-auto text-xs"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Toolbar: Filter Status, Search, Toggle View */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              { id: 'all', label: 'Semua' },
              { id: 'active', label: 'Aktif' },
              { id: 'planning', label: 'Perencanaan' },
              { id: 'submitted', label: 'Terkumpul' },
              { id: 'completed', label: 'Selesai' },
              { id: 'cancelled', label: 'Dibatalkan' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="w-48 sm:w-60">
            <Input
              type="search"
              placeholder="Cari kompetisi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-3.5 w-3.5" />}
              className="h-8 text-xs"
            />
          </div>

          <div className="flex items-center rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Tampilan grid"
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Tampilan tabel"
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Card key={item} variant="default" className="p-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-3 h-5 w-48" />
              <Skeleton className="mt-2 h-3 w-36" />
              <Skeleton className="mt-6 h-2 w-full" />
              <div className="mt-4 flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredCompetitions.length === 0 ? (
        <Card variant="default">
          <div className="p-6">
            <EmptyState
              icon={<Trophy className="h-6 w-6" />}
              title={
                competitions.length === 0
                  ? 'Belum Ada Kompetisi'
                  : 'Kompetisi Tidak Ditemukan'
              }
              description={
                competitions.length === 0
                  ? isOwner
                    ? 'Mulai dengan menambahkan kompetisi pertama tim Anda ke dalam workspace.'
                    : 'Belum ada kompetisi aktif yang dibuat oleh Owner workspace.'
                  : `Tidak ada kompetisi yang cocok dengan kata kunci atau filter terpilih.`
              }
              action={
                isOwner && competitions.length === 0 ? (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={handleOpenAdd}
                  >
                    Tambah Kompetisi Pertama
                  </Button>
                ) : undefined
              }
            />
          </div>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompetitions.map((comp) => {
            const compTasks = tasks.filter((t) => t.competition_id === comp.id);
            const compDoneTasks = compTasks.filter((t) => t.status === 'done');
            const progressVal =
              compTasks.length > 0
                ? Math.round((compDoneTasks.length / compTasks.length) * 100)
                : 0;

            return (
              <Card
                key={comp.id}
                variant="interactive"
                className="flex flex-col justify-between p-5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          comp.status === 'active'
                            ? 'primary'
                            : comp.status === 'planning'
                            ? 'default'
                            : comp.status === 'completed'
                            ? 'success'
                            : 'warning'
                        }
                        size="sm"
                        dot
                      >
                        {comp.status}
                      </Badge>
                      <Badge variant="info" size="sm">
                        {comp.mode}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <Badge
                        variant={comp.fee_type === 'free' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {comp.fee_type === 'free'
                          ? 'Gratis'
                          : formatCurrencyIDR(comp.fee_amount)}
                      </Badge>
                      {isOwner && (
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(comp)}
                            title="Edit Kompetisi"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(comp)}
                            title="Hapus Kompetisi"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <Link to={`/competitions/${comp.id}`}>
                    <h3 className="entity-name mt-3 font-display text-sm font-semibold line-clamp-2">
                      {comp.name}
                    </h3>
                  </Link>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {comp.organizer || 'Tanpa Penyelenggara'}{' '}
                    {comp.team_name && (
                      <span>
                        · <span className="entity-name font-medium">{comp.team_name}</span>
                      </span>
                    )}
                  </p>

                  {comp.objective && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-2 dark:text-slate-400">
                      {comp.objective}
                    </p>
                  )}

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        Progres (Otomatis)
                      </span>
                      <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {progressVal}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all dark:bg-blue-500"
                        style={{ width: `${progressVal}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {comp.deadline ? formatDateTimeWIB(comp.deadline) : 'Tanpa Deadline'}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {getCompetitionLinks(comp).map((link) => (
                        <a
                          key={`${link.label}-${link.url}`}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-0.5 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {link.label} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="pt-1">
                    <Link to={`/competitions/${comp.id}`} className="block">
                      <Button
                        variant="subtle"
                        size="sm"
                        className="w-full justify-center"
                        leftIcon={<LayoutGrid className="h-3.5 w-3.5" />}
                      >
                        Buka Workspace Lomba
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Nama Kompetisi</th>
                  <th className="px-4 py-3">Penyelenggara / Tim</th>
                  <th className="px-4 py-3">Status / Mode</th>
                  <th className="px-4 py-3">Biaya</th>
                  <th className="px-4 py-3">Deadline WIB</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCompetitions.map((comp) => (
                  <tr
                    key={comp.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60"
                  >
                    <td className="px-4 py-3.5 font-medium">
                      <Link
                        to={`/competitions/${comp.id}`}
                        className="entity-name rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50"
                      >
                        {comp.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                      <div>{comp.organizer || '—'}</div>
                      {comp.team_name && (
                        <div className="text-[11px] text-slate-400">
                          Tim: <span className="entity-name">{comp.team_name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="primary" size="sm">
                          {comp.status}
                        </Badge>
                        <Badge variant="info" size="sm">
                          {comp.mode}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant={comp.fee_type === 'free' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {comp.fee_type === 'free'
                          ? 'Gratis'
                          : formatCurrencyIDR(comp.fee_amount)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                      {comp.deadline ? formatDateTimeWIB(comp.deadline) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/competitions/${comp.id}`}>
                          <Button variant="ghost" size="sm">
                            Workspace
                          </Button>
                        </Link>
                        {isOwner && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(comp)}
                              title="Edit Kompetisi"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(comp)}
                              title="Hapus Kompetisi"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form Tambah / Edit Kompetisi */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Data Kompetisi' : 'Tambah Kompetisi Baru'}
        description={`Tahap ${formStep} dari 2 · ${
          formStep === 1 ? 'Informasi kompetisi' : 'Tim, pendaftaran, dan status'
        }`}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div
            aria-label={`Tahap ${formStep} dari 2`}
            className="grid grid-cols-2 gap-2"
          >
            {[1, 2].map((step) => (
              <div
                key={step}
                className={`rounded-lg px-3 py-2 text-center text-xs font-semibold ${
                  formStep === step
                    ? 'bg-blue-600 text-white'
                    : formStep > step
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {step === 1 ? '1. Informasi lomba' : '2. Tim dan pendaftaran'}
              </div>
            ))}
          </div>

          {formError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {formStep === 1 ? (
            <section aria-labelledby="competition-main-info" className="space-y-4">
              <div>
                <h4 id="competition-main-info" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Informasi kompetisi
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Semua informasi tahap ini wajib diisi.
                </p>
              </div>
              <div className="space-y-4">
                <Input
                  label="Nama kompetisi"
                  placeholder="Contoh: GEMASTIK XVIII — UI/UX Design"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  label="Penyelenggara"
                  placeholder="Contoh: Puspresnas"
                  value={formData.organizer}
                  onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                  required
                />
                <div>
                  <label
                    htmlFor="competition-objective"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Tujuan kompetisi
                  </label>
                  <textarea
                    id="competition-objective"
                    rows={3}
                    placeholder="Jelaskan tujuan atau target hasil tim."
                    value={formData.objective}
                    onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <Input
                  label="Deadline"
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  hint="Waktu ditafsirkan sebagai WIB (UTC+7)."
                  required
                />
                <fieldset>
                  <legend className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pelaksanaan
                  </legend>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {(['online', 'offline'] as const).map((mode) => (
                      <label
                        key={mode}
                        className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${
                          formData.mode === mode
                            ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="competition-mode"
                          value={mode}
                          checked={formData.mode === mode}
                          onChange={() => setFormData({ ...formData, mode })}
                          required
                          className="h-4 w-4 accent-blue-600"
                        />
                        {mode === 'online' ? 'Online' : 'Offline'}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            </section>
          ) : (
            <div className="space-y-6">
              <Input
                label="Nama tim"
                placeholder="Contoh: Tim Garuda"
                value={formData.team_name}
                onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                required
              />

              <fieldset>
                <legend className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Anggota kompetisi
                </legend>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Pilih minimal satu anggota. {selectedMemberIds.length} dipilih.
                </p>
                <details className="group relative mt-2">
                  <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <span className="truncate">
                      {selectedMemberIds.length
                        ? allMembers
                            .filter((member) => selectedMemberIds.includes(member.id))
                            .map((member) => member.full_name)
                            .join(', ') || `${selectedMemberIds.length} anggota dipilih`
                        : 'Pilih anggota'}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    {allMembers.length === 0 ? (
                      <p className="p-2 text-sm text-slate-500 dark:text-slate-400">
                        Belum ada anggota tim terdaftar di workspace.
                      </p>
                    ) : (
                      allMembers.map((member) => (
                        <label
                          key={member.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMemberIds.includes(member.id)}
                            onChange={(event) =>
                              setSelectedMemberIds((current) =>
                                event.target.checked
                                  ? [...current, member.id]
                                  : current.filter((id) => id !== member.id)
                              )
                            }
                            className="h-4 w-4 rounded accent-blue-600"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-slate-800 dark:text-slate-200">
                              {member.full_name}
                            </span>
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                              @{member.username}
                            </span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </details>
              </fieldset>

              <fieldset>
                <legend className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pendaftaran
                </legend>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(['free', 'paid'] as const).map((feeType) => (
                    <label
                      key={feeType}
                      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${
                        formData.fee_type === feeType
                          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                          : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="competition-fee"
                        value={feeType}
                        checked={formData.fee_type === feeType}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            fee_type: feeType,
                            fee_amount: feeType === 'free' ? 0 : formData.fee_amount,
                          })
                        }
                        required
                        className="h-4 w-4 accent-blue-600"
                      />
                      {feeType === 'free' ? 'Gratis' : 'Berbayar'}
                    </label>
                  ))}
                </div>
                {formData.fee_type === 'paid' && (
                  <Input
                    label="Nominal biaya (IDR)"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="150000"
                    value={formData.fee_amount || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fee_amount: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    required
                    className="mt-3"
                  />
                )}
              </fieldset>

              <fieldset>
                <legend className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Link pendukung <span className="font-normal text-slate-500">(opsional)</span>
                </legend>
                <div className="mt-2 space-y-3">
                  {formData.supportingLinks.map((link, index) => (
                    <div key={index} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
                      <Input
                        label={`Nama link ${index + 1}`}
                        placeholder="Contoh: Guidebook"
                        value={link.label}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            supportingLinks: formData.supportingLinks.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, label: e.target.value } : item
                            ),
                          })
                        }
                      />
                      <Input
                        label={`URL link ${index + 1}`}
                        type="url"
                        placeholder="https://..."
                        value={link.url}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            supportingLinks: formData.supportingLinks.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, url: e.target.value } : item
                            ),
                          })
                        }
                      />
                      {formData.supportingLinks.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              supportingLinks: formData.supportingLinks.filter(
                                (_, itemIndex) => itemIndex !== index
                              ),
                            })
                          }
                          aria-label={`Hapus link ${index + 1}`}
                          className="mt-6 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        supportingLinks: [...formData.supportingLinks, { label: '', url: '' }],
                      })
                    }
                  >
                    Tambah link
                  </Button>
                </div>
              </fieldset>

              <div>
                <label
                  htmlFor="competition-status"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Status kompetisi
                </label>
                <select
                  id="competition-status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as FormData['status'],
                    })
                  }
                  required
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="planning">Perencanaan</option>
                  <option value="active">Aktif</option>
                  <option value="submitted">Terkumpul</option>
                  <option value="completed">Selesai</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => {
                if (formStep === 2) {
                  setFormStep(1);
                  setFormError(null);
                } else {
                  setIsModalOpen(false);
                }
              }}
            >
              {formStep === 2 ? 'Kembali' : 'Batal'}
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={saving}
            >
              {formStep === 1
                ? 'Lanjut'
                : editingId
                  ? 'Simpan Perubahan'
                  : 'Buat Kompetisi'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Kompetisi?"
        description="Tindakan ini tidak dapat dibatalkan. Seluruh data kompetisi, anggota terkait, dan catatan riwayat akan dihapus secara permanen."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            Kompetisi yang akan dihapus: <strong>{deleteTarget?.name}</strong>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setDeleteTarget(null)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              size="md"
              isLoading={deleting}
              onClick={handleDelete}
            >
              Hapus Permanen
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
