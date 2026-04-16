# Architecture Blueprint

## Recommended Stack

- `Next.js` for the web app and backend API layer
- `Postgres + Drizzle` for the database and data access layer
- `Flutter` for the future iOS and Android app
- Shared server-side service files in `lib/*-service.ts`
- Shared API routes in `app/api/*`

## Recommended Structure

### 1. Web App

The current Next.js app remains your production web frontend.

- Web pages stay in `app/*`
- Web forms can continue to use server actions
- Web auth can continue using cookie sessions
- Existing web UI should not be rewritten just to prepare for mobile

### 2. Backend

The Next.js server is also your backend.

- Business logic should live in shared service files
- API routes should call those service files
- Web server actions should also call those service files
- The database remains the single source of truth

This keeps web and mobile behavior aligned.

### 3. Mobile App

Flutter should be a separate client app.

- Flutter should not try to reuse React UI code
- Flutter should call the same backend APIs as the web app
- Flutter should store and send the bearer token returned by auth endpoints
- Flutter screens should be thin clients over the shared backend rules

## Recommended Flow

### Web Flow

`Browser -> Next.js page -> server action -> shared service -> database`

### Mobile Flow

`Flutter app -> JSON API route -> shared service -> database`

## Auth Strategy

Use dual auth support during this phase.

- Web: cookie-based session auth
- Mobile: bearer token auth using the same signed session token format

This lets both clients use the same backend safely without forcing a risky web auth rewrite.

## Current Mobile-Ready Areas

- Auth
- Vehicles
- Store orders
- Fuel requests

## Suggested Next Build Order

1. Keep the current web UI stable
2. Document the API contract clearly
3. Build the Flutter app as a separate mobile client
4. Start with auth, vehicles, booking, and orders in Flutter
5. Add more API coverage only when the mobile app needs it

## Practical Flutter App Layers

### Presentation

- Screens
- Widgets
- State management

### Data

- API client
- Request/response models
- Token storage

### Domain

- Booking use cases
- Vehicle use cases
- Auth use cases
- Order use cases

## Suggested Flutter Folder Shape

```text
lib/
  core/
    api/
    auth/
    storage/
  features/
    auth/
    vehicles/
    booking/
    store_orders/
  shared/
    models/
    widgets/
```

## Rules To Keep This Safe

- Prefer additive backend changes over replacing existing web flows
- Keep database changes backward-compatible
- Keep web cookie auth working
- Add mobile token auth alongside it
- Reuse service-layer business rules
- Avoid duplicating pricing, booking, or order logic inside Flutter

## Bottom Line

The best setup for this project is:

- `Next.js` as the web app
- `Next.js + API routes + service layer` as the backend
- `Flutter` as the future mobile client

That gives you one backend, one database, one set of business rules, and two frontends.
