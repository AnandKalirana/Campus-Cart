# Email setup (Brevo, free plan)

Campus Cart sends verification, password-reset and account-deleted emails. In production it refuses to run with the default `log` driver, so a real provider is required before launch.

## Why Brevo first
- **Brevo free plan: 300 emails per day.** Fine for a campus launch. You can start by verifying a single sender address; you do not need to own a domain on day one. (Dashboard wording changes, so confirm the sender step in your account.)
- **Resend** is also supported (`MAIL_DRIVER=resend`) but, per [Resend's docs](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain), until you verify your own domain it can only deliver to your own account's address. Use it once you own a domain.

## Steps
1. Create a free account at brevo.com.
2. **Add a sender.** Settings, then *Senders, Domains & Dedicated IPs*, then *Senders*, then add a sender with the name `Campus Cart` and an address **you can receive mail at**. Brevo emails that address a code or link; confirm it. Until this is done, sends are rejected.
3. **Create an API key.** *SMTP & API*, then *API Keys*, then generate a key named `campus-cart-prod`. It is shown once; copy it now.
4. Put these in `.env.local` (never commit that file):
   ```
   MAIL_DRIVER="brevo"
   MAIL_FROM="Campus Cart <the-address-you-verified>"
   BREVO_API_KEY="xkeysib-..."
   ```
5. **Prove delivery from your machine:**
   ```
   npm run mail:test -- you@gmail.com
   ```
   "The provider accepted the message" means Brevo took it. It is **not** proof of delivery: open the inbox and check spam too.
6. **Test the real flows** locally with the same env: register with a campus-domain address, click the verification link, then try Forgot password.
7. **Vercel:** add the same three variables for Production (Settings, Environment Variables), then redeploy. Run the signup flow once on the live site.

## Known cautions
- **Spam placement.** If `MAIL_FROM` is a free-mail address (Gmail, Outlook), receiving servers may junk or reject it because it is sent by a third party. Fine for testing. Before a real launch, use an address on a domain you own and add the SPF, DKIM and DMARC records Brevo shows you.
- **401 from Vercel but fine locally:** Brevo can restrict API keys to authorised IP addresses. Vercel's outbound IPs are not fixed, so check *Security, Authorised IPs* in Brevo and do not restrict the key to your home IP.
- **Limits.** 300/day shared across verification, resets and deletion notices. Signup and reset are already rate limited per IP and per email (see `docs/RATE_LIMITING.md`), which also protects this quota.
- **Free plan branding.** Brevo may add its own footer to messages on the free plan; check a received email.
- **A leaked key:** delete it in Brevo, create a new one, update `.env.local` and Vercel, redeploy.

## What the app guarantees
- Sign-up and password reset answer identically whether or not an email could be sent (no account enumeration). Failures are logged as `mail_failed` with the HTTP status only, never the key or the address.
- One 8-second attempt plus one retry on network errors, 429 and 5xx. No retry loops.
- Header-injection checks on recipient and subject; bodies capped at 20,000 characters.

## Troubleshooting `npm run mail:test`
| Output | Meaning |
|---|---|
| `BREVO_API_KEY: NOT SET` | Not in `.env.local`, or the file is in a different folder |
| `MAIL_FROM is missing or not a valid address` | Use the form `Campus Cart <you@example.com>` |
| `Mail provider responded 401` | Wrong key, or the key is IP-restricted |
| `Mail provider responded 400` | Usually the sender address is not verified yet |
| `unreachable or timed out` | Network blocks the provider (try a hotspot) |

## Status
Drivers are unit-tested against a fake provider and `mail:test` is exercised for its failure paths. **No real email has been sent by this project yet**; that is what step 5 is for.
