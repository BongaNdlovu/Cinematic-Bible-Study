# Google sign-in (static site, not Next.js)

This exhibit is static HTML. Do not install `@supabase/ssr` or add `page.tsx` / Next middleware. The browser client in `js/shared/auth.js` uses vendored `@supabase/supabase-js` 2.116.0.

## Google Cloud

1. APIs & Services → Credentials → Create **OAuth client ID** → Web application.
2. Authorized JavaScript origins:
   - `http://127.0.0.1:8000`
   - `http://127.0.0.1:8003`
   - `https://cinematic-bible-study-daniel.vercel.app`
3. Authorized redirect URI:
   - `https://ttlrspnfadmxkoyqvofh.supabase.co/auth/v1/callback`
4. Copy the Client ID (ends in `.apps.googleusercontent.com`) and Client secret. Do not paste a Gmail address.

## Supabase

1. Authentication → Providers → Google: enable, paste Client ID and Client secret.
2. Authentication → URL Configuration:
   - Site URL: `https://cinematic-bible-study-daniel.vercel.app`
   - Redirect URLs (wildcards cover `/index.html` and `/study.html`):
     - `http://127.0.0.1:8000/**`
     - `http://127.0.0.1:8003/**`
     - `https://cinematic-bible-study-daniel.vercel.app/**`

The publishable key lives in `js/shared/auth-config.js` (Vercel does not inject `.env.local` into this static host). Sessions persist in the browser so a returning student should not have to sign in again.

## Home-page reviews

Run `tools/supabase-reviews.sql` once in the Supabase SQL editor so the Witnesses band can store moderated testimonies. Add your Google email to `is_review_moderator()` in that file and to `moderatorEmails` in `js/shared/auth-config.js`.
