import { useEffect, useState, type ReactNode } from 'react';
import {
  Check,
  Copy,
  CornerDownRight,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { ChatMessage } from '../../services/chatService';
import type { AppRole } from '../../types/database.types';
import { formatTimeWIB, getInitials } from '../../utils/formatters';
import {
  isAiMentionHandle,
  tokenizeChatContent,
} from '../../utils/chatMentions';
import { Badge } from '../ui/Badge';

interface ChatMessageItemProps {
  message: ChatMessage;
  replyTo?: ChatMessage | null;
  isOwn: boolean;
  canEdit: boolean;
  canDelete: boolean;
  compact?: boolean;
  onEdit: (id: string, content: string) => Promise<void>;
  onRequestDelete: (message: ChatMessage) => void;
}

function Avatar({
  name,
  isAi = false,
}: {
  name: string | null | undefined;
  isAi?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white shadow-2xs ${
        isAi ? 'bg-slate-900 dark:bg-blue-600' : 'bg-blue-600'
      }`}
    >
      {isAi ? <Sparkles className="h-4 w-4" /> : getInitials(name)}
    </div>
  );
}

function RoleBadge({ role }: { role?: AppRole | null }) {
  if (!role) return null;
  return (
    <Badge variant={role === 'owner' ? 'primary' : 'default'} size="sm">
      {role === 'owner' ? 'Owner' : 'Member'}
    </Badge>
  );
}

function ActionButton({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 ${
        danger
          ? 'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400'
          : 'hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function ReplyQuote({ replyTo }: { replyTo: ChatMessage }) {
  const authorName = replyTo.is_ai
    ? 'TEMAN AI'
    : replyTo.author?.full_name ?? 'Anggota';

  return (
    <div className="mb-1.5 flex items-start gap-1.5 border-l-2 border-slate-300 pl-2 text-[11px] leading-5 text-slate-500 dark:border-slate-600 dark:text-slate-400">
      <CornerDownRight className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="line-clamp-2">
        <strong className="font-semibold text-slate-600 dark:text-slate-300">
          {authorName}
        </strong>
        : {replyTo.content}
      </span>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  return (
    <div className="text-[13px] leading-6 break-words whitespace-pre-wrap text-slate-700 dark:text-slate-200">
      {tokenizeChatContent(content).map((token, index) => {
        if (token.type === 'mention') {
          const isAi = isAiMentionHandle(token.handle);
          return (
            <span
              key={index}
              title={isAi ? 'Mention TEMAN AI' : `Mention @${token.handle}`}
              className={`rounded px-1 font-semibold ${
                isAi
                  ? 'bg-blue-100/80 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {token.value}
            </span>
          );
        }

        if (token.type === 'link') {
          return (
            <a
              key={index}
              href={token.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:decoration-blue-700 dark:hover:text-blue-300"
            >
              {token.value}
            </a>
          );
        }

        return <span key={index}>{token.value}</span>;
      })}
    </div>
  );
}

export function ChatMessageItem({
  message,
  replyTo,
  isOwn,
  canEdit,
  canDelete,
  compact = false,
  onEdit,
  onRequestDelete,
}: ChatMessageItemProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
    } catch {
      // Clipboard access can be blocked; keep the UI silent.
    }
  };

  const startEditing = () => {
    setEditValue(message.content);
    setEditError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditError(null);
    setEditValue(message.content);
  };

  const saveEdit = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === message.content || saving) return;

    setSaving(true);
    setEditError(null);
    try {
      await onEdit(message.id, trimmed);
      setEditing(false);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : 'Gagal memperbarui pesan.'
      );
    } finally {
      setSaving(false);
    }
  };

  const actions = (
    <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
      <ActionButton label="Salin pesan" onClick={() => void copyMessage()}>
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </ActionButton>

      {canEdit && !editing && (
        <ActionButton label="Edit pesan" onClick={startEditing}>
          <Pencil className="h-3.5 w-3.5" />
        </ActionButton>
      )}

      {canDelete && (
        <ActionButton
          label="Hapus pesan"
          danger
          onClick={() => onRequestDelete(message)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </ActionButton>
      )}
    </div>
  );

  if (message.is_ai) {
    return (
      <article
        aria-label="Jawaban TEMAN AI"
        className="group relative border-l-2 border-blue-500 bg-blue-50/40 px-3 py-3 transition-colors sm:px-4 dark:bg-blue-950/20"
      >
        <div className="flex items-start gap-3">
          <Avatar name={null} isAi />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-display text-xs font-bold text-slate-900 dark:text-slate-100">
                TEMAN AI
              </span>
              <Badge variant="info" size="sm">
                Asisten
              </Badge>
              <span className="font-mono text-[9px] tracking-[0.12em] text-blue-600 uppercase dark:text-blue-400">
                Jawaban AI
              </span>
              <time
                dateTime={message.created_at}
                className="font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500"
              >
                {formatTimeWIB(message.created_at)}
              </time>
            </div>

            {replyTo && <div className="mt-1.5"><ReplyQuote replyTo={replyTo} /></div>}

            <div className="mt-1.5">
              <MessageContent content={message.content} />
            </div>
          </div>
          <div className="self-start pt-0.5">{actions}</div>
        </div>
      </article>
    );
  }

  const authorName = message.author?.full_name ?? 'Anggota';

  return (
    <article
      className={`group relative flex gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50/70 sm:px-4 dark:hover:bg-slate-800/30 ${
        compact ? 'pl-14' : ''
      }`}
    >
      {!compact && <Avatar name={authorName} />}

      <div className="min-w-0 flex-1">
        {!compact && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-display text-xs font-bold text-slate-900 dark:text-slate-100">
              {authorName}
            </span>
            <RoleBadge role={message.author?.role} />
            {isOwn && (
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                Anda
              </span>
            )}
            <time
              dateTime={message.created_at}
              className="font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500"
            >
              {formatTimeWIB(message.created_at)}
            </time>
          </div>
        )}

        {replyTo && <div className={compact ? 'mb-1' : 'mt-1'}><ReplyQuote replyTo={replyTo} /></div>}

        {editing ? (
          <div className="mt-1.5">
            <label htmlFor={`edit-chat-${message.id}`} className="sr-only">
              Edit pesan
            </label>
            <textarea
              id={`edit-chat-${message.id}`}
              value={editValue}
              onChange={(event) => setEditValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelEditing();
                } else if (
                  event.key === 'Enter' &&
                  (event.metaKey || event.ctrlKey)
                ) {
                  event.preventDefault();
                  void saveEdit();
                }
              }}
              rows={3}
              maxLength={2000}
              autoFocus
              className="block w-full resize-y rounded-lg border border-blue-300 bg-white px-3 py-2 text-[13px] leading-6 text-slate-900 shadow-xs transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none dark:border-blue-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={!editValue.trim() || editValue.trim() === message.content || saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-950"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Batal
              </button>
              <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500">
                Ctrl+Enter simpan
              </span>
            </div>
            {editError && (
              <p role="alert" className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                {editError}
              </p>
            )}
          </div>
        ) : (
          <div className={compact ? '' : 'mt-1'}>
            <MessageContent content={message.content} />
            {message.edited_at && (
              <span className="mt-0.5 inline-block text-[10px] text-slate-400 italic dark:text-slate-500">
                diedit
              </span>
            )}
          </div>
        )}
      </div>

      <div className="self-start pt-0.5">{actions}</div>
    </article>
  );
}
