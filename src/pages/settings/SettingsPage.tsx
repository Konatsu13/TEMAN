import { useEffect, useState } from 'react';
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
import { THEME_PRESETS, type ThemePresetId } from '../../config/theme-presets';
import { updateProfileBackgroundColor } from '../../services/authService';
import { getProfileColorText, isValidProfileColor } from '../../utils/profileColor';

const PROFILE_BG_PRESETS = [
  { label: 'Blue', value: '#2563EB' },
  { label: 'Indigo', value: '#4F46E5' },
  { label: 'Purple', value: '#7C3AED' },
  { label: 'Teal', value: '#0D9488' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Orange', value: '#EA580C' },
  { label: 'Rose', value: '#E11D48' },
  { label: 'Slate', value: '#475569' },
];

export function SettingsPage() {
  const { profile, role, signOut, refreshProfile } = useAuth();
  const { theme, setTheme, themePreset, setThemePreset } = useTheme();
  const isOwner = role === 'owner';
  const isDark = theme === 'dark';

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Profile background state
  const [bgColor, setBgColor] = useState<string>(
    profile?.profile_background_color ?? '',
  );
  const [savingBg, setSavingBg] = useState(false);
  const [bgSuccess, setBgSuccess] = useState<string | null>(null);
  const [bgError, setBgError] = useState<string | null>(null);

  useEffect(() => {
    setBgColor(profile?.profile_background_color ?? '');
  }, [profile?.profile_background_color]);

  // Color theme feedback
  const [colorThemeStatus, setColorThemeStatus] = useState<string | null>(null);
  const [colorThemeError, setColorThemeError] = useState<string | null>(null);
  const [savingTheme, setSavingTheme] = useState(false);

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

  const handleSelectPreset = async (id: ThemePresetId) => {
    setColorThemeStatus(null);
    setColorThemeError(null);
    setSavingTheme(true);
    try {
      await setThemePreset(id);
      setColorThemeStatus('Color theme diterapkan dan disimpan.');
    } catch (err) {
      setColorThemeError(
        `Preset tetap aktif di perangkat ini, tetapi gagal disinkronkan ke profil: ${
          err instanceof Error ? err.message : 'kesalahan tidak diketahui.'
        }`,
      );
    } finally {
      setSavingTheme(false);
    }
  };

  const handleSaveBg = async () => {
    if (!profile?.id) return;
    setBgError(null);
    setBgSuccess(null);

    const trimmed = bgColor.trim();
    if (trimmed && !isValidProfileColor(trimmed)) {
      setBgError('Warna harus berformat HEX 6 digit, contoh #2563EB.');
      return;
    }

    try {
      setSavingBg(true);
      await updateProfileBackgroundColor(profile.id, trimmed ? trimmed : null);
      await refreshProfile();
      setBgSuccess('Background profil berhasil disimpan.');
    } catch (err: any) {
      setBgError(err?.message || 'Gagal menyimpan background profil.');
    } finally {
      setSavingBg(false);
    }
  };

  const handleResetBg = async () => {
    setBgColor('');
    setBgError(null);
    setBgSuccess(null);
    if (!profile?.id) return;
    try {
      setSavingBg(true);
      await updateProfileBackgroundColor(profile.id, null);
      await refreshProfile();
      setBgSuccess('Background profil direset ke default.');
    } catch (err: any) {
      setBgColor(profile.profile_background_color ?? '');
      setBgError(err?.message || 'Gagal mereset background profil.');
    } finally {
      setSavingBg(false);
    }
  };

  const avatarBg =
    bgColor && isValidProfileColor(bgColor) ? bgColor : undefined;

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
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl font-display text-xl font-bold text-white shadow-xs"
              style={
                avatarBg
                  ? { backgroundColor: avatarBg, color: getProfileColorText(avatarBg) }
                  : {
                      backgroundColor: 'var(--primary)',
                      color: 'var(--primary-contrast)',
                    }
              }
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
                  <Shield className="h-4 w-4 text-[var(--primary)]" />
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

      {/* Profile Background */}
      <Card variant="default">
        <CardHeader>
          <div>
            <CardTitle>Background Profil</CardTitle>
            <CardDescription>
              Atur warna background pada area identitas profil Anda. Tidak memengaruhi tema global.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {bgError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{bgError}</span>
            </div>
          )}
          {bgSuccess && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{bgSuccess}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {PROFILE_BG_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setBgColor(preset.value)}
                className={`h-9 w-9 rounded-lg border-2 transition-all ${
                  bgColor.toUpperCase() === preset.value.toUpperCase()
                    ? 'border-slate-900 dark:border-slate-100 scale-105'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: preset.value }}
                title={preset.label}
                aria-label={preset.label}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Custom HEX
              </label>
              <input
                type="color"
                value={isValidProfileColor(bgColor) ? bgColor : '#2563EB'}
                onChange={(e) => setBgColor(e.target.value.toUpperCase())}
                className="h-10 w-16 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                placeholder="#2563EB"
                className="ml-3 h-10 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-bg)] px-3 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]/30"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={savingBg}
              onClick={() => void handleSaveBg()}
            >
              Simpan
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={savingBg}
              onClick={() => void handleResetBg()}
            >
              Reset ke Default
            </Button>
          </div>

          <div
            className="mt-2 flex h-16 items-center justify-center rounded-xl text-sm font-semibold shadow-xs"
            style={
              avatarBg
                ? {
                    backgroundColor: avatarBg,
                    color: getProfileColorText(avatarBg),
                  }
                : {
                    backgroundColor: 'var(--surface-elevated)',
                    color: 'var(--text-sub)',
                  }
            }
          >
            Preview background profil
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
              className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                !isDark
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)]/20 ring-2 ring-[var(--primary)]/20 shadow-xs'
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
                    <CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />
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
              className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                isDark
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] ring-2 ring-[var(--primary)]/20 shadow-xs'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <Moon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Mode Gelap (Dark)
                  </div>
                  {isDark && (
                    <CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />
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

      {/* Color Theme */}
      <Card variant="default">
        <CardHeader>
          <div>
            <CardTitle>Color Theme</CardTitle>
            <CardDescription>
              Pilih palet warna antarmuka. Dapat dikombinasikan dengan Light/Dark Mode.
            </CardDescription>
          </div>
          {colorThemeStatus && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {colorThemeStatus}
            </span>
          )}
          {colorThemeError && (
            <span role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
              {colorThemeError}
            </span>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {THEME_PRESETS.map((preset) => {
              const active = themePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => void handleSelectPreset(preset.id)}
                  disabled={savingTheme}
                  aria-pressed={active}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                    active
                      ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-xs'
                      : 'border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700'
                  }`}
                >
                  <div
                    className="theme-preset-preview flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/60"
                    data-theme-preset={preset.id}
                    style={{ backgroundColor: preset.preview.canvas }}
                  >
                    <span
                      className="block h-4 w-4 rounded-full"
                      style={{ backgroundColor: preset.preview.accent }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {preset.name}
                      </div>
                      {active && (
                        <CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      {preset.description}
                    </div>
                    <div
                      className="theme-preset-preview mt-2 flex gap-1.5"
                      data-theme-preset={preset.id}
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-slate-200/60"
                        style={{ backgroundColor: preset.preview.canvas }}
                        title="Background"
                      />
                      <span
                        className="h-3 w-3 rounded-full border border-slate-200/60"
                        style={{ backgroundColor: preset.preview.surface }}
                        title="Surface"
                      />
                      <span
                        className="h-3 w-3 rounded-full border border-slate-200/60"
                        style={{ backgroundColor: preset.preview.accent }}
                        title="Accent"
                      />
                    </div>
                  </div>
                </button>
              );
            })}
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