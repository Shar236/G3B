# Student portal and counselling enquiries

The student portal uses the existing Express API and MySQL database. No additional service or environment variable is required.

Apply the additive schema migration before starting a deployed API:

```sh
npm run migrate --prefix server
```

For local development, run the existing API and Vite client in separate terminals:

```sh
npm run dev --prefix server
npm run dev --prefix client
```

The student routes are `/student/register`, `/student/login`, and `/student/dashboard`. The dashboard displays the signed-in student's profile and genuine counselling enquiries submitted while signed in. It does not display assessment results or application progress because those features are not implemented. Historical anonymous enquiries are not linked by email; account registration does not verify ownership of historical contact details.

Student identities live in `students`, separate from administrator `users`. Seven-day opaque sessions are hashed in `student_sessions`, checked on the server for every private request, and revoked at logout. Student cookies and CSRF tokens use a separate namespace from administrator authentication. Student accounts cannot access administrator endpoints.

The public counselling form remains available without an account. When signed in, enquiries are linked to the authenticated student ID on the server; client-supplied owner IDs are ignored. Optional preferred contact dates and time windows are requests in Indian Standard Time. They are stored in `enquiries`, shown in the CRM enquiry detail and student dashboard, and included in the existing staff and visitor notifications. A submitted enquiry does not confirm an appointment. Existing mail settings and notification retry behavior are preserved.

Private student HTML and API responses are marked `no-store`; student pages also use `noindex,nofollow,noarchive`. Existing production cookie settings (`COOKIE_SECURE`, `COOKIE_SAMESITE`) and allowed client origins continue to apply. Keep both frontend and backend on compatible HTTPS origins when deploying.

Targeted checks:

```sh
npm test --prefix server -- --run tests/student.test.js
node --test --test-concurrency=1 --test-name-pattern "student|booking saves" client/tests/public-interactions.test.mjs
```

The backend tests use two temporary student accounts in the configured database, mock notification delivery, verify account separation, enquiry ownership, CSRF, password hashing, duplicate submissions, login and logout, and remove their own temporary records. Database tests are explicitly skipped if MySQL is unavailable. The frontend checks cover private-route redirects, registration, empty and populated dashboards, session expiry, logout, and booking preferences.
