# MuseWave API — Frontend Change Summary

> **Scope:** Three backend changes were shipped in one release. This document covers every API contract change a frontend engineer needs to act on.

---

## 1. New `Genre` Model & Endpoints

A canonical genre catalogue is now available. Use it to populate genre dropdowns instead of hardcoding strings.

### New endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/genres` | Public | List all active genres |
| `GET` | `/api/genres/<uuid>` | Public | Single genre detail |
| `POST` | `/api/genres/create` | Staff JWT | Create a genre |
| `PATCH` | `/api/genres/<uuid>` | Staff JWT | Update a genre |
| `DELETE` | `/api/genres/<uuid>` | Staff JWT | Delete a genre |

### Genre object shape

```json
{
  "id": "uuid",
  "name": "Hip Hop",
  "slug": "hip-hop",
  "description": "Optional description",
  "cover_url": "https://...",
  "is_active": true,
  "created_at": "2026-05-11T10:00:00Z",
  "updated_at": "2026-05-11T10:00:00Z"
}
```

### What to change on the frontend

- Replace any hardcoded genre arrays with a `GET /api/genres` call on app load or when rendering genre dropdowns/filters.
- Use `genre.name` as the value submitted to track/album create and update endpoints — the genre field on tracks and albums is still a plain string, not a foreign key.
- The `slug` field is useful for URL routing (e.g. `/genre/hip-hop`).
- Only `is_active: true` genres are returned by default — no frontend filtering needed.

---

## 2. New `is_artist` Field on User Objects

All user responses now include an `is_artist` boolean. It is set to `true` automatically the **first time** a user uploads a track — no manual action or separate API call is required.

### Affected responses

Both the public profile and the authenticated profile responses now include this field:

```json
{
  "id": "uuid",
  "username": "john_doe",
  "display_name": "John Doe",
  "verified": true,
  "is_artist": true,
  ...
}
```

This field appears in:
- `GET /api/users/<id>` (public profile)
- `GET /api/users/<id>/me` (own profile)
- `GET /api/users` (user list)
- `GET /api/artists` (already artist-filtered, but `is_artist` is now explicit)
- Login response (`token.user` object)
- `GET /api/users/verify-token`

### What to change on the frontend

- Use `is_artist` to conditionally show artist-specific UI — upload buttons, artist dashboards, profile badges, etc.
- You no longer need to infer artist status by checking whether a user has tracks; use this flag directly.
- On login/signup, read `is_artist` from the returned user object and store it in your auth state.
- `is_artist` is **read-only** — there is no endpoint to set it manually. It flips to `true` automatically when the user creates their first track.

---

## 3. New `video_url` and `lyrics` Fields on Track Objects

Two optional fields have been added to every track object.

### Updated track object (new fields highlighted)

```json
{
  "id": "uuid",
  "title": "Summer Vibes",
  "artist": "John Doe",
  "audio_url": "https://...",
  "video_url": "https://youtube.com/...",
  "lyrics": "Verse 1\nLine one\nLine two\n\nChorus\n...",
  ...
}
```

Both fields are **nullable** — expect `null` when not provided.

### Submitting on create (`POST /api/tracks/create`) and update (`PATCH /api/tracks/<id>`)

Both fields are optional on create and update:

```json
{
  "user_id": "uuid",
  "title": "Summer Vibes",
  "artist": "John Doe",
  "audio_duration": 240.5,
  "genre": "Electronic",
  "video_url": "https://youtube.com/watch?v=abc123",
  "lyrics": "Verse 1\n..."
}
```

- `video_url` — any externally hosted video URL (YouTube, Vimeo, direct `.mp4`, etc.). No upload; just pass the URL string.
- `lyrics` — plain text. Newlines (`\n`) are preserved in storage, so render with `white-space: pre-wrap` or split on `\n` to display line breaks correctly.

### What to change on the frontend

- **Track upload / edit form** — add optional `video_url` input (URL text field) and `lyrics` input (textarea).
- **Track detail page** — render a video player or link if `video_url` is present; render a lyrics section if `lyrics` is present. Guard both with a null check.
- **Track cards / lists** — optionally show a video or lyrics indicator badge when these fields are non-null.

---

## Summary Table

| Area | Change | Frontend action required |
|------|--------|--------------------------|
| Genres | New `/api/genres` endpoints | Fetch genres dynamically; replace hardcoded lists |
| User | `is_artist` field added to all user responses | Use flag for conditional UI; store in auth state |
| Track | `video_url` field added (nullable) | Add URL input to forms; conditionally render player/link |
| Track | `lyrics` field added (nullable) | Add textarea to forms; render with preserved line breaks |

No existing fields were removed or renamed. All changes are additive and backward-compatible — current UI will continue to work without modification, but the new fields will be silently ignored until the frontend opts in.
