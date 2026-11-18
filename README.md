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
