# Safe Rollout Checklist

Use this checklist for backend, mobile-readiness, and production-adjacent changes.

## Core Rule

Prefer additive changes over replacement changes.

- Add new service functions before removing old logic.
- Add new API routes before switching web flows to them.
- Keep current web behavior working while mobile support is added.

## Before Coding

- Confirm whether the change is internal only, web-facing, mobile-facing, or shared.
- Decide what is reusable business logic versus framework-specific UI logic.
- Plan any database changes to be backward-compatible.
- Keep production secrets, staging secrets, and local secrets separate.

## Implementation Pattern

- Put shared business rules in `lib/*-service.ts` or similar service files.
- Keep Next.js form actions thin and have them call shared services.
- Expose mobile-safe JSON routes in `app/api/*`.
- Avoid tying core business rules to redirects, cookies, or form-only parsing.
- Reuse validation schemas across web actions and API routes when possible.

## Database Safety

- Make schema changes additive first.
- Avoid destructive migrations during active rollout windows.
- Support old and new reads/writes at the same time when needed.
- Backfill data before removing deprecated fields.

## Auth Safety

- Keep existing cookie-based auth for web unless a migration is intentionally planned.
- Add token-based mobile auth separately rather than replacing web auth in-place.
- Do not break existing session flows to prepare for mobile.

## Deployment Safety

- Test locally first.
- Validate in staging before production.
- Roll out new endpoints without changing existing frontend traffic immediately.
- Use feature flags or restricted entry points for risky features.
- Monitor logs, errors, and key flows after deploy.

## Verification

- Run a production build before merging or deploying.
- Verify existing web flows still work.
- Verify new API routes return expected success and error responses.
- Check auth-protected routes with both authenticated and unauthenticated states.

## For This Repo

- Shared service logic now exists for store orders and fuel requests.
- Web actions should stay as wrappers around shared services.
- New mobile work should prefer new API routes over direct UI-coupled logic.
- High-risk future changes include auth changes, payment flow changes, and destructive database migrations.
