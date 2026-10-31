# Lodgora

Housekeeping and maintenance for hotels. React + Vite + Tailwind + Supabase.

## Demo mode
If the two environment variables below are missing, the app runs with fake data stored in the browser.
Add `?demo` to the URL to force demo mode.

## Going live
1. Create a free project at supabase.com (choose an EU region).
2. Supabase > SQL Editor > New query: paste all of `supabase/schema.sql` and press Run (once).
3. Supabase > Project Settings > API: copy the Project URL and the `anon public` key. Never use the `service_role` key.
4. Cloudflare Pages > your project > Settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
5. Push to GitHub. Cloudflare rebuilds by itself.

## Local development
```
npm install
cp .env.example .env
npm run dev
```

## Updating an existing database
If you already ran `schema.sql` before, run `supabase/update-3.sql` once instead of running schema.sql again. It includes everything from update-2 and is safe to run more than once.
