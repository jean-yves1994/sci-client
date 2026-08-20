# Audit of the existing application

Recorded before any change was made.

## Stack
| Layer | Technology |
|---|---|
| Backend | NestJS 10 + Prisma 5 + PostgreSQL |
| Web | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 3 (no component library) |
| Charts | **none present** |
| Theme | **light only — no dark mode** |
| Auth | JWT access token + rotating refresh cookie, permission-based RBAC |

## Existing routes (all preserved)
`/login`, `/dashboard`, `/inspections`, `/inspections/[id]`, `/reviews`,
`/properties`, `/reports`, `/users`, `/branches`, `/templates`, `/analytics`,
`/audit`, `/notifications`, `/profile`

## Existing API endpoints the web layer consumes (all reused, none replaced)
```
GET  /auth/me                     POST /auth/login  /auth/logout  /auth/refresh
POST /auth/change-password
GET  /analytics/dashboard         → totals{}, averageProcessingHours, byStatus[], myWork{}
GET  /analytics/monthly?months=   → [{month,total,approved,rejected}]
GET  /analytics/by-branch         → [{code,name,total,approved,rejected,approvalRate}]
GET  /analytics/by-inspector      → [{name,branch,total,approved,open}]
GET  /inspections                 → paginated; search, status, branch, inspector,
                                     priority, date range, assignedToMe, sortBy, sortDir
GET  /inspections/:id             → detail + completeness + proximity
GET  /inspections/:id/photos      → signed URLs
GET  /reviews/queue               POST /inspections/:id/{approve,reject,request-correction,begin-review}
GET  /properties  /users  /branches  /templates  /reports  /audit-logs
GET  /notifications  /notifications/unread-count   POST /notifications/read{,-all}
POST /inspections  /properties  /users  /branches   PATCH /users/:id
GET  /reports/:id/download        POST /inspections/:id/report
```

## Metrics actually available in this backend
inspections · pendingReview · approved · rejected · correctionRequested ·
inProgress · properties · branches · activeUsers · averageProcessingHours ·
byStatus · myWork · monthly trend · per-branch · per-inspector

## Metrics named in the brief that this backend does NOT have
`Total Shipments`, `In Transit`, `Delivered`, `Cancelled`, `Revenue`,
`Active Customers`, `Active Riders` — these belong to a parcel-delivery domain,
not collateral inspection.

Per the brief's own instruction ("Do not blindly create metrics that don't
exist in the backend"), these were **not** invented. The equivalent real
metrics above are used instead. See README section "Metric mapping".
