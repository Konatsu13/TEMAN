import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Search,
  User,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import {
  createMemberAccount,
  fetchMembersWithRoles,
  toggleMemberActive,
  type MemberListItem,
} from '../../services/memberService';
import { formatDateTimeWIB, getInitials } from '../../utils/formatters';

export function MembersPage() {
  const { role, user } = useAuth();
  const isOwner = role === 'owner';

  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Adding Member
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

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

  const handleToggleStatus = async (targetUser: MemberListItem) => {
    if (!isOwner) return;
    if (targetUser.id === user?.id) {
      alert('Anda tidak dapat menonaktifkan akun Owner Anda sendiri.');
      return;
    }

    try {
      await toggleMemberActive(targetUser.id, !targetUser.is_active);
      await loadMembers();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : 'Gagal mengubah status anggota.'
      );
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

  const filteredMembers = members.filter((m) =>
    m.full_name.toLowerCase().includes(searchQuery.toLowerCase())
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
            Daftar anggota tim workspace, hak akses peran, dan pengelolaan status aktif.
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

      {/* Toolbar: Search */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="w-full sm:w-72">
          <Input
            type="search"
            placeholder="Cari anggota berdasarkan nama atau username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-3.5 w-3.5" />}
            className="h-8 text-xs"
          />
        </div>

        <div className="hidden text-xs text-slate-400 sm:block">
          {isOwner
            ? 'Anda berhak mengaktifkan/menonaktifkan akun anggota'
            : 'Hanya Owner yang dapat mengelola akun'}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
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
                {filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 font-display text-xs font-bold text-white shadow-2xs"
                        >
                          {getInitials(member.full_name)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {member.full_name}
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
                      <td className="px-4 py-3.5 text-right">
                        {member.id !== user?.id && (
                          <Button
                            variant={member.is_active ? 'ghost' : 'outline'}
                            size="sm"
                            onClick={() => void handleToggleStatus(member)}
                            className={
                              member.is_active
                                ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
                            }
                          >
                            {member.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
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
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
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
    </div>
  );
}
