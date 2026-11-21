import {
  AtSign,
  Hash,
  MessageSquareText,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { OnlineChatUser } from '../../hooks/useGlobalChat';
import type { ChatParticipant } from '../../services/chatService';
import type { AppRole } from '../../types/database.types';
import { getInitials } from '../../utils/formatters';
import { Badge } from '../ui/Badge';

interface ChatInfoPanelProps {
  participants: ChatParticipant[];
  onlineUsers: OnlineChatUser[];
  messageCount: number;
  currentUserId: string;
  onClose?: () => void;
  mode?: 'aside' | 'modal';
  showHeader?: boolean;
}

interface MemberRow {
  id: string;
  full_name: string;
  username: string;
  role: AppRole | null;
  online: boolean;
}

function buildMemberRows(
  participants: ChatParticipant[],
  onlineUsers: OnlineChatUser[]
): MemberRow[] {
  const onlineIds = new Set(onlineUsers.map((user) => user.user_id));
  const rows = new Map<string, MemberRow>();

  for (const participant of participants) {
    rows.set(participant.id, {
      id: participant.id,
      full_name: participant.full_name,
      username: participant.username,
      role: participant.role,
      online: onlineIds.has(participant.id),
    });
  }

  for (const onlineUser of onlineUsers) {
    if (rows.has(onlineUser.user_id)) continue;
    rows.set(onlineUser.user_id, {
      id: onlineUser.user_id,
      full_name: onlineUser.full_name,
      username: onlineUser.username,
      role: onlineUser.role,
      online: true,
    });
  }

  return [...rows.values()].sort((left, right) => {
    if (left.online !== right.online) return left.online ? -1 : 1;
    return left.full_name.localeCompare(right.full_name, 'id');
  });
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white px-2 py-2 dark:border-slate-800 dark:bg-slate-900/60">
      <div
        className={`font-display text-base font-bold tabular-nums ${
          accent ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 font-mono text-[8.5px] tracking-[0.1em] text-slate-400 uppercase dark:text-slate-500">
        {label}
      </div>
    </div>
  );
}

function MemberItem({
  member,
  isCurrentUser,
}: {
  member: MemberRow;
  isCurrentUser: boolean;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/60">
      <span className="relative shrink-0" aria-hidden="true">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-600 text-[10px] font-bold text-white">
          {getInitials(member.full_name)}
        </span>
        <span
          className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
            member.online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">
            {member.full_name}
          </span>
          {isCurrentUser && (
            <span className="shrink-0 text-[9px] font-medium text-slate-400 dark:text-slate-500">
              Anda
            </span>
          )}
        </span>
        <span className="block truncate text-[10px] text-slate-400 dark:text-slate-500">
          {member.username ? `@${member.username}` : 'Anggota'}
          <span className="sr-only">
            {member.online ? ' · online' : ' · offline'}
          </span>
        </span>
      </span>
      {member.role && (
        <Badge
          variant={member.role === 'owner' ? 'primary' : 'default'}
          size="sm"
          className="shrink-0 scale-90"
        >
          {member.role === 'owner' ? 'Owner' : 'Member'}
        </Badge>
      )}
    </li>
  );
}

export function ChatInfoPanel({
  participants,
  onlineUsers,
  messageCount,
  currentUserId,
  onClose,
  mode = 'aside',
  showHeader = true,
}: ChatInfoPanelProps) {
  const members = buildMemberRows(participants, onlineUsers);
  const onlineCount = members.filter((member) => member.online).length;
  const isModal = mode === 'modal';

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showHeader && (
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase dark:text-slate-400">
              Info ruang
            </span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup info ruang diskusi"
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:outline-none dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <div className={`min-h-0 flex-1 overflow-y-auto ${isModal ? '' : 'px-4 py-4'}`}>
        <div className={isModal ? 'space-y-4' : 'space-y-5'}>
          <div>
            <div className="flex items-start gap-3">
              <div
                aria-hidden="true"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-xs"
              >
                <Hash className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Global Chat
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="primary" size="sm" dot>
                    Publik tim
                  </Badge>
                  <Badge variant="info" size="sm">
                    <Sparkles className="mr-0.5 h-2.5 w-2.5" aria-hidden="true" />
                    AI mention
                  </Badge>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
              Satu ruang diskusi untuk semua anggota aktif. Pesan tersimpan,
              tersinkron realtime, dan memakai waktu WIB.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <Stat label="Pesan" value={String(messageCount)} />
            <Stat label="Anggota" value={String(members.length)} />
            <Stat label="Online" value={onlineCount > 0 ? String(onlineCount) : '—'} accent />
          </div>
          <p className="-mt-2 font-mono text-[8.5px] leading-4 tracking-[0.04em] text-slate-400 uppercase dark:text-slate-500">
            Memuat hingga 150 pesan terbaru
          </p>

          <div className="rounded-xl border border-blue-200/70 bg-blue-50/60 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span className="font-display text-[11.5px] font-bold text-slate-900 dark:text-slate-100">
                TEMAN AI
              </span>
            </div>
            <p className="mt-1.5 text-[10.5px] leading-[18px] text-slate-600 dark:text-slate-300">
              Tulis{' '}
              <span className="rounded bg-white px-1 font-mono text-[10px] font-semibold text-blue-700 dark:bg-slate-900 dark:text-blue-300">
                @ai
              </span>{' '}
              atau{' '}
              <span className="rounded bg-white px-1 font-mono text-[10px] font-semibold text-blue-700 dark:bg-slate-900 dark:text-blue-300">
                @teman
              </span>{' '}
              di pesan Anda. AI menjawab dengan konteks workspace yang boleh Anda
              akses. Kunci API tetap di server.
            </p>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <h3 className="font-mono text-[9.5px] font-semibold tracking-[0.12em] text-slate-500 uppercase dark:text-slate-400">
                  Anggota
                </h3>
              </div>
              <span className="font-mono text-[9px] text-slate-400 tabular-nums dark:text-slate-500">
                {onlineCount}/{members.length} online
              </span>
            </div>

            {members.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-slate-200 px-3 py-3 text-[10.5px] leading-4 text-slate-400 dark:border-slate-800 dark:text-slate-500">
                Daftar anggota belum termuat. Mention tetap bisa diketik manual.
              </p>
            ) : (
              <ul
                className={`mt-1.5 space-y-0.5 ${
                  isModal ? 'max-h-64 overflow-y-auto pr-0.5' : ''
                }`}
              >
                {members.map((member) => (
                  <MemberItem
                    key={member.id}
                    member={member}
                    isCurrentUser={member.id === currentUserId}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <h3 className="font-mono text-[9.5px] font-semibold tracking-[0.12em] text-slate-500 uppercase dark:text-slate-400">
              Panduan singkat
            </h3>
            <ul className="mt-2 space-y-1.5 text-[10.5px] leading-4 text-slate-500 dark:text-slate-400">
              <li className="flex gap-2">
                <MessageSquareText className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-slate-700 dark:text-slate-300">Enter</strong>{' '}
                  mengirim, <strong className="font-semibold text-slate-700 dark:text-slate-300">Shift+Enter</strong>{' '}
                  membuat baris baru.
                </span>
              </li>
              <li className="flex gap-2">
                <AtSign className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                <span>Ketik @ untuk menyebut anggota, atau @ai untuk bertanya.</span>
              </li>
              <li className="flex gap-2">
                <Pencil className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                <span>Pesan sendiri dapat diedit; tanda “diedit” tetap terlihat.</span>
              </li>
              <li className="flex gap-2">
                <Trash2 className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                <span>Penulis dan Owner dapat menghapus pesan.</span>
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                <span>Akses mengikuti keaktifan akun dan policy RLS Supabase.</span>
              </li>
            </ul>
          </div>

          <p className="border-t border-slate-100 pt-3 font-mono text-[8.5px] leading-4 tracking-[0.04em] text-slate-400 uppercase dark:border-slate-800 dark:text-slate-500">
            Global Chat · Publik tim · WIB
          </p>
        </div>
      </div>
    </div>
  );
}
