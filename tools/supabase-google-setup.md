# Google sign-in (static site, not Next.js)

This exhibit is static HTML. Do not install `@supabase/ssr` or add `page.tsx` / Next middleware. The browser client in `js/shared/auth.js` uses vendored `@supabase/supabase-js` 2.116.0.

## Google Cloud

1. APIs & Services → Credentials → Create **OAuth client ID** → Web application.
2. Authorized JavaScript origins:
   - `http://127.0.0.1:8000`
   - `http://127.0.0.1:8003`
   - `https://cinematic-bible-study-daniel.pages.dev`
3. Authorized redirect URI:
   - `https://ttlrspnfadmxkoyqvofh.supabase.co/auth/v1/callback`
4. Copy the Client ID (ends in `.apps.googleusercontent.com`) and Client secret. Do not paste a Gmail address.

## Supabase

1. Authentication → Providers → Google: enable, paste Client ID and Client secret.
2. Authentication → URL Configuration:
   - Site URL: `https://cinematic-bible-study-daniel.pages.dev`
   - Redirect URLs (wildcards cover `/index.html` and `/study.html`):
     - `http://127.0.0.1:8000/**`
     - `http://127.0.0.1:8003/**`
     - `https://cinematic-bible-study-daniel.pages.dev/**`

The publishable key lives in `js/shared/auth-config.js` (the static host does not inject `.env.local`). Sessions persist in the browser so a returning student should not have to sign in again.

## Home-page reviews

Run `tools/supabase-reviews.sql` once in the Supabase SQL editor so the Witnesses band can store moderated testimonies. Moderators are rows in `public.exhibit_moderators`, which the file creates empty and locked. Add the operator once in the SQL editor (`insert into public.exhibit_moderators (email) values ('you@example.com');`) and do not commit that line. The page never carries the address: `js/shared/auth.js` asks the database through `is_review_moderator()`.
