# Lodgora

Housekeeping and maintenance for hotels. React + Vite + Tailwind + Supabase.

## Website and app
`/` is the public website. The app is at `/app`. `/app?demo` (or `/?demo`) opens the demo.
The website's contact email is `contact@lodgora.eu` (set in `src/lib/site.js`). The optional variable `VITE_CONTACT_EMAIL` overrides it. Prices and plans are in `src/lib/site.js`.

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

## Password recovery (managers)

The "Forgot your password?" link on the Manager sign in sends an email through Supabase. For the link in that email to work:

1. In Supabase open **Authentication → URL Configuration**.
2. Set **Site URL** to your website address (for example `https://lodgora.pages.dev`).
3. Under **Redirect URLs** add `https://lodgora.pages.dev/app` (and the same with your own domain later).

Supabase's built-in email service only sends a few emails per hour. Before you have many clients, set up your own email sender under **Authentication → SMTP Settings**.

## Who can create a hotel (invitation codes)

Nobody can create a hotel account without an invitation code that you give them.

1. In Supabase open the **SQL Editor** and run `select public.new_invite('Hotel Aurora');` (change the name).
2. Send the code it returns (like `A1B2C-D3E4F`) to the hotel. They use it once, in **Manager → Create hotel account**.
3. To see your hotels, or to pause one that does not pay, use the commands in `supabase/admin.sql`.

A paused hotel (`active = false`) cannot sign in, neither the manager nor the housekeepers. The data stays safe and everything comes back when you set `active = true` again.

## Planner (planning cleaning ahead)
Managers open **Planner** to choose, for each of the next 7 days, which rooms and areas get cleaned and by whom. Each day the plan goes onto the team's lists by itself the first time the manager or a housekeeper opens the app. Run `supabase/update-5.sql` once (after update-4) to add it.

## Maintenance team
In **Team**, add maintenance people next to the housekeepers. In **Maintenance**, each open issue has an "Assigned to" choice. Maintenance people sign in with the hotel code, username and PIN like housekeepers, and only see the issues given to them. Rooms can only be assigned to housekeepers. Run `supabase/update-6.sql` once (after update-5) to add it.

## Notes on issues
Maintenance people can write a note to the manager on each issue, or press "I can't fix this" (the manager sees a red "Needs help" tag on the Maintenance page and the Dashboard). The manager replies with a note, which clears the tag. Run `supabase/update-7.sql` once (after update-6) to add it.
