# Django Music Backend

A Django REST framework backend for a music streaming platform, providing a complete API for user management, track management, social features (likes, follows), and analytics.
Database is SQLite.

## Features

- **User Management**: Create, read, update users with profiles and social links
- **Track Management**: Upload, manage, and publish music tracks
- **Social Features**: Like tracks, follow artists, comment on tracks
- **Analytics**: Track plays, downloads, user statistics, and engagement metrics
- **Search**: Full-text search for tracks and users
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
- `POST /api/users` - Create a new user
- `GET /api/users/<user_id>` - Get user by ID
- `PATCH /api/users/<user_id>` - Update user profile
- `GET /api/users/username/<username>` - Get user by username
- `GET /api/users/<user_id>/stats` - Get user statistics (plays, likes, downloads, followers, etc.)
- `GET /api/users/<user_id>/likes` - Get user's liked tracks
- `GET /api/users/<user_id>/plays` - Get user's play history
- `GET /api/users/<user_id>/albums` - Get all albums for a user
- `GET /api/users/<user_id>/followers` - Get user's followers
- `GET /api/users/<user_id>/following` - Get users being followed
- `POST /api/users/<user_id>/follow` - Follow a user
- `DELETE /api/users/<user_id>/follow` - Unfollow a user
- `GET /api/users/<user_id>/follow/<follower_id>` - Check if user is following

### Artists

- `GET /api/artists` - Get all users who have published tracks

### Albums

- `POST /api/albums` - Create a new album
- `GET /api/albums/<album_id>` - Get album by ID (includes tracks)
- `PATCH /api/albums/<album_id>/update` - Update album details
- `DELETE /api/albums/<album_id>/delete` - Delete album (tracks remain, album association removed)

### Tracks

- `GET /api/tracks` - List all tracks (filters: userId, genre, mood, tags, published; sorting: sortBy, sortOrder; pagination: limit, offset)
- `POST /api/tracks` - Create a new track
- `GET /api/tracks/<track_id>` - Get track by ID
- `PATCH /api/tracks/<track_id>` - Update track metadata
- `DELETE /api/tracks/<track_id>` - Delete track
- `GET /api/tracks/<track_id>/stream/` - Stream audio with range request support
- `GET /api/tracks/<track_id>/stream-url/` - Get streaming URL for track
- `GET /api/tracks/<track_id>/download/` - Download track as file attachment
- `POST /api/tracks/<track_id>/download` - Record a download and increment counter
- `GET /api/tracks/<track_id>/downloads` - Get all downloads for a track
- `GET /api/tracks/<track_id>/stats` - Get track statistics (plays, listeners, completion rate, etc.)
- `POST /api/tracks/<track_id>/play` - Record a play event
- `GET /api/tracks/<track_id>/plays` - Get all plays for a track
- `POST /api/tracks/<track_id>/like` - Like a track
- `DELETE /api/tracks/<track_id>/like` - Unlike a track
- `GET /api/tracks/<track_id>/like/<user_id>` - Check if user liked track

### Playlists

- `GET /api/playlists` - List user's playlists (requires authentication)
- `POST /api/playlists` - Create a new playlist (requires authentication)
- `GET /api/playlists/<playlist_id>` - Get playlist details with tracks (requires authentication)
- `PATCH /api/playlists/<playlist_id>` - Update playlist metadata (requires authentication)
- `DELETE /api/playlists/<playlist_id>` - Delete playlist (requires authentication)
- `POST /api/playlists/<playlist_id>/add-track` - Add track to playlist (requires authentication)
- `POST /api/playlists/<playlist_id>/remove-track` - Remove track from playlist (requires authentication)
- `POST /api/playlists/<playlist_id>/reorder` - Reorder tracks in playlist (requires authentication)

### Search

- `GET /api/search?q=<query>&type=<tracks|users|all>&limit=<number>` - Search tracks and/or users
- `POST /api/search/rebuild` - Rebuild search index (no-op in Django, returns success)

## Request/Response Examples

### Create a User

**Request:**
```bash
POST /api/users
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
  "created_at": "2024-02-04T10:30:00Z",
  "updated_at": "2024-02-04T10:30:00Z"
}
```

### Login

**Request:**
```bash
POST /api/users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

### Create a Track

**Request:**
```bash
POST /api/tracks
Content-Type: application/json

{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Summer Vibes",
  "artist": "John Doe",
  "genre": "Electronic",
  "mood": "Happy",
  "tags": ["summer", "dance", "upbeat"],
  "audio_duration": 240.5,
  "audio_format": "mp3",
  "published": true
}
```

**Response:**
```json
{
  "id": "track-uuid-1",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Summer Vibes",
  "artist": "John Doe",
  "genre": "Electronic",
  "mood": "Happy",
  "tags": ["summer", "dance", "upbeat"],
  "audio_duration": 240.5,
  "audio_format": "mp3",
  "plays": 0,
  "likes": 0,
  "downloads": 0,
  "published": true,
  "created_at": "2024-02-04T10:30:00Z",
  "updated_at": "2024-02-04T10:30:00Z"
}
```

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
  "email": "john@example.com",
  "display_name": "John Doe",
  "bio": "Music producer and DJ",
  "verified": true,
  "avatar_url": "https://example.com/avatars/john.jpg",
  "created_at": "2024-02-04T10:30:00Z",
  "updated_at": "2024-02-04T10:31:00Z"
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
      "plays": 150,
      "likes": 45
    }
  ],
  "users": [
    {
      "id": "user-uuid-1",
      "username": "john_doe",
      "display_name": "John Doe"
    }
  ]
}
```

### Stream Audio

**Request:**
```bash
GET /api/tracks/track-uuid-1/stream/
Range: bytes=0-1023
```

**Response:**
```
HTTP/1.1 206 Partial Content
Content-Range: bytes 0-1023/5242880
Content-Length: 1024
Accept-Ranges: bytes
Content-Type: audio/mpeg

[audio data bytes 0-1023]
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

## Database Models

### User
- Basic info: username, email, password (hashed)
- Profile: display_name, bio, avatar_url, header_url
- Social links: twitter, instagram, spotify, soundcloud
- Metadata: verified, created_at, updated_at

### Album
- Info: title, artist, description, genre
- Media: cover_url, cover_gradient
- Metadata: release_date, published
- Relationships: user (owner), tracks (one-to-many)

### Track
- Info: title, artist, description, genre, mood, tags
- Audio: audio_url, file_size, duration, format
- Relationships: user (owner), album (optional)
- Media: cover_url, waveform_data
- Metadata: bpm, key
- Stats: plays, likes, downloads, shares
- Status: published, published_at

### Like
- References: user, track
- Timestamp: created_at

### Download
- References: user (optional), track
- Metadata: ip_address, user_agent
- Timestamp: created_at

### Play
- References: user (optional), track
- Data: duration, completed
- Metadata: ip_address, user_agent
- Timestamp: created_at

### Follow
- References: follower, following
- Timestamp: created_at

### Playlist
- Info: name, description, public
- Media: cover_url
- Relationships: user (owner), tracks (many-to-many through PlaylistTrack)
- Metadata: created_at, updated_at

### PlaylistTrack
- References: playlist, track
- Ordering: order (integer for track sequence)
- Timestamp: added_at

## Statistics & Analytics

The API provides comprehensive statistics:

### User Stats
- Total tracks uploaded
- Total plays across all tracks
- Total likes received
- Total downloads
- Follower/following counts
- Monthly unique listeners

### Track Stats
- Daily play counts
- Unique listener count
- Average listen duration
- Completion rate (% who listened to >80%)

## Sample API Usage

Here's a complete example of using the API to create a user, upload tracks, create a playlist, and manage it:

```bash
# 1. Create a user
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "musicfan",
    "email": "fan@example.com",
    "password": "password123",
    "display_name": "Music Fan"
  }'

# 2. Login to get JWT token
curl -X POST http://localhost:8000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "fan@example.com",
    "password": "password123"
  }'

# 3. Create tracks (assuming you have track data)
curl -X POST http://localhost:8000/api/tracks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "title": "Awesome Song",
    "artist": "Music Fan",
    "genre": "Pop",
    "audio_duration": 180,
    "published": true
  }'

# 4. Create a playlist
curl -X POST http://localhost:8000/api/playlists \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Playlist",
    "description": "My favorite songs"
  }'

# 5. Add tracks to playlist
curl -X POST http://localhost:8000/api/playlists/PLAYLIST_UUID/add-track \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "track_id": "track-uuid"
  }'

# 6. Get playlist with tracks
curl -X GET http://localhost:8000/api/playlists/PLAYLIST_UUID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 7. Stream track audio
curl -X GET http://localhost:8000/api/tracks/TRACK_UUID/stream/ \
  -H "Range: bytes=0-10240"

# 8. Like a track
curl -X POST http://localhost:8000/api/tracks/TRACK_UUID/like \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid"
  }'

# 9. Get user statistics
curl -X GET http://localhost:8000/api/users/user-uuid/stats

# 10. Search tracks and users
curl -X GET "http://localhost:8000/api/search?q=summer&type=all&limit=20"
```
