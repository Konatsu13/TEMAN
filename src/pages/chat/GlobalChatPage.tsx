import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  Hash,
  Info,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { ChatComposer } from '../../components/chat/ChatComposer';
import { ChatInfoPanel } from '../../components/chat/ChatInfoPanel';
import { ChatMessageList } from '../../components/chat/ChatMessageList';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useGlobalChat } from '../../hooks/useGlobalChat';
import type { ChatMessage } from '../../services/chatService';
import { formatDateTimeWIB } from '../../utils/formatters';

export function GlobalChatPage() {
  const { user, role } = useAuth();
  const {
    messages,
    participants,
    replyTargets,
    onlineUsers,
    loading,
    sending,
    error,
    sendError,
    aiError,
    aiPendingMessageId,
    refresh,
    sendMessage,
    editMessage,
    deleteMessage,
    retryAI,
    clearSendError,
    clearAIError,
  } = useGlobalChat();

  const [draft, setDraft] = useState('');
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const onlineCount = onlineUsers.length;
  const currentUserId = user?.id ?? '';

  const handleScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;

    const distanceFromBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight;
    const nearBottom = distanceFromBottom < 120;
    nearBottomRef.current = nearBottom;

    if (nearBottom) setShowJump(false);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const node = scrollRef.current;
    if (!node) return;

    node.scrollTo({
      top: node.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
    nearBottomRef.current = true;
    setShowJump(false);
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) {
      lastMessageIdRef.current = null;
      return;
    }
    if (lastMessageIdRef.current === lastMessage.id) return;

    const isFirstLoad = lastMessageIdRef.current === null;
    lastMessageIdRef.current = lastMessage.id;

    const shouldFollow =
      isFirstLoad ||
      nearBottomRef.current ||
      lastMessage.author_id === currentUserId;

    if (shouldFollow) {
      scrollToBottom(!isFirstLoad);
    } else {
      setShowJump(true);
    }
  }, [messages, currentUserId, scrollToBottom]);

  useEffect(() => {
    if (!aiPendingMessageId) return;
    if (!nearBottomRef.current) return;
    scrollToBottom(true);
  }, [aiPendingMessageId, scrollToBottom]);

  useEffect(() => {
    if (!pendingDelete) return;
    setDeleteError(null);
  }, [pendingDelete]);

  const handleSend = useCallback(
    async (content: string) => {
      await sendMessage(content, replyTarget?.id ?? null);
      setReplyTarget(null);
      setDraft('');
    },
    [replyTarget, sendMessage]
  );

  const handleReply = useCallback((message: ChatMessage) => {
    setReplyTarget(message);
    requestAnimationFrame(() => {
      document.getElementById('global-chat-message')?.focus();
    });
  }, []);

  const cancelReply = useCallback(() => setReplyTarget(null), []);

  const handleJumpToMessage = useCallback((messageId: string) => {
    const node = document.getElementById(`chat-message-${messageId}`);
    if (!node) return;

    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessageId(messageId);

    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedMessageId(null);
      highlightTimerRef.current = null;
    }, 1800);
  }, []);

  const handleSuggestion = useCallback((text: string) => {
    setDraft(text);
    requestAnimationFrame(() => {
      document.getElementById('global-chat-message')?.focus();
    });
  }, []);

  const requestDelete = useCallback((message: ChatMessage) => {
    setDeleteError(null);
    setPendingDelete(message);
  }, []);

  const closeDelete = useCallback(() => {
    if (deleting) return;
    setPendingDelete(null);
    setDeleteError(null);
  }, [deleting]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || deleting) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMessage(pendingDelete.id);
      if (
        replyTarget &&
        (replyTarget.id === pendingDelete.id ||
          replyTarget.reply_to_id === pendingDelete.id)
      ) {
        setReplyTarget(null);
      }
      setPendingDelete(null);
    } catch (deleteFailure) {
      setDeleteError(
        deleteFailure instanceof Error
          ? deleteFailure.message
          : 'Gagal menghapus pesan.'
      );
    } finally {
      setDeleting(false);
    }
  }, [deleteMessage, deleting, pendingDelete, replyTarget]);

  const deleteAuthor = pendingDelete?.is_ai
    ? 'TEMAN AI'
    : pendingDelete?.author?.full_name ?? 'Anggota';

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-0 flex-col lg:h-[calc(100dvh-8rem)]">
      <section
        aria-label="Global Chat"
        className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800/90 dark:bg-slate-900"
      >
        <div className="relative flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200/90 px-3 sm:px-4 dark:border-slate-800/90">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-2xs"
              >
                <Hash className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-display text-sm font-bold tracking-tight text-slate-900 sm:text-base dark:text-slate-100">
                    Global Chat
                  </h2>
                  <Badge variant="primary" size="sm" dot className="hidden sm:inline-flex">
                    Publik tim
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-[10.5px] text-slate-500 dark:text-slate-400">
                  Semua anggota aktif · WIB · @ai untuk bantuan
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {onlineCount > 0 && (
                <span
                  className="hidden h-7 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700 sm:inline-flex dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                  title={`${onlineCount} anggota online`}
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                  />
                  {onlineCount} online
                </span>
              )}

              <span className="hidden h-7 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 text-[10px] font-medium text-blue-700 md:inline-flex dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                AI mention
              </span>

              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                aria-label="Muat ulang pesan Global Chat"
                title="Muat ulang pesan"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
              </button>

              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                aria-label="Buka info ruang diskusi"
                title="Info ruang diskusi"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:outline-none xl:hidden dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <Info className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="relative min-h-0 flex-1">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-full overflow-y-auto overscroll-contain bg-slate-50/30 dark:bg-slate-950/20"
            >
              <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col pb-2">
                <ChatMessageList
                  messages={messages}
                  replyTargets={replyTargets}
                  loading={loading}
                  error={error}
                  currentUserId={currentUserId}
                  role={role}
                  aiPendingMessageId={aiPendingMessageId}
                  aiError={aiError}
                  highlightedMessageId={highlightedMessageId}
                  onRetryLoad={() => void refresh()}
                  onEdit={editMessage}
                  onRequestDelete={requestDelete}
                  onReply={handleReply}
                  onJumpToMessage={handleJumpToMessage}
                  onRetryAI={retryAI}
                  onDismissAIError={clearAIError}
                  onSuggestion={handleSuggestion}
                />
              </div>
            </div>

            {showJump && (
              <button
                type="button"
                onClick={() => scrollToBottom(true)}
                className="absolute bottom-3 left-1/2 z-10 inline-flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[10.5px] font-semibold text-slate-700 shadow-lg transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label="Lompat ke pesan terbaru"
              >
                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                Pesan terbaru
              </button>
            )}
          </div>

          <div className="mx-auto w-full max-w-3xl shrink-0">
            <ChatComposer
              value={draft}
              onValueChange={setDraft}
              onSend={handleSend}
              participants={participants}
              currentUserId={currentUserId}
              replyTo={replyTarget}
              onCancelReply={cancelReply}
              sending={sending}
              error={sendError}
              onClearError={clearSendError}
              disabled={!user}
            />
          </div>
        </div>

        <aside
          aria-label="Info Global Chat"
          className="hidden w-72 shrink-0 border-l border-slate-200/90 bg-slate-50/50 xl:flex dark:border-slate-800/90 dark:bg-slate-950/30"
        >
          <ChatInfoPanel
            participants={participants}
            onlineUsers={onlineUsers}
            messageCount={messages.length}
            currentUserId={currentUserId}
          />
        </aside>
      </section>

      <Modal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        title="Info Global Chat"
        description="Kanal publik tim, mention, dan bantuan AI."
        maxWidth="md"
      >
        <ChatInfoPanel
          participants={participants}
          onlineUsers={onlineUsers}
          messageCount={messages.length}
          currentUserId={currentUserId}
          mode="modal"
          showHeader={false}
        />
      </Modal>

      <Modal
        isOpen={Boolean(pendingDelete)}
        onClose={closeDelete}
        title="Hapus pesan?"
        description="Pesan akan hilang dari Global Chat dan tidak dapat dikembalikan."
        maxWidth="md"
      >
        {pendingDelete && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {deleteAuthor}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {formatDateTimeWIB(pendingDelete.created_at)}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-4 text-xs leading-5 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                {pendingDelete.content}
              </p>
            </div>

            {deleteError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] leading-5 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
              >
                <AlertCircle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400"
                  aria-hidden="true"
                />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={closeDelete}
                disabled={deleting}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void confirmDelete()}
                isLoading={deleting}
              >
                Hapus pesan
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
