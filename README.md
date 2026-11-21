# TEMAN — Team Management

## Run Locally

**Prerequisites:** Node.js and npm

1. Copy `.env.example` to `.env` and set the Supabase URL and publishable/anon key.
2. Install dependencies with `npm install`.
3. Run `npm run dev`.

## AI Data Assistant

The assistant sends only the user's question and a fixed schema/intent description to Gemini.
Gemini selects a supported query intent; the Edge Function executes corresponding
predefined, read-only Supabase queries with the caller's access token. It does not execute
AI-generated SQL, use a database password, or use a service-role key.

For local development, set these variables in the existing root `.env`:

```env
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash-lite
APP_URL=http://localhost:3000
```

The Edge Function reads these values when served with
`supabase functions serve ai-query --env-file .env`. `GEMINI_API_KEY` is intentionally
not prefixed with `VITE_`, so it is not exposed to browser code. For production, configure
it as a server-side Supabase secret and deploy:

```powershell
supabase secrets set GEMINI_API_KEY=your-key GEMINI_MODEL=gemini-3.5-flash-lite APP_URL=https://your-app.example
supabase functions deploy ai-query
```

`APP_URL` must be the exact deployed application origin. Localhost origins are allowed for
development. Supabase provides `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Edge Functions;
the browser only needs its existing public Supabase configuration. Never add the Gemini
key to a `VITE_*` variable or commit it to the repository.

The assistant's prompt, supported query intents, Gemini model, and safe database operations
are configured in `supabase/functions/ai-query/index.ts`. The floating button and its dialog
UI are in `src/components/shared/AIQueryAssistant.tsx`.

## Global Chat

Global Chat is one persistent public room for every active workspace member (`/chat`).
It supports `@username` mentions, in-app mention notifications, WIB timestamps, editing
your own messages, and Owner moderation. Messages are stored in Supabase and synchronized
with Realtime; the page also polls every 30 seconds while visible as a fallback.

### Database setup (required once)

Review and run `supabase/migrations/002_global_chat.sql` in the Supabase SQL Editor. It
creates `public.chat_messages`, the `is_valid_chat_ai_reply` guard used by RLS, the
`notify_chat_mentions` helper that creates in-app mention notifications from stored messages,
indexes, RLS policies, and adds the table to the `supabase_realtime` publication. This repository
does not apply migrations automatically.

### AI mentions with Gemini

Writing `@ai` or `@teman` in a message lets the author ask TEMAN AI. The browser calls the
`chat-ai` Edge Function with the user's session; the function validates that the caller
authored the message, loads workspace context and recent chat history, calls Gemini, and
persists one AI reply. Workspace analytics are routed to `ai-query`, which only executes
predefined read-only queries using the caller's access. It does not execute generated SQL.

For local development, add these server-side values to the root `.env`:

```env
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash-lite
APP_URL=http://localhost:3000
```

Serve `chat-ai` locally (and `ai-query` as well if you want NL2SQL analytics) and deploy
both functions:

```powershell
# Terminal 1
supabase functions serve chat-ai --env-file .env
# Terminal 2, required for workspace analytics
supabase functions serve ai-query --env-file .env
# Production deployment
supabase secrets set GEMINI_API_KEY=your-key GEMINI_MODEL=gemini-3.5-flash-lite APP_URL=https://your-app.example
supabase functions deploy ai-query
supabase functions deploy chat-ai
```

`GEMINI_API_KEY` must not use a `VITE_` prefix and must never be committed. The
`002_global_chat.sql` migration and `chat-ai` Edge Function must be deployed. Without
`ai-query`, ordinary Gemini chat still works but workspace analytics are unavailable.
