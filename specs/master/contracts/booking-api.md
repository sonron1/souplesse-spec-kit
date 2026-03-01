```markdown
# Contract: Booking API

## Endpoints

- `GET /api/sessions` — list sessions (query: date,page,size)
- `POST /api/sessions/:id/book` — book a session (authenticated)
- `POST /api/sessions/:id/cancel` — cancel booking (authenticated)

### `POST /api/sessions/:id/book`

Request body:

```json
{
  "userId": "<uuid>"  // server will derive from auth token; client should omit
}
```

Responses:
- `201 Created` — booking successful
- `409 Conflict` — session at capacity or double booking
- `403 Forbidden` — user has no active subscription
- `400 Bad Request` — invalid session id or payload

Behavior:
- Check active subscription for requesting user
- Check session capacity atomically (use DB transaction or row-level locking)
- Create booking record and decrement available slots

Security & Validation:
- Authenticate user (JWT)
- Validate session id and request body via Zod
- Enforce rate limit to avoid booking spam

``` 
