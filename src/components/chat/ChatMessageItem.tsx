import { useEffect, useState, type ReactNode } from 'react';
import {
  Check,
  Copy,
  CornerDownRight,
  Pencil,
  Reply,
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
  replyMissing?: boolean;
  highlighted?: boolean;
  isOwn: boolean;
  canEdit: boolean;
  canDelete: boolean;
  compact?: boolean;
  onEdit: (id: string, content: string) => Promise<void>;
  onRequestDelete: (message: ChatMessage) => void;
  onReply?: (message: ChatMessage) => void;
  onJumpToMessage?: (messageId: string) => void;
}

type BubbleTone = 'own' | 'other' | 'ai';

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
      className={`grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 sm:h-8 sm:w-8 ${
        danger
          ? 'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400'
          : 'hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function ReplyQuote({
  replyTo,
  missing = false,
  tone = 'other',
  onJump,
}: {
  replyTo?: ChatMessage | null;
  missing?: boolean;
  tone?: BubbleTone;
  onJump?: () => void;
}) {
  const authorName = missing
    ? 'Pesan asli'
    : replyTo?.is_ai
      ? 'TEMAN AI'
      : replyTo?.author?.full_name ?? 'Anggota';
  const preview = missing
    ? 'Pesan yang dibalas tidak lagi tersedia.'
    : replyTo?.content ?? '';

  const borderClass =
    tone === 'own'
      ? 'border-white/40 text-blue-50'
      : tone === 'ai'
        ? 'border-blue-300 text-slate-600 dark:border-blue-700 dark:text-slate-300'
        : 'border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400';

  const nameClass =
    tone === 'own'
      ? 'text-white'
      : 'text-slate-700 dark:text-slate-200';

  const content = (
    <>
      <CornerDownRight className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="line-clamp-2">
        <strong className={`font-semibold ${nameClass}`}>{authorName}</strong>:{' '}
        <span className={missing ? 'italic' : undefined}>{preview}</span>
      </span>
    </>
  );

  if (!missing && onJump) {
    return (
      <button
        type="button"
        onClick={onJump}
        aria-label={`Lihat pesan ${authorName} yang dibalas`}
        title="Lihat pesan yang dibalas"
        className={`mb-1.5 flex w-full items-start gap-1.5 rounded border-l-2 pl-2 text-left text-[11px] leading-5 transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:outline-none ${borderClass}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`mb-1.5 flex items-start gap-1.5 border-l-2 pl-2 text-[11px] leading-5 ${borderClass}`}
    >
      {content}
    </div>
  );
}

function MessageContent({
  content,
  tone = 'other',
}: {
  content: string;
  tone?: BubbleTone;
}) {
  const contentClass =
    tone === 'own'
      ? 'text-white'
      : 'text-slate-700 dark:text-slate-200';

  const linkClass =
    tone === 'own'
      ? 'text-white underline decoration-white/50 underline-offset-2 hover:decoration-white'
      : 'text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:decoration-blue-700 dark:hover:text-blue-300';

  return (
    <div
      className={`text-[13px] leading-6 break-words whitespace-pre-wrap ${contentClass}`}
    >
      {tokenizeChatContent(content).map((token, index) => {
        if (token.type === 'mention') {
          const isAi = isAiMentionHandle(token.handle);
          const mentionClass =
            tone === 'own'
              ? isAi
                ? 'bg-white/25 text-white ring-1 ring-white/30'
                : 'bg-white/20 text-white'
              : isAi
                ? 'bg-blue-100/80 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-700/70 dark:text-slate-200';

          return (
            <span
              key={index}
              title={isAi ? 'Mention TEMAN AI' : `Mention @${token.handle}`}
              className={`rounded px-1 font-semibold ${mentionClass}`}
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
              className={`font-medium ${linkClass}`}
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
  replyMissing = false,
  highlighted = false,
  isOwn,
  canEdit,
  canDelete,
  compact = false,
  onEdit,
  onRequestDelete,
  onReply,
  onJumpToMessage,
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
      {onReply && !editing && (
        <ActionButton label="Balas pesan" onClick={() => onReply(message)}>
          <Reply className="h-3.5 w-3.5" />
        </ActionButton>
      )}

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

  const editor = (
    <div className="w-full rounded-2xl border border-blue-300 bg-white p-2.5 shadow-xs dark:border-blue-800 dark:bg-slate-950">
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
        className="block w-full resize-y rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2 text-[13px] leading-6 text-slate-900 transition-colors focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-950"
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
  );

  const bubbleHighlight = highlighted
    ? 'ring-2 ring-amber-300/90 dark:ring-amber-500/60'
    : '';

  if (message.is_ai) {
    return (
      <article
        id={`chat-message-${message.id}`}
        aria-label="Jawaban TEMAN AI"
        className="group mt-3 flex scroll-mt-4 items-start gap-2.5 px-3 sm:px-4"
      >
        <Avatar name={null} isAi />

        <div className="min-w-0 max-w-[85%] sm:max-w-[72%]">
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-1">
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

          <div
            className={`rounded-2xl rounded-tl-md border border-blue-200/80 bg-blue-50 px-3.5 py-2.5 shadow-xs dark:border-blue-900/60 dark:bg-blue-950/30 ${bubbleHighlight}`}
          >
            {(replyTo || replyMissing) && (
              <ReplyQuote
                replyTo={replyTo}
                missing={replyMissing}
                tone="ai"
                onJump={
                  replyTo && onJumpToMessage
                    ? () => onJumpToMessage(replyTo.id)
                    : undefined
                }
              />
            )}
            <MessageContent content={message.content} tone="ai" />
          </div>
        </div>

        <div className="self-start pt-1">{actions}</div>
      </article>
    );
  }

  const authorName = message.author?.full_name ?? 'Anggota';
  const tone: BubbleTone = isOwn ? 'own' : 'other';

  return (
    <article
      id={`chat-message-${message.id}`}
      className={`group flex scroll-mt-4 items-start gap-2 px-3 sm:px-4 ${
        compact ? 'mt-0.5' : 'mt-3'
      } ${isOwn ? 'justify-end' : ''}`}
    >
      {!isOwn && (
        <div className="w-8 shrink-0">
          {!compact && <Avatar name={authorName} />}
        </div>
      )}

      {isOwn && <div className="self-start pt-1">{actions}</div>}

      <div
        className={`flex min-w-0 max-w-[85%] flex-col sm:max-w-[72%] ${
          isOwn ? 'items-end' : 'items-start'
        } ${editing ? 'w-full' : ''}`}
      >
        {!compact &&
          (isOwn ? (
            <div className="mb-1 flex items-center gap-2 pr-1">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Anda
              </span>
              <time
                dateTime={message.created_at}
                className="font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500"
              >
                {formatTimeWIB(message.created_at)}
              </time>
            </div>
          ) : (
            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-1">
              <span className="font-display text-xs font-bold text-slate-900 dark:text-slate-100">
                {authorName}
              </span>
              <RoleBadge role={message.author?.role} />
              <time
                dateTime={message.created_at}
                className="font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500"
              >
                {formatTimeWIB(message.created_at)}
              </time>
            </div>
          ))}

        {editing ? (
          editor
        ) : (
          <div
            className={`max-w-full px-3.5 py-2 shadow-xs ${
              isOwn
                ? 'rounded-2xl rounded-tr-md bg-blue-600 text-white ring-1 ring-blue-700/10 dark:ring-blue-400/20'
                : 'rounded-2xl rounded-tl-md border border-slate-200/90 bg-white text-slate-700 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-200'
            } ${bubbleHighlight}`}
          >
            {(replyTo || replyMissing) && (
              <ReplyQuote
                replyTo={replyTo}
                missing={replyMissing}
                tone={tone}
                onJump={
                  replyTo && onJumpToMessage
                    ? () => onJumpToMessage(replyTo.id)
                    : undefined
                }
              />
            )}
            <MessageContent content={message.content} tone={tone} />
            {message.edited_at && (
              <span
                className={`mt-0.5 inline-block text-[10px] italic ${
                  isOwn
                    ? 'text-blue-100/80'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                diedit
              </span>
            )}
          </div>
        )}
      </div>

      {!isOwn && <div className="self-start pt-1">{actions}</div>}
    </article>
  );
}
