import { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Lock, LogOut, Moon, Shield, Sun, UserCheck } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { requireSupabaseClient } from '../../lib/supabase';
import { formatDateTimeWIB, getInitials } from '../../utils/formatters';

export function SettingsPage() {
  const { profile, role, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const isOwner = role === 'owner';
  const isDark = theme === 'dark';

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    try {
      setChangingPassword(true);
      const client = requireSupabaseClient();
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) {
        throw new Error(error.message);
      }
      setPasswordSuccess('Kata sandi Anda berhasil diperbarui!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Gagal memperbarui kata sandi.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
          Pengaturan Akun & Workspace
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Kelola profil identitas Anda, tampilan tema visual, dan sesi akses ke TEMAN.
        </p>
      </div>

      {/* Profil Pengguna */}
      <Card variant="default">
        <CardHeader>
          <div>
            <CardTitle>Profil Pengguna</CardTitle>
            <CardDescription>
              Informasi akun yang terhubung dengan database Supabase.
            </CardDescription>
          </div>
          <Badge variant={isOwner ? 'primary' : 'default'} size="md">
            Peran: {isOwner ? 'Owner' : 'Member'}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div
              aria-hidden="true"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 font-display text-xl font-bold text-white shadow-xs"
            >
              {getInitials(profile?.full_name)}
            </div>

            <dl className="grid flex-1 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Nama Lengkap
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {profile?.full_name ?? '—'}
                </dd>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Status Akun
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  <UserCheck className="h-4 w-4" />
                  <span>Aktif & Terverifikasi</span>
                </dd>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Peran Akses
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                  <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>{isOwner ? 'Workspace Owner (Penuh)' : 'Team Member'}</span>
                </dd>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Terdaftar Sejak
                </dt>
                <dd className="mt-1 font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                  {formatDateTimeWIB(profile?.created_at)}
                </dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      {/* Keamanan & Ubah Kata Sandi */}
      <Card variant="default">
        <CardHeader>
          <div>
            <CardTitle>Keamanan Akun & Kata Sandi</CardTitle>
            <CardDescription>
              Perbarui kata sandi akun Anda untuk menjaga kerahasiaan akses ke workspace.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
            {passwordError && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <Input
              label="Kata Sandi Baru *"
              type="password"
              placeholder="Minimal 6 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              required
            />

            <Input
              label="Konfirmasi Kata Sandi Baru *"
              type="password"
              placeholder="Ulangi kata sandi baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<KeyRound className="h-4 w-4" />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={changingPassword}
              disabled={!newPassword || !confirmPassword}
            >
              Simpan Kata Sandi Baru
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tema Tampilan Interaktif */}
      <Card variant="default">
        <CardHeader>
          <div>
            <CardTitle>Tema Antarmuka</CardTitle>
            <CardDescription>
              Pilih mode kontras tampilan yang paling nyaman untuk Anda.
            </CardDescription>
          </div>
          <ThemeToggle showLabel />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {/* Mode Terang Card */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                !isDark
                  ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-600/20 shadow-xs'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <Sun className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Mode Terang (Light)
                  </div>
                  {!isDark && (
                    <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Latar putih bersih dengan kontras slate tajam untuk penggunaan siang hari yang segar.
                </div>
              </div>
            </button>

            {/* Mode Gelap Card */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isDark
                  ? 'border-blue-500 bg-blue-950/30 ring-2 ring-blue-500/20 shadow-xs'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <Moon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Mode Gelap (Dark)
                  </div>
                  {isDark && (
                    <CheckCircle2 className="h-4 w-4 text-blue-400" />
                  )}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Latar deep slate-950 yang tenang dan nyaman di mata untuk sesi kerja malam hari.
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Sesi Keamanan */}
      <Card variant="default">
        <CardHeader>
          <div>
            <CardTitle>Sesi Autentikasi</CardTitle>
            <CardDescription>
              Keluar dari akun untuk mengamankan data tim saat menggunakan perangkat bersama.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Sesi Anda tersimpan di penyimpanan lokal browser yang terenkripsi oleh Supabase Auth.
            </div>
            <Button
              variant="outline"
              size="md"
              leftIcon={<LogOut className="h-4 w-4 text-rose-500" />}
              onClick={() => void signOut()}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              Keluar dari Akun
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
