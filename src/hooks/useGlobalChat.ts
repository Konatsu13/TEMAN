import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AppRole } from '../types/database.types';
import {
  deleteChatMessage as deleteChatMessageService,
  editChatMessage as editChatMessageService,
  fetchChatMessages,
  fetchChatParticipants,
  notifyChatMentions,
  sendChatMessage as sendChatMessageService,
  type ChatMessage,
  type ChatParticipant,
} from '../services/chatService';
import { requestChatAIReply } from '../services/chatAIService';
import { friendlyChatError } from '../utils/chatErrors';
import { hasAiMention } from '../utils/chatMentions';
import { useAuth } from './useAuth';

export interface OnlineChatUser {
  user_id: string;
  full_name: string;
  username: string;
  role: AppRole | null;
  online_at: string;
}

export interface ChatAIError {
  messageId: string;
  text: string;
}

function sortMessages(list: ChatMessage[]): ChatMessage[] {
  return list
    .slice()
    .sort(
      (left, right) =>
        new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    );
}

function mergeMessage(list: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  const index = list.findIndex((message) => message.id === incoming.id);
  if (index === -1) return sortMessages([...list, incoming]);

  const next = list.slice();
  const existing = next[index];
  next[index] = {
    ...existing,
    ...incoming,
    author: incoming.author ?? existing.author,
  };
  return sortMessages(next);
}

export function useGlobalChat() {
  const { user, profile, role } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<ChatAIError | null>(null);
  const [aiPendingMessageId, setAiPendingMessageId] = useState<string | null>(
    null
  );

  const mountedRef = useRef(true);
  const participantsRef = useRef(new Map<string, ChatParticipant>());
  const pendingAiRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const data = await fetchChatMessages();
      if (!mountedRef.current) return;
      setMessages(data);
      setError(null);
    } catch (loadError) {
      if (!silent && mountedRef.current) {
        setError(friendlyChatError(loadError));
      }
    } finally {
      if (!silent && mountedRef.current) setLoading(false);
    }
  }, []);

  const loadParticipants = useCallback(async () => {
    try {
      const data = await fetchChatParticipants();
      if (mountedRef.current) setParticipants(data);
    } catch {
      // Mention autocomplete still works for @ai even if the member directory
      // is temporarily unavailable.
    }
  }, []);

  const participantsById = useMemo(
    () => new Map(participants.map((participant) => [participant.id, participant])),
    [participants]
  );

  useEffect(() => {
    participantsRef.current = participantsById;
  }, [participantsById]);

  const enrichMessage = useCallback((message: ChatMessage): ChatMessage => {
    if (!message.author_id) return message;

    const participant = participantsRef.current.get(message.author_id);
    if (!participant) return message;

    const currentAuthor = message.author;
    if (
      currentAuthor &&
      currentAuthor.username === participant.username &&
      currentAuthor.full_name === participant.full_name &&
      currentAuthor.role === participant.role
    ) {
      return message;
    }

    return {
      ...message,
      author: {
        id: participant.id,
        username: participant.username,
        full_name: participant.full_name,
        role: participant.role,
      },
    };
  }, []);

  useEffect(() => {
    setMessages((current) => {
      let changed = false;
      const next = current.map((message) => {
        const enriched = enrichMessage(message);
        if (enriched !== message) changed = true;
        return enriched;
      });

      return changed ? next : current;
    });
  }, [participantsById, enrichMessage]);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setParticipants([]);
      setOnlineUsers([]);
      setLoading(false);
      return;
    }

    void loadMessages();
    void loadParticipants();
  }, [user?.id, loadMessages, loadParticipants]);

  const loadMessagesRef = useRef(loadMessages);
  useEffect(() => {
    loadMessagesRef.current = loadMessages;
  }, [loadMessages]);

  const finishAI = useCallback((messageId: string) => {
    if (pendingAiRef.current !== messageId) return;
    pendingAiRef.current = null;
    setAiPendingMessageId(null);
  }, []);

  const triggerAI = useCallback(
    (messageId: string) => {
      pendingAiRef.current = messageId;
      setAiPendingMessageId(messageId);
      setAiError(null);

      void requestChatAIReply(messageId)
        .then((reply) => {
          if (!mountedRef.current) return;
          setMessages((current) =>
            mergeMessage(current, enrichMessage(reply))
          );
          finishAI(messageId);
        })
        .catch((replyError) => {
          if (!mountedRef.current || pendingAiRef.current !== messageId) return;

          pendingAiRef.current = null;
          setAiPendingMessageId(null);
          setAiError({
            messageId,
            text:
              replyError instanceof Error
                ? replyError.message
                : 'TEMAN AI gagal menjawab. Coba lagi.',
          });
        });
    },
    [enrichMessage, finishAI]
  );

  useEffect(() => {
    if (!user || !supabase) return;

    const client = supabase;
    const userId = user.id;

    const channel = client.channel('global-chat-room', {
      config: { presence: { key: userId } },
    });

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const row = payload.new as ChatMessage;
          if (!row?.id) return;

          setMessages((current) => mergeMessage(current, enrichMessage(row)));

          if (row.is_ai && row.reply_to_id) {
            finishAI(row.reply_to_id);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const row = payload.new as ChatMessage;
          if (!row?.id) return;
          setMessages((current) => mergeMessage(current, enrichMessage(row)));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const removed = payload.old as { id?: string } | null;
          if (!removed?.id) return;

          setMessages((current) =>
            current.filter((message) => message.id !== removed.id)
          );
          if (pendingAiRef.current === removed.id) {
            pendingAiRef.current = null;
            setAiPendingMessageId(null);
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<OnlineChatUser>();
        const unique = new Map<string, OnlineChatUser>();

        for (const entries of Object.values(state)) {
          for (const entry of entries) {
            if (entry?.user_id && !unique.has(entry.user_id)) {
              unique.set(entry.user_id, entry);
            }
          }
        }

        setOnlineUsers([...unique.values()]);
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;

        void channel.track({
          user_id: userId,
          full_name: profile?.full_name ?? 'Anggota',
          username: profile?.username ?? '',
          role: role ?? null,
          online_at: new Date().toISOString(),
        });
      });

    const pollId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadMessagesRef.current(true);
      }
    }, 30_000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadMessagesRef.current(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(pollId);
      document.removeEventListener('visibilitychange', handleVisibility);
      setOnlineUsers([]);
      void client.removeChannel(channel);
    };
  }, [
    user?.id,
    profile?.full_name,
    profile?.username,
    role,
    enrichMessage,
    finishAI,
  ]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user) throw new Error('Sesi login tidak valid.');

      const trimmed = content.trim();
      if (!trimmed) return;

      setSending(true);
      setSendError(null);

      try {
        const message = await sendChatMessageService(user.id, trimmed);
        if (!mountedRef.current) return;

        const enriched =
          message.author || !profile
            ? message
            : {
                ...message,
                author: {
                  id: profile.id,
                  username: profile.username,
                  full_name: profile.full_name,
                  role,
                },
              };

        setMessages((current) => mergeMessage(current, enriched));

        void notifyChatMentions(message.id);

        if (hasAiMention(trimmed)) {
          triggerAI(message.id);
        }
      } catch (sendFailure) {
        const message = friendlyChatError(sendFailure);
        if (mountedRef.current) setSendError(message);
        throw new Error(message);
      } finally {
        if (mountedRef.current) setSending(false);
      }
    },
    [user, profile, role, triggerAI]
  );

  const editMessage = useCallback(
    async (id: string, content: string) => {
      const updated = await editChatMessageService(id, content);
      if (mountedRef.current) {
        setMessages((current) => mergeMessage(current, enrichMessage(updated)));
      }
    },
    [enrichMessage]
  );

  const deleteMessage = useCallback(
    async (id: string) => {
      await deleteChatMessageService(id);
      if (!mountedRef.current) return;

      setMessages((current) =>
        current.filter(
          (message) => message.id !== id && message.reply_to_id !== id
        )
      );

      if (pendingAiRef.current === id) {
        pendingAiRef.current = null;
        setAiPendingMessageId(null);
      }
      setAiError((current) => (current?.messageId === id ? null : current));
    },
    []
  );

  const retryAI = useCallback(
    (messageId: string) => {
      if (pendingAiRef.current) return;
      triggerAI(messageId);
    },
    [triggerAI]
  );

  const refresh = useCallback(async () => {
    await Promise.all([loadMessages(), loadParticipants()]);
  }, [loadMessages, loadParticipants]);

  const clearSendError = useCallback(() => setSendError(null), []);
  const clearAIError = useCallback(() => setAiError(null), []);

  return {
    messages,
    participants,
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
  };
}
