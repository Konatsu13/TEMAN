import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  AtSign,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import {
  createMemberAccount,
  deleteMemberAccount,
  fetchMembersWithRoles,
  toggleMemberActive,
  updateMemberAccount,
  type MemberListItem,
} from '../../services/memberService';
import { formatDateTimeWIB, getInitials } from '../../utils/formatters';

interface Feedback {
  tone: 'success' | 'error';
  message: string;
}

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

interface MemberRowActionsProps {
  member: MemberListItem;
  isSelf: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  withLabels?: boolean;
}

function MemberRowActions({
  member,
  isSelf,
  onEdit,
  onToggle,
  onDelete,
  withLabels = false,
}: MemberRowActionsProps) {
  const canDelete = !isSelf && member.role !== 'owner';

  if (withLabels) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:outline-none dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        {!isSelf && (
          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
              member.is_active
                ? 'border-rose-200 text-rose-600 hover:bg-rose-50 focus-visible:ring-rose-500/30 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40'
                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 focus-visible:ring-emerald-500/30 dark:border-emerald-900/60 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
            }`}
          >
            {member.is_active ? (
              <UserX className="h-3.5 w-3.5" />
            ) : (
              <UserCheck className="h-3.5 w-3.5" />
            )}
            {member.is_active ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 text-[11px] font-medium text-rose-600 transition-colors hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-500/30 focus-visible:outline-none dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hapus
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit profil ${member.full_name}`}
        title="Edit profil"
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:outline-none dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <Pencil className="h-4 w-4" />
      </button>
      {!isSelf && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={
            member.is_active
              ? `Nonaktifkan ${member.full_name}`
              : `Aktifkan ${member.full_name}`
          }
          title={member.is_active ? 'Nonaktifkan akun' : 'Aktifkan akun'}
          className={`grid h-8 w-8 place-items-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none ${
            member.is_active
              ? 'text-rose-600 hover:bg-rose-50 focus-visible:ring-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-950/40'
              : 'text-emerald-600 hover:bg-emerald-50 focus-visible:ring-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
          }`}
        >
          {member.is_active ? (
            <UserX className="h-4 w-4" />
          ) : (
            <UserCheck className="h-4 w-4" />
          )}
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Hapus ${member.full_name}`}
          title="Hapus anggota"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-rose-500/30 focus-visible:outline-none dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function MembersPage() {
  const { role, user } = useAuth();
  const isOwner = role === 'owner';

  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Modal State for Adding Member
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Edit Member
  const [editingMember, setEditingMember] = useState<MemberListItem | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Member
  const [deletingMember, setDeletingMember] = useState<MemberListItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await fetchMembersWithRoles();
      setMembers(data);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal memuat daftar anggota tim.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMembers();
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 6000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const handleToggleStatus = async (targetUser: MemberListItem) => {
    if (!isOwner) return;
    if (targetUser.id === user?.id) {
      setFeedback({
        tone: 'error',
        message: 'Anda tidak dapat menonaktifkan akun Owner Anda sendiri.',
      });
      return;
    }

    try {
      await toggleMemberActive(targetUser.id, !targetUser.is_active);
      setFeedback({
        tone: 'success',
        message: `Akun ${targetUser.full_name} berhasil ${
          targetUser.is_active ? 'dinonaktifkan' : 'diaktifkan'
        }.`,
      });
      await loadMembers();
    } catch (err) {
      setFeedback({
        tone: 'error',
        message:
          err instanceof Error ? err.message : 'Gagal mengubah status anggota.',
      });
    }
  };

  const openEditModal = (member: MemberListItem) => {
    setEditingMember(member);
    setEditFullName(member.full_name);
    setEditUsername(member.username);
    setEditPassword('');
    setShowEditPassword(false);
    setEditError(null);
  };

  const handleEditMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingMember) return;

    const nextName = editFullName.trim();
    const nextUsername = editUsername.trim().toLowerCase().replace(/^@/, '');

    if (nextName.length < 2) {
      setEditError('Nama lengkap minimal 2 karakter.');
      return;
    }
    if (!USERNAME_PATTERN.test(nextUsername)) {
      setEditError(
        'Username harus 3–32 karakter dan hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau tanda hubung.'
      );
      return;
    }
    if (editPassword && editPassword.length < 6) {
      setEditError('Kata sandi baru minimal 6 karakter.');
      return;
    }

    try {
      setEditSubmitting(true);
      setEditError(null);
      await updateMemberAccount({
        userId: editingMember.id,
        full_name: nextName,
        username: nextUsername,
        password: editPassword || undefined,
      });
      setEditingMember(null);
      setFeedback({
        tone: 'success',
        message: `Profil ${nextName} berhasil diperbarui.`,
      });
      await loadMembers();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Gagal memperbarui anggota.'
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!deletingMember) return;
    const deletedName = deletingMember.full_name;

    try {
      setDeleteSubmitting(true);
      setDeleteError(null);
      await deleteMemberAccount(deletingMember.id);
      setDeletingMember(null);
      setFeedback({
        tone: 'success',
        message: `Akun ${deletedName} berhasil dihapus permanen.`,
      });
      await loadMembers();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Gagal menghapus anggota.'
      );
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleCreateMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !password) {
      setModalError('Nama lengkap dan kata sandi wajib diisi.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);
      setModalSuccess(null);

      // Auto-generate clean internal username from name (e.g. "Raka Pratama" -> "rakapratama")
      const cleanUsername = fullName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      await createMemberAccount({
        username: cleanUsername,
        full_name: fullName.trim(),
        password,
      });

      setModalSuccess(`Akun ${fullName} berhasil dibuat.`);
      setFullName('');
      setPassword('');
      setShowPassword(false);
      await loadMembers();
      setTimeout(() => {
        setIsModalOpen(false);
        setModalSuccess(null);
      }, 1500);
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Gagal membuat akun anggota.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredMembers = members.filter(
    (member) =>
      member.full_name.toLowerCase().includes(normalizedQuery) ||
      member.username.toLowerCase().includes(normalizedQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              Anggota Tim & Hak Akses
            </h2>
            <Badge variant="primary" size="sm">
              {members.length} Akun
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Kelola profil, status aktif, dan akun login anggota tim workspace.
          </p>
        </div>

        {isOwner && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setShowPassword(false);
              setModalError(null);
              setModalSuccess(null);
              setIsModalOpen(true);
            }}
          >
            Tambah Anggota Baru
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
            onClick={() => void loadMembers()}
            className="ml-auto text-xs"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Action feedback */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-xs ${
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200'
          }`}
        >
          {feedback.tone === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Tutup pesan"
            className="ml-auto grid h-6 w-6 place-items-center rounded-md opacity-60 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Toolbar: Search */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/60">
        <div className="w-full sm:w-72">
          <Input
            type="search"
            placeholder="Cari nama atau username…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-3.5 w-3.5" />}
            className="h-8 text-xs"
          />
        </div>

        <div className="text-[11px] text-slate-400 sm:text-right dark:text-slate-500">
          {isOwner
            ? 'Edit profil, atur status, atau hapus akun Member.'
            : 'Hanya Owner yang dapat mengelola akun.'}
        </div>
      </div>

      {/* Member list */}
      {loading ? (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mobile member cards */}
          <div className="space-y-2 sm:hidden">
            {filteredMembers.map((member) => {
              const isSelf = member.id === user?.id;
              return (
                <article
                  key={member.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        aria-hidden="true"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 font-display text-xs font-bold text-white shadow-2xs"
                      >
                        {getInitials(member.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {member.full_name}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[10.5px] text-slate-400 dark:text-slate-500">
                          @{member.username}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={member.role === 'owner' ? 'primary' : 'default'}
                      size="sm"
                    >
                      {member.role === 'owner' ? 'Owner' : 'Member'}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-3 text-[11px] dark:border-slate-800">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 rounded-full ${
                          member.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      <span
                        className={
                          member.is_active
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-400 dark:text-slate-500'
                        }
                      >
                        {member.is_active ? 'Aktif' : 'Dinonaktifkan'}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {formatDateTimeWIB(member.created_at)}
                    </span>
                  </div>

                  {isOwner && (
                    <div className="mt-3">
                      <MemberRowActions
                        member={member}
                        isSelf={isSelf}
                        withLabels
                        onEdit={() => openEditModal(member)}
                        onToggle={() => void handleToggleStatus(member)}
                        onDelete={() => {
                          setDeletingMember(member);
                          setDeleteError(null);
                        }}
                      />
                    </div>
                  )}
                </article>
              );
            })}

            {filteredMembers.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Tidak ada anggota yang cocok dengan pencarian “{searchQuery}”.
              </div>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs sm:block dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Anggota</th>
                    <th className="px-4 py-3">Peran Akses</th>
                    <th className="px-4 py-3">Status Akun</th>
                    <th className="px-4 py-3">Terdaftar Sejak (WIB)</th>
                    {isOwner && <th className="px-4 py-3 text-right">Opsi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMembers.map((member) => {
                    const isSelf = member.id === user?.id;

                    return (
                      <tr
                        key={member.id}
                        className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/60"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              aria-hidden="true"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 font-display text-xs font-bold text-white shadow-2xs"
                            >
                              {getInitials(member.full_name)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                                {member.full_name}
                              </div>
                              <div className="mt-0.5 truncate font-mono text-[10.5px] text-slate-400 dark:text-slate-500">
                                @{member.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge
                            variant={member.role === 'owner' ? 'primary' : 'default'}
                            size="sm"
                          >
                            {member.role === 'owner' ? 'Owner' : 'Member'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                member.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            <span
                              className={
                                member.is_active
                                  ? 'text-slate-700 dark:text-slate-300'
                                  : 'text-slate-400 dark:text-slate-500'
                              }
                            >
                              {member.is_active ? 'Aktif' : 'Dinonaktifkan'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                          {formatDateTimeWIB(member.created_at)}
                        </td>
                        {isOwner && (
                          <td className="px-4 py-3.5">
                            <MemberRowActions
                              member={member}
                              isSelf={isSelf}
                              onEdit={() => openEditModal(member)}
                              onToggle={() => void handleToggleStatus(member)}
                              onDelete={() => {
                                setDeletingMember(member);
                                setDeleteError(null);
                              }}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredMembers.length === 0 && (
              <div className="border-t border-slate-100 px-4 py-10 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Tidak ada anggota yang cocok dengan pencarian “{searchQuery}”.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Tambah Anggota Baru */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Akun Anggota Baru"
        description="Buat akun Member untuk tim Anda tanpa mengakhiri sesi Owner aktif Anda."
        maxWidth="md"
      >
        <form onSubmit={handleCreateMember} className="space-y-4">
          {modalError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{modalError}</span>
            </div>
          )}

          {modalSuccess && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{modalSuccess}</span>
            </div>
          )}

          <Input
            label="Nama Lengkap *"
            placeholder="contoh: Raka Pratama"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            leftIcon={<User className="h-4 w-4" />}
            required
          />

          <Input
            label="Kata Sandi Awal *"
            type={showPassword ? 'text' : 'password'}
            placeholder="Minimal 6 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="h-4 w-4" />}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={
                  showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
                }
                title={
                  showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
                }
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            }
            required
          />

          <div className="flex items-center justify-end gap-2.5 pt-3">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={submitting}
            >
              Buat Akun Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Anggota */}
      <Modal
        isOpen={Boolean(editingMember)}
        onClose={() => {
          if (!editSubmitting) setEditingMember(null);
        }}
        title="Edit Profil Anggota"
        description={
          editingMember
            ? `Perbarui identitas dan kredensial login ${editingMember.full_name}.`
            : undefined
        }
        maxWidth="md"
      >
        <form onSubmit={handleEditMember} className="space-y-4">
          {editError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{editError}</span>
            </div>
          )}

          <Input
            label="Nama Lengkap *"
            placeholder="contoh: Raka Pratama"
            value={editFullName}
            onChange={(e) => setEditFullName(e.target.value)}
            leftIcon={<User className="h-4 w-4" />}
            required
          />

          <Input
            label="Username *"
            placeholder="contoh: rakapratama"
            value={editUsername}
            onChange={(e) => setEditUsername(e.target.value)}
            leftIcon={<AtSign className="h-4 w-4" />}
            hint="Username dipakai untuk login. Perubahan berlaku pada login berikutnya."
            required
          />

          <Input
            label="Kata Sandi Baru (opsional)"
            type={showEditPassword ? 'text' : 'password'}
            placeholder="Biarkan kosong"
            value={editPassword}
            onChange={(e) => setEditPassword(e.target.value)}
            leftIcon={<Lock className="h-4 w-4" />}
            hint="Minimal 6 karakter. Kosongkan jika anggota tetap memakai kata sandi lama."
            rightElement={
              <button
                type="button"
                onClick={() => setShowEditPassword((current) => !current)}
                aria-label={
                  showEditPassword
                    ? 'Sembunyikan kata sandi'
                    : 'Tampilkan kata sandi'
                }
                title={
                  showEditPassword
                    ? 'Sembunyikan kata sandi'
                    : 'Tampilkan kata sandi'
                }
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                {showEditPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            }
          />

          <div className="flex items-center justify-end gap-2.5 pt-3">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setEditingMember(null)}
              disabled={editSubmitting}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={editSubmitting}
            >
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Hapus Anggota */}
      <Modal
        isOpen={Boolean(deletingMember)}
        onClose={() => {
          if (!deleteSubmitting) setDeletingMember(null);
        }}
        title="Hapus Anggota"
        description="Tindakan ini permanen dan tidak dapat dibatalkan."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <p>
              Akun login, profil, dan peran anggota akan dihapus permanen. Tugas
              yang pernah ditugaskan kepadanya tidak dapat dikembalikan melalui
              akun ini.
            </p>
          </div>

          {deletingMember && (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-700 font-display text-xs font-bold text-white dark:bg-slate-600">
                {getInitials(deletingMember.full_name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {deletingMember.full_name}
                </p>
                <p className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  @{deletingMember.username} ·{' '}
                  {deletingMember.role === 'owner' ? 'Owner' : 'Member'}
                </p>
              </div>
            </div>
          )}

          {deleteError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{deleteError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setDeletingMember(null)}
              disabled={deleteSubmitting}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              size="md"
              type="button"
              onClick={() => void handleDeleteMember()}
              isLoading={deleteSubmitting}
            >
              Hapus Permanen
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
