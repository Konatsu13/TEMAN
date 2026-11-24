import {
  AlertCircle,
  Hash,
  MessageSquareText,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import type { ChatAIError } from '../../hooks/useGlobalChat';
import type { ChatMessage } from '../../services/chatService';
import type { AppRole } from '../../types/database.types';
import { formatChatDayWIB } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { ChatMessageItem } from './ChatMessageItem';

interface ChatMessageListProps {
  messages: ChatMessage[];
  replyTargets: Record<string, ChatMessage | null>;
  loading: boolean;
  error: string | null;
  currentUserId?: string;
  role: AppRole | null;
  aiPendingMessageId: string | null;
  aiError: ChatAIError | null;
  highlightedMessageId: string | null;
  onRetryLoad: () => void;
  onEdit: (id: string, content: string) => Promise<void>;
  onRequestDelete: (message: ChatMessage) => void;
  onReply: (message: ChatMessage) => void;
  onJumpToMessage: (messageId: string) => void;
  onRetryAI: (messageId: string) => void;
  onDismissAIError: () => void;
  onSuggestion: (text: string) => void;
}

const STARTER_PROMPTS = [
  'Ringkas deadline terdekat minggu ini @ai',
  'Tugas siapa yang masih terbuka? @ai',
  'Bantu susun agenda rapat tim @ai',
  'Halo tim, ada update kompetisi?',
];

function DayDivider({ label }: { label: string }) {
  return (
    <div
      role="separator"
      aria-label={label}
      className="flex items-center gap-3 px-4 py-3"
    >
      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      <span className="font-mono text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase dark:text-slate-500">
        {label}
      </span>
      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

function LoadingMessages() {
  return (
    <div
      className="flex-1 space-y-4 px-4 py-4"
      aria-busy="true"
      aria-label="Memuat pesan"
    >
      {[0, 1, 2, 3, 4].map((item) => {
        const isOwn = item % 2 === 1;
        return (
          <div
            key={item}
            className={`flex items-start gap-2.5 ${isOwn ? 'justify-end' : ''}`}
          >
            {!isOwn && <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />}
            <div
              className={`flex flex-col gap-1.5 ${
                isOwn ? 'items-end' : 'items-start'
              }`}
            >
              <Skeleton className="h-2.5 w-24" />
              <Skeleton
                className={`h-11 rounded-2xl ${
                  isOwn
                    ? 'w-48 rounded-tr-md sm:w-56'
                    : 'w-56 rounded-tl-md sm:w-72'
                }`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyChat({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-5 py-10 text-center">
      <div
        aria-hidden="true"
        className="grid h-12 w-12 place-items-center rounded-xl bg-blue-600 text-white shadow-xs"
      >
        <Hash className="h-6 w-6" />
      </div>
      <h3 className="font-display mt-4 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
        Ruang diskusi global
      </h3>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Semua anggota aktif dapat membaca dan membalas di sini. Tulis pertanyaan,
        bagikan konteks, atau mention <span className="font-semibold text-blue-700 dark:text-blue-400">@ai</span>{' '}
        untuk meminta bantuan dengan konteks workspace.
      </p>

      <div className="mt-5 grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSuggestion(prompt)}
            className="group flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:outline-none dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
          >
            <MessageSquareText
              className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-blue-600 dark:text-slate-500 dark:group-hover:text-blue-400"
              aria-hidden="true"
            />
            <span className="text-[11.5px] leading-5 font-medium text-slate-700 dark:text-slate-300">
              {prompt}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-5 font-mono text-[9px] tracking-[0.1em] text-slate-400 uppercase dark:text-slate-500">
        Pesan tersimpan · WIB · Realtime
      </p>
    </div>
  );
}

function PendingAI() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-3 flex items-start gap-2.5 px-3 sm:px-4"
    >
      <div
        aria-hidden="true"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-white dark:bg-blue-600"
      >
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 max-w-[85%] sm:max-w-[72%]">
        <div className="mb-1 flex items-center gap-2 pl-1">
          <span className="font-display text-xs font-bold text-slate-900 dark:text-slate-100">
            TEMAN AI
          </span>
          <span className="font-mono text-[9px] tracking-[0.12em] text-blue-600 uppercase dark:text-blue-400">
            sedang menulis
          </span>
        </div>
        <div className="rounded-2xl rounded-tl-md border border-blue-200/80 bg-blue-50 px-3.5 py-3 shadow-xs dark:border-blue-900/60 dark:bg-blue-950/30">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="teman-ai-dot h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400"
                style={{ animationDelay: `${index * 140}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatMessageList({
  messages,
  replyTargets,
  loading,
  error,
  currentUserId,
  role,
  aiPendingMessageId,
  aiError,
  highlightedMessageId,
  onRetryLoad,
  onEdit,
  onRequestDelete,
  onReply,
  onJumpToMessage,
  onRetryAI,
  onDismissAIError,
  onSuggestion,
}: ChatMessageListProps) {
  if (loading && messages.length === 0) {
    return <LoadingMessages />;
  }

  if (error && messages.length === 0) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <div
          aria-hidden="true"
          className="grid h-12 w-12 place-items-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400"
        >
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="font-display mt-4 text-base font-bold text-slate-900 dark:text-slate-100">
          Ruang diskusi belum dapat dimuat
        </h3>
        <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {error}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onRetryLoad}
          leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
          className="mt-4"
        >
          Coba Lagi
        </Button>
      </div>
    );
  }

  if (messages.length === 0) {
    return <EmptyChat onSuggestion={onSuggestion} />;
  }

  const messagesById = new Map(messages.map((message) => [message.id, message]));
  const rows: Array<
    | { type: 'day'; key: string; label: string }
    | {
        type: 'message';
        key: string;
        message: ChatMessage;
        compact: boolean;
        replyTo: ChatMessage | null;
        replyMissing: boolean;
      }
  > = [];

  let previousDay: string | null = null;
  let previousMessage: ChatMessage | null = null;

  for (const message of messages) {
    const day = formatChatDayWIB(message.created_at);
    const showDay = day !== previousDay;

    if (showDay) {
      rows.push({ type: 'day', key: `day-${day}`, label: day });
    }

    const withinFiveMinutes =
      previousMessage !== null &&
      new Date(message.created_at).getTime() -
        new Date(previousMessage.created_at).getTime() <
        5 * 60 * 1000;

    const compact =
      !showDay &&
      !message.is_ai &&
      previousMessage !== null &&
      !previousMessage.is_ai &&
      previousMessage.author_id === message.author_id &&
      withinFiveMinutes;

    const targetId = message.reply_to_id;
    const replyTo = targetId
      ? messagesById.get(targetId) ?? replyTargets[targetId] ?? null
      : null;

    rows.push({
      type: 'message',
      key: message.id,
      message,
      compact,
      replyTo,
      replyMissing: Boolean(targetId) && !replyTo,
    });

    previousDay = day;
    previousMessage = message;
  }

  return (
    <div
      role="log"
      aria-label="Pesan Global Chat"
      aria-live="polite"
      aria-relevant="additions"
    >
      {error && (
        <div
          role="alert"
          className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={onRetryLoad}
            className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
          >
            Muat ulang
          </button>
        </div>
      )}

      {rows.map((row) => {
        if (row.type === 'day') {
          return <DayDivider key={row.key} label={row.label} />;
        }

        const isOwn = row.message.author_id === currentUserId;

        return (
          <ChatMessageItem
            key={row.key}
            message={row.message}
            replyTo={row.replyTo}
            replyMissing={row.replyMissing}
            highlighted={highlightedMessageId === row.message.id}
            isOwn={isOwn}
            canEdit={isOwn && !row.message.is_ai}
            canDelete={
              role === 'owner' || (isOwn && !row.message.is_ai)
            }
            compact={row.compact}
            onEdit={onEdit}
            onRequestDelete={onRequestDelete}
            onReply={onReply}
            onJumpToMessage={
              row.replyTo && messagesById.has(row.replyTo.id)
                ? onJumpToMessage
                : undefined
            }
          />
        );
      })}

      {aiPendingMessageId && <PendingAI />}

      {aiError && (
        <div
          role="alert"
          className="mx-4 my-3 flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-[11.5px] leading-5 text-rose-900 sm:flex-row sm:items-center dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          <span className="min-w-0 flex-1">{aiError.text}</span>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => onRetryAI(aiError.messageId)}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-rose-300 bg-white px-2 text-[11px] font-medium text-rose-700 transition-colors hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-500/30 focus-visible:outline-none dark:border-rose-800 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-rose-950/40"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Coba lagi
            </button>
            <button
              type="button"
              onClick={onDismissAIError}
              aria-label="Tutup pesan error AI"
              className="grid h-7 w-7 place-items-center rounded-md text-rose-500 transition-colors hover:bg-rose-100 focus-visible:ring-2 focus-visible:ring-rose-500/30 focus-visible:outline-none dark:hover:bg-rose-950/40"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
