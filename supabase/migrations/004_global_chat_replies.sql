-- TEMAN — Global Chat human replies
-- Review this migration before running it in Supabase SQL Editor.
--
-- The reply_to_id column already exists from 002_global_chat.sql and its
-- foreign key already allows human messages to quote other messages. This
-- migration only documents that behaviour and adds the supporting index used
-- when a parent message is deleted (ON DELETE CASCADE).

create index if not exists chat_messages_reply_to_id_idx
  on public.chat_messages (reply_to_id)
  where reply_to_id is not null;

comment on column public.chat_messages.reply_to_id is
  'Message being replied to. Human messages may quote any message; AI messages always quote the user message that mentioned @ai.';

notify pgrst, 'reload schema';
