# MuseWave Django Backend

A Django REST Framework backend for a music streaming platform, providing a complete API for user management, track management, social features (likes, follows), and analytics.
Database is SQLite.

## Features

- **User Management**: Create, read, update users with profiles and social links
- **Track Management**: Upload, manage, and publish music tracks
- **Social Features**: Like tracks, follow artists, comment on tracks
- **Analytics**: Track plays, downloads, user statistics, and engagement metrics
- **Search**: Full-text search for tracks and users
- **Track Visibility**: Every track has a `visibility` field (`public` / `private`) controlling who can view, stream, and discover it
- **Track Sharing**: Share individual private tracks with specific users by username or email
- **Album Sharing**: Share albums with specific users (`view` or `edit` permission), with full shared-by-me / shared-with-me discovery endpoints
- **Album Track Ordering**: Tracks within an album have an explicit `album_order` position. A dedicated reorder endpoint lets the owner rearrange them without reassigning the album
- **Playlist Sharing**: Share playlists with specific users (`view` or `edit` permission) or via a public link token, with shared-by-me / shared-with-me discovery endpoints
- **Playlist Privacy**: Private tracks in playlists respect access control — only visible to users who received a direct share from the track owner
- **Notifications**: Signal-driven notification system — followers are alerted when an artist publishes new public content; share recipients are notified when content is shared directly with them
- **RESTful API**: Clean, well-documented REST endpoints

## API Endpoints

### Authentication

- `POST /api/users/login` - Login with email and password
- `POST /api/users/logout` - Logout user
- `POST /api/users/refresh` - Refresh JWT token
- `POST /api/users/verify-token` - Verify JWT token validity

### Email Verification

- `GET /api/users/verify-email/<uidb64>/<token>/` - Verify email with token
- `POST /api/users/resend-verification` - Resend verification email
- `GET /api/users/verification-status` - Check email verification status

### Password Management

- `POST /api/users/password/change` - Change password
- `POST /api/users/password/reset` - Request password reset
- `POST /api/users/password/reset/confirm` - Confirm password reset

### Users

- `GET /api/users` - List all users (with pagination: limit, offset)
- `POST /api/users/create` - Create a new user
- `GET /api/users/<user_id>` - Get user by ID (public profile)
- `GET /api/users/<user_id>/me` - Get own full profile (auth required)
- `PATCH /api/users/<user_id>/update` - Update user profile
- `GET /api/users/username/<username>` - Get user by username
- `GET /api/users/<user_id>/stats` - Get user statistics (plays, likes, downloads, followers, etc.)
- `GET /api/users/<user_id>/likes` - Get user's liked tracks
- `GET /api/users/<user_id>/plays` - Get user's play history
- `GET /api/users/<user_id>/albums` - Get all albums for a user
- `GET /api/users/<user_id>/playlists` - Get user's public playlists (visible on their profile)
- `GET /api/users/<user_id>/followers` - Get user's followers
- `GET /api/users/<user_id>/following` - Get users being followed
- `POST /api/users/<user_id>/follow` - Follow a user
- `DELETE /api/users/<user_id>/follow` - Unfollow a user
- `GET /api/users/<user_id>/follow/<follower_id>` - Check if user is following

### Artists

- `GET /api/artists` - Get all users who have published tracks
- `GET /api/artists/trending` - **Top 5 artists by total plays** (public). Returns full user profiles with aggregate stats: total plays, likes, downloads, track count, followers, and following. No authentication required.

### Genres

- `GET /api/genres` - List all active genres (public). Pass `?all=true` as staff to include inactive genres.
- `POST /api/genres/create` - Create a new genre (staff only)
- `GET /api/genres/<genre_id>` - Get genre by ID (public)
- `PATCH /api/genres/<genre_id>` - Update genre (staff only)
- `DELETE /api/genres/<genre_id>` - Delete genre (staff only)

### Albums

- `POST /api/albums` - Create a new album
- `GET /api/albums/<album_id>` - Get album by ID (includes tracks ordered by `album_order`)
- `PATCH /api/albums/<album_id>/update` - Update album details
- `DELETE /api/albums/<album_id>/delete` - Delete album (tracks remain, album association removed)
- `PATCH /api/albums/<album_id>/reorder` - Reorder the tracks within an album (owner only). Body: `[{"id": "<track_uuid>", "order": 0}, ...]`. Returns the full ordered track list

> **Album track ordering:** Each track has an `album_order` integer field representing its position within the album. When creating or updating an album with a `track_ids` list the order of that list is automatically used as the initial ordering. Use the reorder endpoint to change it later. Tracks without an explicit order appear after ordered ones, sorted by creation date.

#### Album Sharing

Share albums with specific users (`view` or `edit` permission):

- `GET /api/albums/<album_id>/shares` - List all direct shares for this album. Owner only
- `POST /api/albums/<album_id>/shares` - Share with a specific user. Body: `{"username": "..." OR "email": "...", "permission": "view"|"edit"}` (default `view`). Owner only. Re-POSTing an existing share updates the permission
- `PATCH /api/albums/<album_id>/shares/<share_id>` - Change a user's permission level. Body: `{"permission": "view"|"edit"}`. Owner only
- `DELETE /api/albums/<album_id>/shares/<share_id>` - Revoke a user's access. Owner only

#### Album Sharing — discovery

- `GET /api/albums/shared-by-me` - List all albums the authenticated user has shared with others. Returns **one entry per recipient** — if the same album was shared with multiple people there are multiple entries. Each entry is the full album object plus: `share_id`, `shared_with_username`, `shared_with_display_name`, `shared_with_avatar`, `shared_with_email`, `shared_at`. Auth required
- `GET /api/albums/shared-with-me` - List all albums that have been shared with the authenticated user. Each entry is the full album object plus: `share_id`, `shared_by_username`, `shared_by_display_name`, `shared_by_avatar`, `shared_at`. Auth required

### Tracks

Track have a `visibility` field controlling access:
- `"public"` (default) — anyone can view, stream, and discover
- `"private"` — only the track owner and users with a direct share can access

The `published` Boolean works independently — it controls "released" vs. "draft" status.

**Visibility behaviour:**
- Listing (`GET /api/tracks`) — authenticated users see their own private + all public tracks; anonymous users see only public
- Search (`GET /api/search`) — private tracks are excluded from results
- Detail / stream / download / play endpoints — private tracks return `404` for non-owners and users without a share
- Artist listing (`GET /api/artists`) — only public tracks count toward artist eligibility

- `GET /api/tracks` - List all tracks (filters: userId, genre, mood, tags, published, visibility; sorting: sortBy, sortOrder; pagination: limit, offset)
- `POST /api/tracks/create` - Create a new track (optional `visibility` field, defaults to `"public"`)
- `GET /api/tracks/<track_id>` - Get track by ID (returns 404 for private tracks if not authorized)
- `PATCH /api/tracks/<track_id>` - Update track metadata (owner only — returns 403 otherwise)
- `DELETE /api/tracks/<track_id>` - Delete track (owner only — returns 403 otherwise)
- `GET /api/tracks/<track_id>/stream/` - Stream audio (returns 404 for private tracks if not authorized)
- `GET /api/tracks/<track_id>/stream-url/` - Get streaming URL for track
- `GET /api/tracks/<track_id>/download/` - Download track as file attachment
- `POST /api/tracks/<track_id>/download` - Record a download and increment counter (returns 404 for private tracks if not authorized)
- `GET /api/tracks/<track_id>/downloads` - Get all downloads for a track
- `GET /api/tracks/<track_id>/stats` - Get track statistics (plays, listeners, completion rate, etc.)
- `POST /api/tracks/<track_id>/play` - Record a play event (returns 404 for private tracks if not authorized)
- `GET /api/tracks/<track_id>/plays` - Get all plays for a track
- `POST /api/tracks/<track_id>/like` - Like a track
- `DELETE /api/tracks/<track_id>/like` - Unlike a track
- `GET /api/tracks/<track_id>/like/<user_id>` - Check if user liked track

#### Track Sharing

Share individual private tracks with specific users:

- `POST /api/tracks/<track_id>/shares` - Share a private track with a user. Body: `{"username": "..." OR "email": "..."}`. Owner only
- `GET /api/tracks/<track_id>/shares` - List all shares for a track. Owner only
- `DELETE /api/tracks/<track_id>/shares/<share_id>` - Revoke a user's access. Owner only

#### Track Sharing — discovery

- `GET /api/tracks/shared-by-me` - List all tracks the authenticated user has shared with others. Returns **one entry per recipient** — if the same track was shared with multiple people there are multiple entries. Each entry is the full track object plus: `share_id`, `shared_with_username`, `shared_with_display_name`, `shared_with_avatar`, `shared_with_email`, `shared_at`. Auth required
- `GET /api/tracks/shared-with-me` - List all tracks that have been shared with the authenticated user. Each entry is the full track object plus: `share_id`, `shared_by_username`, `shared_by_display_name`, `shared_by_avatar`, `shared_at`. Auth required

### Playlists

#### Core

- `GET /api/playlists` - List own playlists (auth required)
- `POST /api/playlists` - Create a playlist (auth required)
- `GET /api/playlists/<playlist_id>` - Get playlist with tracks. Access granted to: owner, directly shared users, anyone with a valid link token (`?token=<uuid>`), or any user if the playlist is public. **Private track filtering:** when accessed via direct share from the playlist owner, the owner's private tracks are visible; when accessed via link or public page, all private tracks are hidden
- `PATCH /api/playlists/<playlist_id>` - Update playlist metadata. Requires owner or edit permission
- `DELETE /api/playlists/<playlist_id>` - Delete playlist. Owner only
- `POST /api/playlists/<playlist_id>/add-track` - Add a track. Requires owner or edit permission. **Visibility guard:** returns 404 if the track is private and the caller is not its owner
- `POST /api/playlists/<playlist_id>/remove-track` - Remove a track. Requires owner or edit permission
- `POST /api/playlists/<playlist_id>/reorder` - Reorder tracks. Requires owner or edit permission

#### Sharing — direct user grants (owner only)

- `GET /api/playlists/<playlist_id>/shares` - List all direct shares for this playlist
- `POST /api/playlists/<playlist_id>/shares` - Share with a specific user. Body: `{"username": "..." OR "email": "...", "permission": "view"|"edit"}`
- `PATCH /api/playlists/<playlist_id>/shares/<share_id>` - Change a user's permission. Body: `{"permission": "view"|"edit"}`
- `DELETE /api/playlists/<playlist_id>/shares/<share_id>` - Revoke a user's access

#### Sharing — public link (owner only)

- `POST /api/playlists/<playlist_id>/link` - Generate (or regenerate) a shareable link token. Body: `{"permission": "view"|"edit"}` (default `view`)
- `PATCH /api/playlists/<playlist_id>/link` - Update link permission without regenerating token. Body: `{"permission": "view"|"edit"}`
- `DELETE /api/playlists/<playlist_id>/link` - Revoke the link (invalidates the token immediately)

#### Sharing — access & discovery

- `GET /api/playlists/link/<token>` - Access a playlist via its public share link. No authentication required
- `GET /api/playlists/shared-with-me` - List all playlists directly shared with the authenticated user. Each entry is the full playlist object. Auth required
- `GET /api/playlists/shared-by-me` - List all playlists the authenticated user has shared with others. Returns **one entry per recipient** — if the same playlist was shared with multiple people there are multiple entries. Each entry is the full playlist object plus: `share_id`, `shared_with_username`, `shared_with_display_name`, `shared_with_avatar`, `shared_with_email`, `share_permission`, `shared_at`. Auth required
- `GET /api/users/<user_id>/playlists` - List a user's public playlists (visible on their profile, no auth required)

### Featured Tracks

Staff-curated promotion of selected tracks. All management endpoints are staff-only; the list endpoint is public.

- `GET /api/featured-tracks` - List all active featured tracks in order (public). Automatically excludes unpublished, private, and expired tracks
- `POST /api/featured-tracks` - Feature a track. Body: `{"track_id": "...", "order": 0, "label": "Editor's Pick"}`. Staff only. Runs eligibility validation (must be published, public, have audio, etc.)
- `PATCH /api/featured-tracks/<id>` - Update a featured entry (order, label, is_active, end_date). Staff only
- `DELETE /api/featured-tracks/<id>` - Remove a track from featured list. Staff only
- `POST /api/featured-tracks/reorder` - Batch reorder. Body: `[{"id": "uuid", "order": 0}, ...]`. Staff only

### Search

- `GET /api/search?q=<query>&type=<tracks|users|all>&limit=<number>` - Search tracks and/or users
- `POST /api/search/rebuild` - Rebuild search index (no-op in Django, returns success)

### Notifications

Notifications are created automatically by Django signals. All endpoints require authentication.

- `GET /api/notifications` - List all notifications for the authenticated user, newest first. Query params: `?unread=true` (unread only), `?limit=N` (default 50, max 200)
- `GET /api/notifications/unread-count` - Returns `{"unread_count": N}`. Suitable for polling to drive notification badge counts
- `POST /api/notifications/<notif_id>/read` - Mark a single notification as read and **delete** it
- `POST /api/notifications/mark-all-read` - Delete all notifications for the user. Returns `{"success": true, "deleted": N}`

#### What triggers a notification

| Trigger | Recipients | `notification_type` |
|---------|-----------|---------------------|
| New public track published (on creation or draft → published) | All followers of the artist | `new_track` |
| New published album | All followers of the artist | `new_album` |
| New public playlist | All followers of the user | `new_playlist` |
| Track shared with a user | The recipient | `track_shared` |
| Album shared with a user | The recipient | `album_shared` |
| Playlist shared with a user | The recipient | `playlist_shared` |

#### Notification object shape

```json
{
  "id": "uuid",
  "notification_type": "new_track",
  "target_type": "track",
  "target_id": "track-uuid",
  "target_title": "Summer Vibes",
  "actor_username": "john_doe",
  "actor_display_name": "John Doe",
  "actor_avatar_url": "https://cdn.example.com/avatars/john.jpg",
  "extra": {},
  "is_read": false,
  "created_at": "2026-06-20T18:00:00Z"
}
```

> `target_title`, `actor_username`, and `actor_display_name` are denormalised at the time the notification is created, so the notification remains readable even if the original content or user is later deleted.  
> For share notifications, `extra` contains `{"permission": "view"}` or `{"permission": "edit"}`.  
> When a notification is marked as read (individually or via mark-all-read) it is **deleted** from the database — there are no lingering read records.

#### Extending notifications

Adding a new notification type requires only three steps:
1. Add a `TYPE_*` constant and a row in `TYPE_CHOICES` on the `Notification` model (`musewave/models.py`).
2. Call `Notification.objects.create(...)` or use the `_notify_followers` / `_notify_user` helpers in `musewave/signals.py`.
3. No migration is needed — `notification_type` is a plain `CharField`.

---

## Request/Response Examples

### Create a User

**Request:**
```bash
POST /api/users/create
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "display_name": "John Doe",
  "bio": "Music producer and DJ"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "john_doe",
  "email": "john@example.com",
  "display_name": "John Doe",
  "bio": "Music producer and DJ",
  "verified": false,
  "is_artist": false,
  "created_at": "2024-02-04T10:30:00Z",
  "updated_at": "2024-02-04T10:30:00Z",
  "message": "Account created successfully! Please check your email to verify your account.",
  "verification_required": true
}
```

### Login

**Request:**
```bash
POST /api/users/login
Content-Type: application/json

{
  "username_or_email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "token": {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  },
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "email": "john@example.com",
    "display_name": "John Doe",
    "verified": true,
    "is_artist": true
  },
  "message": "Login successful"
}
```

### Get User Profile

**Request:**
```bash
GET /api/users/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "john_doe",
  "display_name": "John Doe",
  "bio": "Music producer and DJ",
  "verified": true,
  "is_artist": true,
  "avatar_url": "https://example.com/avatars/john.jpg",
  "created_at": "2024-02-04T10:30:00Z"
}
```

> `is_artist` is `false` for new users and is automatically set to `true` the first time the user uploads a track. It cannot be set manually.

### List Genres

**Request:**
```bash
GET /api/genres
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Electronic",
    "slug": "electronic",
    "description": null,
    "cover_url": null,
    "is_active": true,
    "created_at": "2024-02-04T10:00:00Z",
    "updated_at": "2024-02-04T10:00:00Z"
  },
  {
    "id": "uuid",
    "name": "Hip Hop",
    "slug": "hip-hop",
    "description": "Rap, trap, and all sub-genres",
    "cover_url": "https://cdn.example.com/genres/hiphop.jpg",
    "is_active": true,
    "created_at": "2024-02-04T10:00:00Z",
    "updated_at": "2024-02-04T10:00:00Z"
  }
]
```

### Create a Genre (staff only)

**Request:**
```bash
POST /api/genres/create
Authorization: Bearer <staff-jwt-token>
Content-Type: application/json

{
  "name": "Afrobeats",
  "description": "Contemporary African popular music",
  "cover_url": "https://cdn.example.com/genres/afrobeats.jpg"
}
```

> `slug` is auto-generated from `name` if omitted (`"Afrobeats"` → `"afrobeats"`). Supply it explicitly to override.

**Response:**
```json
{
  "id": "uuid",
  "name": "Afrobeats",
  "slug": "afrobeats",
  "description": "Contemporary African popular music",
  "cover_url": "https://cdn.example.com/genres/afrobeats.jpg",
  "is_active": true,
  "created_at": "2024-02-04T10:30:00Z",
  "updated_at": "2024-02-04T10:30:00Z"
}
```

### Create a Track

**Request:**
```bash
POST /api/tracks/create
Content-Type: application/json

{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Summer Vibes",
  "artist": "John Doe",
  "artist_slug": "john-doe",
  "genre": "Electronic",
  "audio_duration": 240.5,
  "audio_format": "mp3",
  "published": true,
  "video_url": "https://youtube.com/watch?v=abc123",
  "lyrics": "Verse 1\nLine one\nLine two\n\nChorus\nSummer in the air"
}
```

> `video_url`, `lyrics`, and `visibility` are optional. Omit `visibility` or pass `"public"` for a publicly visible track. Pass `"private"` for owner-only access.
> The owner's `is_artist` flag is automatically set to `true` on the first track creation.
> **Genre auto-creation:** If the `genre` value does not match any existing `Genre` catalogue entry (case-insensitive lookup), a new `Genre` record is automatically created with the supplied name and an auto-generated slug. This keeps the genre dropdown in sync without manual staff intervention.

**Response:**
```json
{
  "id": "track-uuid-1",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "album_id": null,
  "title": "Summer Vibes",
  "artist": "John Doe",
  "genre": "Electronic",
  "audio_duration": 240.5,
  "audio_format": "mp3",
  "video_url": "https://youtube.com/watch?v=abc123",
  "lyrics": "Verse 1\nLine one\nLine two\n\nChorus\nSummer in the air",
  "plays": 0,
  "likes": 0,
  "downloads": 0,
  "published": true,
  "visibility": "public",
  "created_at": "2024-02-04T10:30:00Z",
  "updated_at": "2024-02-04T10:30:00Z"
}
```

### Get a Track

**Request:**
```bash
GET /api/tracks/track-uuid-1
```

**Response:**
```json
{
  "id": "track-uuid-1",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "album_id": null,
  "title": "Summer Vibes",
  "artist": "John Doe",
  "artist_slug": "john-doe",
  "description": null,
  "genre": "Electronic",
  "mood": "Happy",
  "tags": ["summer", "dance"],
  "audio_url": "https://cdn.example.com/tracks/summer-vibes.mp3",
  "audio_file_size": 5242880,
  "audio_duration": 240.5,
  "audio_format": "mp3",
  "cover_url": "https://cdn.example.com/covers/summer-vibes.jpg",
  "cover_gradient": null,
  "waveform_data": null,
  "video_url": "https://youtube.com/watch?v=abc123",
  "lyrics": "Verse 1\nLine one\nLine two\n\nChorus\nSummer in the air",
  "bpm": 128,
  "key": "Am",
  "plays": 150,
  "likes": 45,
  "downloads": 12,
  "shares": 3,
  "published": true,
  "published_at": "2024-02-04T10:30:00Z",
  "visibility": "public",
  "created_at": "2024-02-04T10:30:00Z",
  "updated_at": "2024-02-04T10:30:00Z"
}
```

### Update a Track (visibility, video, lyrics, etc.)

**Request:**
```bash
PATCH /api/tracks/track-uuid-1
Authorization: Bearer <owner-token>
Content-Type: application/json

{
  "visibility": "private"
}
```

> Only the track owner can PATCH or DELETE a track. Visibility can be toggled between `"public"` and `"private"` at any time.

**Response:** Full updated track object (same shape as GET above).

### Share a Private Track with a User

```bash
POST /api/tracks/track-uuid-1/shares
Authorization: Bearer <owner-token>
Content-Type: application/json

{
  "username": "bob"
}
```

> Use `"username"` or `"email"` to identify the recipient. Only the track owner can manage shares.

**Response:**
```json
{
  "id": "share-uuid",
  "track_id": "track-uuid-1",
  "track_title": "Summer Vibes",
  "shared_by_username": "john_doe",
  "shared_with_username": "bob",
  "shared_with_email": "bob@test.com",
  "shared_with_avatar": "https://...",
  "permission": "view",
  "created_at": "..."
}
```

### List Shares on a Track

```bash
GET /api/tracks/track-uuid-1/shares
Authorization: Bearer <owner-token>
```

### Revoke a Track Share

```bash
DELETE /api/tracks/track-uuid-1/shares/SHARE_UUID
Authorization: Bearer <owner-token>
```

### Get Tracks Shared by Me

**Request:**
```bash
GET /api/tracks/shared-by-me
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
[
  {
    "id": "track-uuid-1",
    "title": "Summer Vibes",
    "artist": "John Doe",
    "visibility": "private",
    "audio_url": "https://cdn.example.com/tracks/summer-vibes.mp3",
    "share_id": "share-uuid",
    "shared_with_username": "bob",
    "shared_with_display_name": "Bob Smith",
    "shared_with_avatar": "https://...",
    "shared_with_email": "bob@test.com",
    "shared_at": "2024-06-02T08:00:00Z"
  }
]
```

> One entry per recipient. If the same track was shared with three users, three entries appear.

### Get Tracks Shared with Me

**Request:**
```bash
GET /api/tracks/shared-with-me
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
[
  {
    "id": "track-uuid-1",
    "title": "Summer Vibes",
    "artist": "John Doe",
    "visibility": "private",
    "share_id": "share-uuid",
    "shared_by_username": "john_doe",
    "shared_by_display_name": "John Doe",
    "shared_by_avatar": "https://...",
    "shared_at": "2024-06-02T08:00:00Z"
  }
]
```

### Get Playlists Shared by Me

**Request:**
```bash
GET /api/playlists/shared-by-me
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
[
  {
    "id": "playlist-uuid",
    "name": "My Favorite Tracks",
    "description": "A collection of my favorite songs",
    "public": false,
    "share_id": "share-uuid",
    "shared_with_username": "bob",
    "shared_with_display_name": "Bob Smith",
    "shared_with_avatar": "https://...",
    "shared_with_email": "bob@test.com",
    "share_permission": "view",
    "shared_at": "2024-06-02T08:00:00Z"
  }
]
```

> One entry per recipient. `share_permission` reflects the current permission level granted to the recipient.

### Update a Track (add/edit video or lyrics)

**Request:**
```bash
PATCH /api/tracks/track-uuid-1
Content-Type: application/json

{
  "video_url": "https://vimeo.com/123456789",
  "lyrics": "Updated verse\nNew line"
}
```

> Pass `"video_url": null` or `"lyrics": null` to clear either field.

**Response:** Full updated track object (same shape as GET above).

### Create an Album

**Request:**
```bash
POST /api/albums
Content-Type: application/json

{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Summer Collection",
  "artist": "John Doe",
  "genre": "Electronic",
  "description": "A collection of summer hits",
  "release_date": "2024-06-01T00:00:00Z",
  "published": true
}
```

**Response:**
```json
{
  "id": "album-uuid",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Summer Collection",
  "artist": "John Doe",
  "genre": "Electronic",
  "description": "A collection of summer hits",
  "release_date": "2024-06-01T00:00:00Z",
  "published": true,
  "created_at": "2024-02-04T10:30:00Z",
  "updated_at": "2024-02-04T10:30:00Z"
}
```

### Share an Album with a User

**Request:**
```bash
POST /api/albums/album-uuid/shares
Authorization: Bearer <owner-token>
Content-Type: application/json

{
  "username": "bob",
  "permission": "edit"
}
```

> Use `"username"` or `"email"` to identify the recipient. `permission` defaults to `"view"` if omitted. Re-POSTing an existing share updates the permission level.

**Response:**
```json
{
  "id": "share-uuid",
  "album_id": "album-uuid",
  "album_title": "Summer Collection",
  "album_cover_url": "https://cdn.example.com/covers/summer.jpg",
  "shared_by_username": "john_doe",
  "shared_with_username": "bob",
  "shared_with_email": "bob@test.com",
  "shared_with_avatar": "https://...",
  "permission": "edit",
  "created_at": "2024-06-01T10:00:00Z"
}
```

### Update an Album Share Permission

**Request:**
```bash
PATCH /api/albums/album-uuid/shares/share-uuid
Authorization: Bearer <owner-token>
Content-Type: application/json

{
  "permission": "view"
}
```

**Response:** Updated share object (same shape as POST above).

### Get Albums Shared by Me

**Request:**
```bash
GET /api/albums/shared-by-me
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
[
  {
    "id": "album-uuid",
    "title": "Summer Collection",
    "artist": "John Doe",
    "genre": "Electronic",
    "cover_url": "https://cdn.example.com/covers/summer.jpg",
    "published": true,
    "created_at": "2024-06-01T10:00:00Z",
    "updated_at": "2024-06-01T10:00:00Z",
    "share_id": "share-uuid",
    "shared_with_username": "bob",
    "shared_with_display_name": "Bob Smith",
    "shared_with_avatar": "https://...",
    "shared_with_email": "bob@test.com",
    "shared_at": "2024-06-02T08:00:00Z"
  }
]
```

> One entry per recipient. If the same album was shared with three users, three entries appear.

### Get Albums Shared with Me

**Request:**
```bash
GET /api/albums/shared-with-me
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
[
  {
    "id": "album-uuid",
    "title": "Summer Collection",
    "artist": "John Doe",
    "cover_url": "https://cdn.example.com/covers/summer.jpg",
    "share_id": "share-uuid",
    "shared_by_username": "john_doe",
    "shared_by_display_name": "John Doe",
    "shared_by_avatar": "https://...",
    "shared_at": "2024-06-02T08:00:00Z"
  }
]
```

### Create a Playlist

**Request:**
```bash
POST /api/playlists
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "name": "My Favorite Tracks",
  "description": "A collection of my favorite songs"
}
```

**Response:**
```json
{
  "id": "playlist-uuid",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Favorite Tracks",
  "description": "A collection of my favorite songs",
  "created_at": "2024-02-04T10:30:00Z",
  "updated_at": "2024-02-04T10:30:00Z"
}
```

### Add Track to Playlist

**Request:**
```bash
POST /api/playlists/<playlist-id>/add-track
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "track_id": "track-uuid-1"
}
```

**Response:**
```json
{
  "id": "playlist-track-uuid",
  "playlist_id": "playlist-uuid",
  "track_id": "track-uuid-1",
  "order": 0
}
```

### Reorder Playlist Tracks

**Request:**
```bash
POST /api/playlists/<playlist-id>/reorder
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

[
  {"id": "playlist-track-uuid-1", "order": 1},
  {"id": "playlist-track-uuid-2", "order": 0},
  {"id": "playlist-track-uuid-3", "order": 2}
]
```

**Response:**
```json
{
  "success": true
}
```

### Get User Statistics

**Request:**
```bash
GET /api/users/550e8400-e29b-41d4-a716-446655440000/stats
```

**Response:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_tracks": 15,
  "total_plays": 1250,
  "total_likes": 320,
  "total_downloads": 85,
  "total_followers": 156,
  "total_following": 42,
  "monthly_listeners": 87,
  "updated_at": "2024-02-04T10:35:00Z"
}
```

### Get Trending Artists

**Request:**
```bash
GET /api/artists/trending
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "display_name": "John Doe",
    "bio": "Music producer and DJ",
    "avatar_url": "https://example.com/avatars/john.jpg",
    "header_url": "https://example.com/headers/john.jpg",
    "location": "Los Angeles, CA",
    "website": "https://johndoe.com",
    "social_links": {
      "twitter": "johndoe",
      "instagram": "johndoe_music",
      "spotify": "spotify:artist:abc123",
      "soundcloud": null
    },
    "verified": true,
    "is_artist": true,
    "created_at": "2024-01-15T10:00:00Z",
    "total_tracks": 15,
    "total_plays": 45231,
    "total_likes": 3200,
    "total_downloads": 850,
    "total_followers": 2540,
    "total_following": 42
  }
]
```

> The response is an ordered array of up to 5 artists. No sensitive fields (password, email, `is_staff`, `is_active`) are exposed.

### Get Track Statistics

**Request:**
```bash
GET /api/tracks/track-uuid-1/stats
```

**Response:**
```json
{
  "track_id": "track-uuid-1",
  "daily_plays": {
    "2024-02-03": 45,
    "2024-02-04": 67
  },
  "total_unique_listeners": 98,
  "avg_listen_duration": 220.5,
  "completion_rate": 85.5,
  "updated_at": "2024-02-04T10:35:00Z"
}
```

### List Tracks with Filters

**Request:**
```bash
GET /api/tracks?genre=Electronic&published=true&sortBy=plays&sortOrder=desc&limit=10
```

### Search

**Request:**
```bash
GET /api/search?q=summer&type=all&limit=20
```

**Response:**
```json
{
  "tracks": [
    {
      "id": "track-uuid-1",
      "title": "Summer Vibes",
      "artist": "John Doe",
      "genre": "Electronic",
      "video_url": "https://youtube.com/watch?v=abc123",
      "lyrics": "Verse 1\n...",
      "plays": 150,
      "likes": 45
    }
  ],
  "users": [
    {
      "id": "user-uuid-1",
      "username": "john_doe",
      "display_name": "John Doe",
      "is_artist": true
    }
  ]
}
```

### Stream Audio

**Request:**
```bash
GET /api/tracks/track-uuid-1/stream/
```

**Response:**
```json
{
  "audio_url": "https://cdn.example.com/tracks/summer-vibes.mp3"
}
```

### Like a Track

**Request:**
```bash
POST /api/tracks/track-uuid-1/like
Content-Type: application/json

{
  "userId": "user-uuid-1"
}
```

**Response:**
```json
{
  "id": "like-uuid",
  "user_id": "user-uuid-1",
  "track_id": "track-uuid-1",
  "created_at": "2024-02-04T10:30:00Z"
}
```

---

## Database Models

### Genre
- `id` — UUID primary key
- `name` — unique display name (e.g. `"Hip Hop"`)
- `slug` — unique URL-safe identifier (e.g. `"hip-hop"`); auto-generated from `name` if not supplied
- `description` — optional long-form description
- `cover_url` — optional cover image URL
- `is_active` — only active genres are returned by the public list endpoint
- Timestamps: `created_at`, `updated_at`

### User
- Basic info: `username`, `email`, `password` (hashed)
- Profile: `display_name`, `bio`, `avatar_url`, `header_url`
- Social links: `twitter`, `instagram`, `spotify`, `soundcloud`
- Status: `verified`, `is_artist` *(automatically `true` after first track upload)*, `is_active`, `is_staff`
- Timestamps: `created_at`, `updated_at`

### Album
- Info: `title`, `artist`, `description`, `genre`
- Media: `cover_url`, `cover_gradient`
- Metadata: `release_date`, `published`
- Relationships: `user` (owner), `tracks` (one-to-many)

### Track
- Info: `title`, `artist`, `description`, `genre`, `mood`, `tags`
- Audio: `audio_url`, `file_size`, `duration`, `format`
- Video: `video_url` *(optional — externally hosted URL)*
- Lyrics: `lyrics` *(optional — plain text, newlines preserved)*
- Relationships: `user` (owner), `album` (optional)
- Media: `cover_url`, `waveform_data`
- Metadata: `bpm`, `key`
- Stats: `plays`, `likes`, `downloads`, `shares`
- Status: `published`, `published_at`
- **Visibility:** `visibility` — `"public"` (default) or `"private"`; controls who can view/stream/discover the track
- **Indexes:** `(user, published)`, `genre`, `-plays`, `-created_at`, `visibility`

### Like
- References: `user`, `track`
- Timestamp: `created_at`

### Download
- References: `user` (optional), `track`
- Metadata: `ip_address`, `user_agent`
- Timestamp: `created_at`

### Play
- References: `user` (optional), `track`
- Data: `duration`, `completed`
- Metadata: `ip_address`, `user_agent`
- Timestamp: `created_at`

### Follow
- References: `follower`, `following`
- Timestamp: `created_at`

### Playlist
- Info: `name`, `description`
- Visibility: `public` — when `true` the playlist appears on the owner's profile
- Link sharing: `share_token` (UUID, null until generated), `link_permission` (`"view"` or `"edit"`)
- Media: `cover_url`
- Relationships: `user` (owner), `tracks` (many-to-many through `PlaylistTrack`), `shares` (direct user grants)
- Timestamps: `created_at`, `updated_at`

Response fields vary by caller permission:
- **owner** — sees `share_token`, `shares` list, `shares_count`, and `my_permission: "owner"`
- **editor** — sees content; `my_permission: "edit"`; `share_token` and `shares` are `null`
- **viewer** — sees content; `my_permission: "view"`; `share_token` and `shares` are `null`

### PlaylistShare
- References: `playlist`, `shared_by` (granting user), `shared_with` (recipient)
- Permission: `permission` — `"view"` or `"edit"`
- Timestamps: `created_at`, `updated_at`
- Constraint: one grant per `(playlist, shared_with)` pair; re-sharing the same user updates the permission

### PlaylistTrack
- References: `playlist`, `track`
- Ordering: `order` (integer for track sequence)
- Timestamp: `added_at`

### AlbumShare
- References: `album`, `shared_by` (granting user), `shared_with` (recipient)
- Permission: `permission` — `"view"` or `"edit"`
- Timestamps: `created_at`, `updated_at`
- Constraint: one grant per `(album, shared_with)` pair; re-sharing the same user updates the permission
- Table: `album_shares`

### TrackShare
- References: `track`, `shared_by` (granting user), `shared_with` (recipient)
- Permission: `permission` — always `"view"` (currently the only level)
- Constraint: one grant per `(track, shared_with)` pair
- Timestamps: `created_at`, `updated_at`
- Enables track owners to share individual private tracks with specific users outside of playlists

### Notification
- **Table:** `notifications`
- **Purpose:** Stores in-app notification records for each user. Created automatically by Django signals — never by the API consumer directly
- **Core fields:** `recipient` (FK User), `actor` (FK User, nullable), `notification_type` (string), `is_read` (bool, default false)
- **Target info (denormalised):** `target_type` (`"track"` | `"album"` | `"playlist"`), `target_id` (UUID), `target_title` (string) — survives deletion of the original content
- **Actor info (denormalised):** `actor_username`, `actor_display_name`, `actor_avatar_url` — survives user deletion
- **Extensible payload:** `extra` (JSON) — e.g. `{"permission": "view"}` for share notifications
- **Indexes:** `(recipient, -created_at)`, `(recipient, is_read)` — fast unread queries
- **Lifecycle:** Read notifications are deleted immediately (mark-one-read or mark-all-read). There are no persistent "read" records

---

## Statistics & Analytics

### User Stats
- Total tracks uploaded
- Total plays across all tracks
- Total likes received
- Total downloads
- Follower / following counts
- Monthly unique listeners

### Track Stats
- Daily play counts
- Unique listener count
- Average listen duration
- Completion rate (% who listened to >80%)

---

## Sample API Usage

```bash
# 1. Create a user
curl -X POST http://localhost:5000/api/users/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "musicfan",
    "email": "fan@example.com",
    "password": "password123",
    "display_name": "Music Fan"
  }'

# 2. Login to get JWT token
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username_or_email": "fan@example.com",
    "password": "password123"
  }'

# 3. List genres (use for dropdowns)
curl http://localhost:5000/api/genres

# 3b. Get trending artists (top 5 by plays, with full profiles + stats)
curl http://localhost:5000/api/artists/trending

# 4. Create a public track (visibility defaults to "public")
curl -X POST http://localhost:5000/api/tracks/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "title": "Awesome Song",
    "artist": "Music Fan",
    "artist_slug": "music-fan",
    "genre": "Pop",
    "audio_duration": 180,
    "published": true,
    "video_url": "https://youtube.com/watch?v=xyz",
    "lyrics": "Verse 1\nHello world"
  }'

# 4b. Create a private track (owner-only access)
curl -X POST http://localhost:5000/api/tracks/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "title": "Secret Demo",
    "artist": "Music Fan",
    "artist_slug": "music-fan",
    "genre": "Pop",
    "audio_duration": 180,
    "published": true,
    "visibility": "private"
  }'

# 5. Create a playlist
curl -X POST http://localhost:5000/api/playlists \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Playlist",
    "description": "My favorite songs"
  }'

# 6. Add track to playlist
curl -X POST http://localhost:5000/api/playlists/PLAYLIST_UUID/add-track \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"track_id": "track-uuid"}'

# 7. Get playlist with tracks
curl -X GET http://localhost:5000/api/playlists/PLAYLIST_UUID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 8. Stream track audio
curl -X GET http://localhost:5000/api/tracks/TRACK_UUID/stream/

# 9. Like a track
curl -X POST http://localhost:5000/api/tracks/TRACK_UUID/like \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-uuid"}'

# 10. Get user statistics
curl http://localhost:5000/api/users/user-uuid/stats

# 11. Search tracks and users
curl "http://localhost:5000/api/search?q=summer&type=all&limit=20"

# 12. Share a private track with a specific user
curl -X POST http://localhost:5000/api/tracks/TRACK_UUID/shares \
  -H "Authorization: Bearer OWNER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username": "bob"}'

# 12b. List shares on a track
curl http://localhost:5000/api/tracks/TRACK_UUID/shares \
  -H "Authorization: Bearer OWNER_JWT_TOKEN"

# 12c. Revoke a track share
curl -X DELETE http://localhost:5000/api/tracks/TRACK_UUID/shares/SHARE_UUID \
  -H "Authorization: Bearer OWNER_JWT_TOKEN"

# 12d. Toggle track visibility from private back to public
curl -X PATCH http://localhost:5000/api/tracks/TRACK_UUID \
  -H "Authorization: Bearer OWNER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"visibility": "public"}'

# 13. Share a playlist with a specific user (view-only)
curl -X POST http://localhost:5000/api/playlists/PLAYLIST_UUID/shares \
  -H "Authorization: Bearer OWNER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username": "bob", "permission": "view"}'

# 13b. Upgrade that user to edit access
curl -X PATCH http://localhost:5000/api/playlists/PLAYLIST_UUID/shares/SHARE_UUID \
  -H "Authorization: Bearer OWNER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permission": "edit"}'

# 14. Generate a shareable link (view-only by default)
curl -X POST http://localhost:5000/api/playlists/PLAYLIST_UUID/link \
  -H "Authorization: Bearer OWNER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permission": "view"}'
# Returns: {"share_token": "uuid", "link_permission": "view"}

# 15. Anyone (even unauthenticated) accesses the playlist via that link
curl http://localhost:5000/api/playlists/link/TOKEN_UUID

# 16. Alternatively, access the regular playlist endpoint with the token as a query param
curl "http://localhost:5000/api/playlists/PLAYLIST_UUID?token=TOKEN_UUID"

# 17. List playlists shared with me
curl http://localhost:5000/api/playlists/shared-with-me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 18. View a user's public playlists (on their profile)
curl http://localhost:5000/api/users/USER_UUID/playlists

# 19. Revoke the share link
curl -X DELETE http://localhost:5000/api/playlists/PLAYLIST_UUID/link \
  -H "Authorization: Bearer OWNER_JWT_TOKEN"

# 20. Revoke a direct user share
curl -X DELETE http://localhost:5000/api/playlists/PLAYLIST_UUID/shares/SHARE_UUID \
  -H "Authorization: Bearer OWNER_JWT_TOKEN"

# 21. Share an album with a specific user (edit access)
curl -X POST http://localhost:5000/api/albums/ALBUM_UUID/shares \
  -H "Authorization: Bearer OWNER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username": "bob", "permission": "edit"}'

# 21b. Downgrade that user to view-only
curl -X PATCH http://localhost:5000/api/albums/ALBUM_UUID/shares/SHARE_UUID \
  -H "Authorization: Bearer OWNER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permission": "view"}'

# 21c. List all shares on an album
curl http://localhost:5000/api/albums/ALBUM_UUID/shares \
  -H "Authorization: Bearer OWNER_JWT_TOKEN"

# 21d. Revoke an album share
curl -X DELETE http://localhost:5000/api/albums/ALBUM_UUID/shares/SHARE_UUID \
  -H "Authorization: Bearer OWNER_JWT_TOKEN"

# 22. See all albums I've shared (one entry per recipient)
curl http://localhost:5000/api/albums/shared-by-me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 23. See all albums shared with me
curl http://localhost:5000/api/albums/shared-with-me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 24. See all tracks I've shared (one entry per recipient)
curl http://localhost:5000/api/tracks/shared-by-me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 25. See all tracks shared with me
curl http://localhost:5000/api/tracks/shared-with-me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 26. See all playlists I've shared (one entry per recipient)
curl http://localhost:5000/api/playlists/shared-by-me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 27. Reorder tracks within an album (owner only)
curl -X PATCH http://localhost:5000/api/albums/ALBUM_UUID/reorder \
  -H "Authorization: Bearer OWNER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"id": "track-uuid-1", "order": 0}, {"id": "track-uuid-2", "order": 1}, {"id": "track-uuid-3", "order": 2}]'

# 28. Check unread notification count (good for polling / badge updates)
curl http://localhost:5000/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Returns: {"unread_count": 5}

# 29. List all notifications (latest first)
curl http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 29b. List only unread notifications, capped at 10
curl "http://localhost:5000/api/notifications?unread=true&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 30. Mark a single notification as read (deletes it)
curl -X POST http://localhost:5000/api/notifications/NOTIF_UUID/read \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 31. Mark all notifications as read (bulk delete)
curl -X POST http://localhost:5000/api/notifications/mark-all-read \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Returns: {"success": true, "deleted": 5}
```