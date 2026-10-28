# G3B Education — Full-Stack Website

The G3B Education website rebuilt as a production-ready full-stack application:
a **React + Vite** single-page front end and an **Express + Supabase PostgreSQL** REST API with a
secure admin dashboard.

All brand assets, copy, imagery, sections and external links were ported
from the original legacy WordPress theme.
Nothing was invented: reviews, certifications, statistics and partner names come
verbatim from the original design.

---

## 1. Project structure

```
G3b/
├── client/                      React 19 + Vite 8 front end
│   ├── public/                  favicon, robots.txt, sitemap.xml
│   └── src/
│       ├── api/                 axios client + content/admin endpoint wrappers
│       ├── components/          Header, Footer, Hero, About, Gallery, Services,
│       │                        Destinations, Reviews, VideoTestimonials,
│       │                        Process, CareerCta, ContactForm
│       │   ├── layout/          PublicLayout (shared homepage data + chrome)
│       │   └── ui/              StateBlock, Modal
│       ├── context/             AuthContext (session + login/logout)
│       ├── hooks/               useHomeContent, useDocumentMeta
│       ├── pages/
│       │   ├── Home.jsx         the public homepage
│       │   ├── NotFound.jsx     404 page
│       │   └── admin/           login, layout, dashboard, enquiries, CRUD screens
│       └── styles/theme.css     the original design system, ported 1:1
│
├── server/                      Express 4 + Supabase PostgreSQL API
│   ├── src/
│   │   ├── config/              env validation + PostgreSQL pool
│   │   ├── controllers/         business logic per route group
│   │   ├── db/                  migrations, seed data, admin CLI
│   │   ├── middleware/          auth/CSRF, validation, uploads, rate limits, errors
│   │   ├── repositories/        SQL layer (camelCase mapping)
│   │   ├── routes/              public + admin routers
│   │   ├── services/            mailer + notification queue
│   │   ├── utils/               ApiError, asyncHandler, logger, CSV
│   │   └── validators/          express-validator rule sets
│   └── tests/                   Vitest + Supertest suites
└── package.json                 root convenience scripts
```

---

## 2. Prerequisites

| Requirement | Version used |
| --- | --- |
| Node.js | 24.x (Vercel runtime) |
| Supabase PostgreSQL | hosted project |
| MySQL | 8.0 (migration source only) |
| npm | 9+ |

---

## 3. Setup

### 3.1 Install dependencies

```bash
npm run install:all
# or individually: npm install --prefix server && npm install --prefix client
```

### 3.2 Prepare Supabase

Create an empty Supabase project and follow the guarded migration runbook in
[`docs/SUPABASE_MIGRATION.md`](./docs/SUPABASE_MIGRATION.md). Do not paste a
database password or service-role key into the frontend.

### 3.3 Configure the API

Copy [`server/.env.example`](./server/.env.example) to `server/.env` and fill in real
values. At minimum set the server-only `DATABASE_URL` and a long random `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`server/src/config/env.js` validates the environment at startup: missing
`JWT_SECRET` or PostgreSQL connection details are a hard failure in production and a
warning in development.

### 3.4 Import and verify the existing database

```bash
npm run migrate:supabase
npm run verify:supabase
```

`npm run db:setup` runs the guarded import. Existing users and IDs are preserved.
Create additional admins any time after import:

```bash
npm run create-admin -- --name "Jane Doe" --email jane@example.com --password "S3curePass!" --role admin
```

### 3.5 Run in development

```bash
npm run dev                 # API on :5000 and Vite on :5173 together
# or separately
npm run dev:api
npm run dev:web
```

Open <http://localhost:5173>. The admin dashboard lives at
<http://localhost:5173/admin>.

> Vite proxies `/api` and `/uploads` to `http://localhost:5000`
> (see [`client/vite.config.js`](./client/vite.config.js)), so no client env
> variable is needed in development.

---

## 4. Content management (admin dashboard)

Sign in at `/admin/login`. The dashboard provides:

| Screen | Capability |
| --- | --- |
| Dashboard | Enquiry counts per status, last 7 days, five most recent submissions |
| Enquiries | Search, status filter, pagination, CSV export, delete with confirmation |
| Enquiry detail | Full record, status update, staff assignment, delete |
| Services / Destinations | Create, edit, delete — including feature bullets and highlight points |
| Gallery | Upload / link images, reorder, delete |
| Testimonials | Google reviews and written testimonials, source links, ordering |
| Video testimonials | YouTube entries with orientation, ordering |
| Process steps / Statistics / Why-choose / Certifications / Enquiry options / Social links | Full CRUD with ordering |
| Homepage content | Edit the heading, description and CTA of every homepage section |
| Site settings | Contact details, working hours, Google review links, SEO metadata |
| Users & roles | Create, edit, disable and delete administrator/staff accounts |

Every permission is enforced **on the server** (`requireAuth` + `requireRole('admin')`);
the UI merely mirrors those rules.

---

## 5. API reference

All responses use the envelope `{ "success": true, "data": … }`; list endpoints add
`"pagination": { page, perPage, total, totalPages }`. Errors return
`{ "success": false, "error": "message" }` and validation failures add
`"details": { field: message }` with HTTP 422.

### Public

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Liveness + database status |
| GET | `/api/home` | Aggregated homepage payload (content, settings, all collections) |
| GET | `/api/services` | Active services with feature bullets |
| GET | `/api/destinations` | Active destinations with highlight points |
| GET | `/api/gallery` | Active gallery images |
| GET | `/api/testimonials` | Active written/Google reviews |
| GET | `/api/videos` | Active video testimonials |
| GET | `/api/process-steps` | Active process steps |
| GET | `/api/stats` | Active hero statistics |
| GET | `/api/why-features` | Active "why choose" features |
| GET | `/api/certifications` | Active certification images |
| GET | `/api/enquiry-options` | Options for the enquiry form dropdown |
| GET | `/api/social-links` | Footer social profiles |
| GET | `/api/site-settings` | Flat key/value settings map |
| GET | `/api/content-blocks` | Editable section copy, keyed by block |
| POST | `/api/enquiries` | Submit an enquiry (validated, rate limited, deduplicated) |

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/login` | Sign in; sets the `g3b_token` (httpOnly) and `g3b_csrf` cookies |
| POST | `/api/auth/logout` | Clear the session cookies |
| GET | `/api/auth/me` | Current user (or `null`) plus a CSRF token |

### Admin (requires an authenticated administrator)

State-changing admin requests must echo the `g3b_csrf` cookie value in the
`X-CSRF-Token` header (handled automatically by `client/src/api/client.js`).

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/admin/enquiries` | Paginated list (`page`, `perPage`, `status`, `search`, `assignedTo`) |
| GET | `/api/admin/enquiries/stats` | Status counts, last-7-day count, recent items, assignees |
| GET | `/api/admin/enquiries/export` | CSV export of the filtered list |
| GET | `/api/admin/enquiries/:id` | Single enquiry |
| PATCH | `/api/admin/enquiries/:id` | Update status / assignment / details |
| DELETE | `/api/admin/enquiries/:id` | Delete an enquiry |
| GET / POST | `/api/admin/users` | List / create users |
| PATCH / DELETE | `/api/admin/users/:id` | Update / delete a user |
| PATCH | `/api/admin/site-settings` | Upsert a map of settings |
| DELETE | `/api/admin/site-settings/:key` | Remove a setting |
| PATCH | `/api/admin/content-blocks/:key` | Update a homepage content block |
| POST | `/api/admin/uploads` | Upload an image (multipart field `image`) |
| POST | `/api/admin/notifications/retry` | Flush queued email notifications |
| GET / POST | `/api/admin/:resource` | List / create a content resource |
| PATCH / DELETE | `/api/admin/:resource/:id` | Update / delete a content resource |
| PATCH | `/api/admin/:resource/reorder` | Reorder via `{ "ids": [ … ] }` |

`:resource` is one of `services`, `destinations`, `gallery`, `testimonials`,
`videos`, `process-steps`, `stats`, `why-features`, `certifications`,
`enquiry-options`, `social-links`.

---

## 6. Enquiry workflow

1. The form validates on the client **and** again on the server
   (`express-validator`, `422` + per-field messages).
2. Recent duplicates (same email + phone within two minutes) are rejected with `409`.
3. The record is written to PostgreSQL; **success is shown only after the insert succeeds**.
4. The administrator is emailed and the visitor receives an optional confirmation.
5. If email delivery fails *after* the row was saved, the enquiry is **never lost** —
   the notification is queued in `enquiry_notifications` and retried through
   `POST /api/admin/notifications/retry`.
6. Recoverable errors keep the visitor's answers in the form.

---

## 7. Security

- JWT session in an **httpOnly** cookie; readable CSRF cookie for double-submit checks
- `helmet` security headers, strict CORS allow-list (`CLIENT_ORIGINS`)
- Three rate limiters: global, enquiry submission, and login
- `bcrypt` (cost 12) password hashing; the last active administrator cannot be deleted, demoted or disabled
- Parameterised SQL everywhere; validated and sanitised input; upload MIME/size limits
- Centralised error handling that maps PostgreSQL errors to safe HTTP responses
- Structured JSON request/error logging

---

## 8. SEO, accessibility and performance

- Per-route `<title>`, meta description, keywords, canonical URL and Open Graph/Twitter
  tags via `useDocumentMeta`
- `/robots.txt` and `/sitemap.xml` served from `client/public`
- Semantic landmarks, skip-to-content link, labelled form fields, keyboard-navigable
  sliders and modals, `aria-*` state, focus-visible styling
- Descriptive `alt` text, `loading="lazy"` on below-the-fold imagery, responsive CSS grid
- A 404 route for unknown pages; the API returns JSON 404/500 handlers
- One aggregated `/api/home` request instead of a dozen round trips

---

## 9. Testing

```bash
npm test                        # Vitest + Supertest (server)
npm run test --prefix server    # same, from the server folder
npm run lint                    # ESLint (client)
npm run build                   # production build of the client
```

The API suite covers the health endpoint, root ping, 404 handling, enquiry
validation (including malformed emails), anonymous access denial on every admin
route group, and — when a database is reachable — homepage content, enquiry
persistence, duplicate rejection and admin login. Database-backed tests skip
themselves automatically when PostgreSQL is unavailable.

---

## 10. Production build and deployment

```bash
npm run build          # outputs client/dist
NODE_ENV=production npm start   # Express serves the API
```

Deploy **two Vercel projects** from the existing repository: `g3-b` uses Root
Directory `client` (Vite), and `g3b-backend` uses `server` (Other preset, explicit
Node serverless entry exporting the existing Express app). The nested
`client/vercel.json` and `server/vercel.json` are the active configurations.
Browser API requests remain same-origin through the frontend proxy.

Follow [the two-project production runbook](docs/VERCEL_TWO_PROJECTS.md)
for dashboard settings, private environment variables, the required database CA,
upload prerequisites, validation results, and PowerShell deployment commands.
Existing uploads must be inventoried and migrated separately before cutover;
credentials, buckets, and end-to-end Storage delivery still require verification.

---

## 11. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `Access denied for user …` | `DB_USER` / `DB_PASSWORD` wrong in `server/.env` |
| `/api/health` returns `503` | Supabase PostgreSQL is unreachable — check `DATABASE_URL` and project status |
| Homepage shows "We could not load the website content" | The API is down or `/api/home` failed; check the API logs |
| 401 on admin actions after login | Cookies blocked — use the same origin, or check `CLIENT_ORIGINS` / `COOKIE_SECURE` |
| 403 "Invalid or missing CSRF token" | The `X-CSRF-Token` header is missing; the bundled axios client adds it automatically |
| Images uploaded locally do not display | Confirm `/uploads` is proxied or `VITE_API_URL` is set correctly |

---

## 12. Supplied-source fidelity

The following were intentionally preserved from
the original theme: the navy/amber design tokens,
sticky header and footer, hero copy and CTAs, the founder profile and three
certifications, the ten gallery images, the six services with their bullet lists,
the six study destinations with their five points each, the six Google reviews with
the 5.0 / 38-review score card, the two video testimonials, the five process steps,
the career-mentor call to action, the office contact details, and the external
career-mentor, Google Business Profile and YouTube URLs — all unmodified.
## 13. Discovery pathways and lead operations

The homepage and services page include Grade 9–12, university applicant,
school workshop and working professional pathways. The three-question finder
prefills the existing consultation modal; submissions persist the career stage,
target degree, destination, source and landing page with the enquiry.

The knowledge hub saves explicitly consented newsletter and guide subscriptions.
The free two-page guide is served from
`client/public/resources/g3b-global-education-guide.pdf`. A successful guide
subscription reveals the download link. Newsletter unsubscribe links open
`/unsubscribe`; SMTP must be configured to deliver welcome emails. Subscriptions
and enquiries still save when SMTP is disabled.

Three full articles live at `/insights` and `/insights/:slug`. Edit their source
in `client/src/data/insights.js`; the production server uses the same content for
article rendering, metadata and sitemap entries. Immigration articles link to
official sources and include the date reviewed.
Deploy the full repository with `client/dist` for Express prerendering; the server
shares the article source from `client/src/data/insights.js`. Static-only hosting
renders the React pages but does not provide the Express crawler HTML.

Run `npm run migrate --prefix server` when upgrading another environment.
Migration 004 adds the subscriber, assessment and rotating-session schema without
reseeding existing data. The administration base remains configurable through
`VITE_ADMIN_ROUTE` (default `/manage-portal`). The new inboxes are
`/enquiries/school` and `/subscribers` under that base.

Roles retain the existing `admin` and `staff` values and add `counsellor` and
`editor`: administrators manage the full platform, staff/counsellors manage leads
and subscribers, and editors manage content/SEO/media. Deleting personal records
and managing system settings or credentials require the administrator role.
Both API authorization and client route/navigation guards enforce these scopes.

The Axios client uses HttpOnly session cookies, CSRF tokens, 15-second timeouts,
request IDs, single-flight refresh and at most two retries for eligible GET
requests. Writes do not retry automatically. Inbox updates provide optimistic
feedback with rollback; CSV exports use the active filters and neutralize formula
cells.

Additional verification:

```bash
npm test --prefix client        # transport/cache, content and UI interactions
npm test --prefix server        # API, auth, CRM and SEO regression tests
npm run build                  # production client build
```

Database integration tests create unique test records and remove them afterward.
The responsive additions are in `client/src/styles/discovery.css` and use the
existing G3B design tokens, Poppins/Inter typography and Lucide React icons.

## 14. YouTube Shorts synchronization

Video Testimonials now includes a paginated channel discovery registry, an
authorized synchronization action, scheduled API refresh and explicit Shorts
review. The public carousel retains category filters, arrows and pagination,
loads one active player, and handles YouTube playback failures with retry and
watch links. Existing testimonials are retained.

Configure the backend-only `YOUTUBE_API_KEY` to retrieve channel metadata. The
public API does not expose Shorts membership: use administrator confirmation,
or supply `YOUTUBE_SHORTS_PLAYLIST_ID` for a maintained playlist of confirmed
channel Shorts to publish future additions automatically. With no key, new URLs
can be registered pending verification but cannot be published.

See [YouTube Shorts setup and verification](docs/youtube-shorts.md) for migration
005, environment variables, quota, cache behavior and the admin workflow.
