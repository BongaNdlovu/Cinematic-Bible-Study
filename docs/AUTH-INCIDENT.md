# Sign-in incident

One page for the operator. Do not paste keys, emails, or session tokens into chat, issues, or the event table.

## What is already true

- Password checks go to Supabase Auth. The page counter never sees them.
- The sign-in cap is a Supabase dashboard setting, counted per address. A spread-out run from many addresses is outside that cap.
- The page counter is one store per address. Ordinary pages share 240 reads a minute. `/account` shares 30. A missing counter still serves a page read and refuses a non-GET request.
- `exhibit_events` can record `auth_failed` with a coarse reason: `credentials`, `confirm`, `rate`, or `other`. It does not store the address or the email. A direct call to `/auth/v1/token` never writes that row. Anonymous inserts can add rows inside the write cap, so the table is a hint, not a verdict.
- A custom domain in front of the Supabase host is what would let the same bot rules cover password checks. Do not invent that domain here.

## Revoke sessions

1. Open the Supabase dashboard for this project, Authentication, Users.
2. Open the account. Sign out every session.
3. If the account is the operator account, sign in again with Google and the authenticator app before using the message desk.

## Block an address

1. Cloudflare dashboard, this Pages project, Security.
2. Add a block for the address that is flooding the site.
3. That block covers the Pages host. It does not cover `*.supabase.co` until a custom domain sits in front of Supabase.

## Rotate the publishable key

1. Supabase dashboard, Project Settings, API Keys. Create a new publishable key and revoke the old one.
2. Put the new key in `js/shared/auth-config.js` and in the Pages environment if a copy is stored there.
3. Deploy. Until that deploy, the site cannot sign anyone in.
4. Do not commit the service-role key. It does not belong in the browser.

## Watch

- Cloudflare notifications: the project’s notification list, for traffic that looks like an application flood.
- Supabase Authentication, Logs: look for jumps in `auth_failed` and rate-limit results. Drain or review them on a schedule. The Free plan does not keep a long log.
- CSP reports arrive at `/csp-report`. The stored reason is the directive name only.

## Checked on 18 Oct 2026

- Sign-ups and sign-ins are 5 requests per 5 minutes per address. Token refresh is 150 per 5 minutes.
- New passwords must be at least 12 characters. An existing shorter password can still sign in.
- Leaked-password rejection says Pro plan and above. It is off.
- `public.hook_password_verification_attempt` exists and the API roles cannot call it. Auth Hooks says Team or Enterprise is required, so the hook is not enabled. A spread-out guessing run is still outside the per-address cap.
- The operator identity is Google, with a confirmed email, and no verified authenticator yet. Operator tools now require that Google identity. After an authenticator is verified, those tools also require the second step. Enroll it from the account page after the next deploy. The account page shows the secret as text and clears it after the code is accepted.
- Captcha is on (Turnstile). The site key is in `js/shared/auth-config.js`. The secret stays only in Supabase, Authentication, Attack Protection.
- Cloudflare flood notifications were not changed from this session. Add them in the Cloudflare dashboard for this Pages project if they are not already on.
