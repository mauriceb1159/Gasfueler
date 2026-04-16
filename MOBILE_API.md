# Mobile API

This file documents the current API surface prepared for a future Flutter iOS/Android app.

## Base Pattern

- Base URL in local development: `http://localhost:3000`
- Protected endpoints require authentication
- Mobile clients should send:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

## Auth

### `POST /api/auth/sign-in`

Sign in and receive a bearer token for mobile use.

Request:

```json
{
  "email": "test@test.com",
  "password": "admin123"
}
```

Success response:

```json
{
  "token": "jwt-token",
  "expiresAt": "2026-04-12T18:00:00.000Z",
  "user": {
    "id": 1,
    "email": "test@test.com",
    "name": null,
    "role": "owner"
  }
}
```

Common errors:

- `400` invalid JSON or validation error
- `401` invalid email or password

### `POST /api/auth/sign-up`

Create a new account and receive a bearer token.

Request:

```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "inviteId": "12"
}
```

Notes:

- `inviteId` is optional
- If `inviteId` is omitted, a new team is created automatically

Success response:

```json
{
  "token": "jwt-token",
  "expiresAt": "2026-04-12T18:00:00.000Z",
  "user": {
    "id": 2,
    "email": "newuser@example.com",
    "name": null,
    "role": "owner"
  }
}
```

Common errors:

- `400` invalid request
- `400` account already exists
- `400` invalid or expired invitation

### `GET /api/auth/session`

Get the currently authenticated user.

Headers:

```http
Authorization: Bearer <token>
```

Success response:

```json
{
  "user": {
    "id": 1,
    "email": "test@test.com",
    "name": null,
    "role": "owner"
  }
}
```

Common errors:

- `401` not authenticated

### `POST /api/auth/sign-out`

For mobile, this is mostly optional because the client can also delete its stored token locally.

Success response:

```json
{
  "success": true
}
```

## Account

### `GET /api/user`

Fetch the authenticated user's current profile.

Success response:

```json
{
  "id": 1,
  "email": "test@test.com",
  "name": "Maurice",
  "role": "owner"
}
```

Common errors:

- `401` not authenticated

### `PATCH /api/user`

Update the authenticated user's profile.

Request:

```json
{
  "name": "Maurice",
  "email": "maurice@example.com"
}
```

Success response:

```json
{
  "id": 1,
  "email": "maurice@example.com",
  "name": "Maurice",
  "role": "owner"
}
```

Common errors:

- `400` invalid request
- `400` email already exists
- `401` not authenticated

### `POST /api/user/password`

Update the authenticated user's password.

Request:

```json
{
  "currentPassword": "admin123",
  "newPassword": "new-password-123",
  "confirmPassword": "new-password-123"
}
```

Success response:

```json
{
  "success": "Password updated successfully."
}
```

Common errors:

- `400` current password incorrect
- `400` new password matches current password
- `400` password confirmation mismatch
- `401` not authenticated

### `POST /api/user/delete`

Soft-delete the authenticated user's account.

Request:

```json
{
  "password": "admin123"
}
```

Success response:

```json
{
  "success": "Account deleted successfully."
}
```

Common errors:

- `400` incorrect password
- `401` not authenticated

## Vehicles

### `GET /api/vehicles`

List the authenticated user's vehicles.

Success response:

```json
[
  {
    "id": 1,
    "userId": 1,
    "nickname": "Family SUV",
    "vehicleClass": "suv",
    "make": "Toyota",
    "model": "Highlander",
    "color": "Black",
    "licensePlate": "ABC123",
    "fuelType": "regular",
    "notes": null,
    "createdAt": "2026-04-11T00:00:00.000Z",
    "updatedAt": "2026-04-11T00:00:00.000Z"
  }
]
```

Common errors:

- `401` not authenticated

### `POST /api/vehicles`

Create a vehicle.

Request:

```json
{
  "nickname": "Work Truck",
  "vehicleClass": "truck",
  "make": "Ford",
  "model": "F-150",
  "color": "White",
  "licensePlate": "TRK900",
  "fuelType": "diesel",
  "notes": "Driver side cap"
}
```

Success response:

```json
{
  "id": 2,
  "userId": 1,
  "nickname": "Work Truck",
  "vehicleClass": "truck",
  "make": "Ford",
  "model": "F-150",
  "color": "White",
  "licensePlate": "TRK900",
  "fuelType": "diesel",
  "notes": "Driver side cap",
  "createdAt": "2026-04-11T00:00:00.000Z",
  "updatedAt": "2026-04-11T00:00:00.000Z"
}
```

Common errors:

- `400` invalid request
- `401` not authenticated

### `PATCH /api/vehicles/:id`

Update one or more vehicle fields.

Request:

```json
{
  "nickname": "Updated Truck",
  "color": "Gray"
}
```

Success response:

```json
{
  "id": 2,
  "userId": 1,
  "nickname": "Updated Truck",
  "vehicleClass": "truck",
  "make": "Ford",
  "model": "F-150",
  "color": "Gray",
  "licensePlate": "TRK900",
  "fuelType": "diesel",
  "notes": "Driver side cap",
  "createdAt": "2026-04-11T00:00:00.000Z",
  "updatedAt": "2026-04-11T01:00:00.000Z"
}
```

Common errors:

- `400` invalid vehicle id
- `400` invalid request body
- `401` not authenticated
- `404` vehicle not found

## Store Orders

### `POST /api/store-orders`

Create a store-only order.

Request:

```json
{
  "stationId": 1,
  "pickupMode": "asap",
  "pickupWindowStart": "",
  "pickupWindowEnd": "",
  "customerNotes": "Front counter pickup",
  "selectedStoreItems": [
    {
      "stationStoreItemId": 12,
      "quantity": 2
    }
  ]
}
```

Notes:

- `pickupMode` must be one of:
  - `asap`
  - `scheduled`
  - `on_arrival`
- For `scheduled`, include `pickupWindowStart` and `pickupWindowEnd`
- `selectedStoreItems` may be sent as an array

Success response:

```json
{
  "orderId": 15,
  "totalAmount": 998,
  "itemCount": 2
}
```

Common errors:

- `400` invalid request
- `400` selected items unavailable
- `401` not authenticated

## Fuel Requests

### `POST /api/fuel-requests`

Create a fuel booking request, optionally with store items.

Request:

```json
{
  "stationId": 1,
  "slotId": 10,
  "fuelGrade": "regular",
  "requestType": "fill_tank",
  "requestedGallons": null,
  "requestedDollarAmount": null,
  "vehicleId": 1,
  "nickname": "",
  "vehicleClass": "suv",
  "make": "",
  "model": "",
  "color": "",
  "licensePlate": "",
  "fuelType": "",
  "vehicleNotes": "",
  "specialInstructions": "Call on arrival",
  "selectedStoreItems": [
    {
      "stationStoreItemId": 12,
      "quantity": 1
    }
  ]
}
```

Notes:

- `requestType` must be one of:
  - `fill_tank`
  - `gallons`
  - `dollar_amount`
- If `requestType` is `gallons`, include `requestedGallons`
- If `requestType` is `dollar_amount`, include `requestedDollarAmount`
- Either `vehicleId` or a new vehicle payload with `licensePlate` is required

Success response:

```json
{
  "requestId": 22,
  "orderId": 31,
  "totalEstimate": 5897,
  "fuelEstimate": 4000,
  "addonTotal": 998,
  "serviceFee": 899
}
```

Common errors:

- `400` invalid request
- `400` selected station missing
- `400` slot unavailable
- `401` not authenticated

## Current Mobile Build Order

Recommended Flutter implementation order:

1. Auth
2. Session restore
3. Account profile
4. Vehicles
5. Book fuel request
6. Store orders

## Suggested Flutter Notes

- Store the token securely using platform secure storage
- Send the bearer token on every protected request
- Treat `401` as a sign-out/session-expired state
- Keep response models simple and aligned with this document
