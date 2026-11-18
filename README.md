# Portfolio

Vite + React + TypeScript designer portfolio with a single shared WebGL canvas
(three.js via @react-three/fiber and drei). Layout follows andyorsow.com:
sticky logo/menu bar, about intro, long-form story, full-width work rows with
media on the right, and a contact form.

```sh
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Where things live

- `src/data/site.ts` holds all copy and the work list. Edit this first.
- `src/webgl/WebGLStage.tsx` mounts one fixed canvas behind the page.
- `src/webgl/GLSlot.tsx` is a media slot. Each one renders a drei `<View>`
  that scissors the shared canvas to its rectangle.
- `src/webgl/scenes.tsx` has the backdrop shader and the per-card scenes.
  Add a scene there and reference it from `site.ts`.

The canvas sits behind the DOM, so slots are transparent windows onto it.
Rounded corners are faked with a ring of page colour in `.gl-slot::after`.
Keep anything that overlaps a slot opaque.

## Next steps

- Swap placeholder copy and links in `src/data/site.ts`.
- Replace scenes with project media, e.g. drei `useVideoTexture` on a plane.
- Hook the contact form up to a backend (it only shows a thank-you today).
- Code-split three.js if first-load size matters (the bundle is about 330 kB gzipped).

## Case-study access (Vercel functions + Resend)

The carousel is public; each case study asks for an email first. Code lives in `api/` (Vercel
functions) and `src/lib/access.ts`. Plain `npm run dev` has no API and treats everyone as approved;
use `vercel dev` to try the real gate.

Set these in Vercel (Project → Settings → Environment Variables), for Preview and Production:

| Variable | What it is |
| --- | --- |
| `RESEND_API_KEY` | Resend API key with full access (it reads audiences and sent/received mail) |
| `RESEND_FROM` | Sender, e.g. `Mark Boyes-Smith <mark@mail.boyes-smith.com>`, on a domain verified in Resend |
| `RESEND_REPLY_TO` | Optional. Where visitor replies go (a Resend inbound address so they show on /admin) |
| `RESEND_REQUESTS_AUDIENCE_ID` | Resend audience holding everyone who asked |
| `RESEND_ACCESS_AUDIENCE_ID` | Resend audience holding everyone approved |
| `ADMIN_EMAIL` | Where request emails and /admin sign-in links go |
| `ACCESS_SECRET` | Long random string that signs links and cookies. Changing it signs everyone out |

Flow: a visitor enters their email → Mark gets an email with an Approve button (it opens a confirm
page, so mail scanners can't approve by prefetching) → the visitor gets a sign-in link → a year-long
cookie. `/admin` lists requests, approves or revokes, and shows each email thread.
