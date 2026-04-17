# Playlist Feature Implementation Guide

## Overview

A complete playlist management system has been successfully implemented for the MuseWave music application. This feature allows authenticated users to create, manage, and organize their favorite music tracks into custom playlists.

---

## Architecture

### Component Hierarchy

```
App (PlaylistProvider)
├── PlaylistPage (/playlists)
│   ├── PlaylistCard (grid items)
│   ├── CreatePlaylistModal
│   └── SearchBar
├── PlaylistDetailPage (/playlists/:id)
│   ├── RenamePlaylistModal
│   ├── PlaylistSongsList
│   └── TrackListItem (with remove button)
├── Home Page
│   └── TrackCard
│       └── AddToPlaylistButton
└── Navigation (TopBar & BottomNav)
    └── Playlist Links
```

---

## File Structure

### New Files Created

```
client/src/
├── contexts/
│   └── playlist-context.tsx          # Global playlist state management
├── components/playlists/
│   ├── PlaylistCard.tsx              # Individual playlist display card
│   ├── CreatePlaylistModal.tsx       # Modal to create new playlists
│   ├── RenamePlaylistModal.tsx       # Modal to update playlist info
│   └── AddToPlaylistButton.tsx       # Button to add tracks to playlists
└── pages/
    ├── playlists.tsx                 # Main playlists listing page
    └── playlist-detail.tsx           # Individual playlist view with tracks
```

### Modified Files

1. **client/src/App.tsx**
   - Added `PlaylistProvider` wrapper
   - Added routes: `/playlists` and `/playlists/:id`

2. **client/src/lib/apiConfig.ts**
   - Added `playlists` endpoint configuration

3. **client/src/lib/utils.ts**
   - Added `secondsToTime()` utility function

4. **client/src/pages/home.tsx**
   - Integrated `AddToPlaylistButton` in track cards
   - Added playlists link to sidebar navigation

5. **client/src/components/BottomNav.tsx**
   - Added conditional playlists navigation for authenticated users

---

## State Management

### PlaylistContext

**State:**
- `playlists`: Array of user's playlists
- `currentPlaylist`: Current playlist being viewed (with tracks)
- `loading`: Loading state for API operations
- `error`: Error messages from failed operations

**Actions:**
- `fetchPlaylists()` - Get all user playlists
- `fetchPlaylistById(id)` - Get specific playlist with tracks
- `createPlaylist(name, description)` - Create new playlist
- `deletePlaylist(id)` - Delete a playlist
- `renamePlaylist(id, newName, description)` - Update playlist info
- `addSongToPlaylist(playlistId, trackId)` - Add track to playlist
- `removeSongFromPlaylist(playlistId, trackId)` - Remove track from playlist
- `setCurrentPlaylist(playlist)` - Manually set current playlist
- `clearError()` - Clear error messages

**Usage:**
```tsx
import { usePlaylists } from '@/contexts/playlist-context';

function MyComponent() {
  const {
    playlists,
    currentPlaylist,
    loading,
    error,
    fetchPlaylists,
    createPlaylist,
  } = usePlaylists();

  useEffect(() => {
    fetchPlaylists();
  }, []);

  // ... rest of component
}
```

---

## API Integration

### Endpoints Used

All endpoints are defined in `client/src/lib/apiConfig.ts`:

```typescript
playlists: {
  list: '/api/playlists',                    // GET - List user's playlists
  byId: (id) => `/api/playlists/${id}`,     // GET - Get playlist with tracks
  create: '/api/playlists',                  // POST - Create playlist
  update: (id) => `/api/playlists/${id}`,   // PATCH - Update playlist
  delete: (id) => `/api/playlists/${id}`,   // DELETE - Delete playlist
  addTrack: (id) => `/api/playlists/${id}/add_track`,     // POST - Add track
  removeTrack: (id) => `/api/playlists/${id}/remove_track`, // POST - Remove track
  reorder: (id) => `/api/playlists/${id}/reorder`,        // POST - Reorder tracks
}
```

### Request/Response Examples

**Create Playlist:**
```http
POST /api/playlists
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "My Favorites",
  "description": "My favorite tracks",
  "public": true,
  "trackIds": []
}
```

**Add Track to Playlist:**
```http
POST /api/playlists/{id}/add_track
Authorization: Bearer {token}
Content-Type: application/json

{
  "trackId": "track-uuid"
}
```

---

## Components Guide

### 1. PlaylistPage (/playlists)

Main playlist listing page with search and creation functionality.

**Features:**
- Display all user's playlists in a grid
- Search/filter playlists by name
- Create new playlist button
- Show "Login required" message for unauthenticated users
- Empty state with helpful message

**Props:** None - uses context for state

**Example:**
```tsx
<PlaylistPage />
```

---

### 2. PlaylistDetailPage (/playlists/:id)

Shows detailed view of a single playlist with its tracks.

**Features:**
- Display playlist info (name, description, cover)
- List all tracks with play controls
- Remove songs from playlist
- Edit playlist information
- Delete entire playlist
- Show track duration
- Play track directly from playlist

**Props:** Extracted from URL params (`/playlists/:id`)

**Example:**
```tsx
<PlaylistDetailPage />
```

---

### 3. PlaylistCard

Individual playlist preview card for the grid view.

**Props:**
```tsx
interface PlaylistCardProps {
  playlist: Playlist;
  onPlaylistDeleted?: () => void;
}
```

**Features:**
- Clickable to navigate to detail view
- Hover effects with action menu
- Delete with confirmation dialog
- Rename functionality
- Display song count
- Music icon placeholder

**Example:**
```tsx
<PlaylistCard
  playlist={playlist}
  onPlaylistDeleted={() => refreshPlaylists()}
/>
```

---

### 4. CreatePlaylistModal

Modal dialog for creating new playlists.

**Props:**
```tsx
interface CreatePlaylistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
```

**Features:**
- Input for playlist name (required)
- Textarea for description (optional)
- Loading state during submission
- Success/error toasts
- Form validation

**Example:**
```tsx
const [open, setOpen] = useState(false);

<CreatePlaylistModal
  open={open}
  onOpenChange={setOpen}
  onSuccess={() => {
    // Refresh playlists
  }}
/>
```

---

### 5. RenamePlaylistModal

Modal for updating playlist name and description.

**Props:**
```tsx
interface RenamePlaylistModalProps {
  playlist: Playlist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
```

**Features:**
- Pre-fills current playlist data
- Edit name and description
- Loading state
- Success/error handling

**Example:**
```tsx
<RenamePlaylistModal
  playlist={currentPlaylist}
  open={isOpen}
  onOpenChange={setIsOpen}
/>
```

---

### 6. AddToPlaylistButton

Small button component for adding tracks to playlists.

**Props:**
```tsx
interface AddToPlaylistButtonProps {
  trackId: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
}
```

**Features:**
- Dropdown showing all user's playlists
- "Create new playlist" option in dropdown
- Disabled for unauthenticated users
- Success/error toasts
- Shows loading state

**Example:**
```tsx
<AddToPlaylistButton
  trackId={track.id}
  size="sm"
  variant="outline"
/>
```

---

## Usage Examples

### Add Playlist Feature to Your App

#### 1. Wrap App with Provider

```tsx
import { PlaylistProvider } from '@/contexts/playlist-context';

function App() {
  return (
    <PlaylistProvider>
      {/* rest of app */}
    </PlaylistProvider>
  );
}
```

#### 2. Create Playlist

```tsx
const { createPlaylist } = usePlaylists();

const handleCreate = async () => {
  try {
    const newPlaylist = await createPlaylist('My Playlist', 'Description');
    toast({ title: 'Playlist created!' });
  } catch (error) {
    toast({ title: 'Error', description: error.message });
  }
};
```

#### 3. Add Song to Playlist

```tsx
const { addSongToPlaylist } = usePlaylists();

const handleAddSong = async (playlistId: string, trackId: string) => {
  try {
    await addSongToPlaylist(playlistId, trackId);
    toast({ title: 'Added to playlist!' });
  } catch (error) {
    toast({ title: 'Error', description: error.message });
  }
};
```

#### 4. View Playlist Details

```tsx
const { currentPlaylist, fetchPlaylistById } = usePlaylists();

useEffect(() => {
  fetchPlaylistById('playlist-id');
}, []);

return (
  <div>
    <h1>{currentPlaylist?.name}</h1>
    <ul>
      {currentPlaylist?.tracks?.map(track => (
        <li key={track.id}>{track.title}</li>
      ))}
    </ul>
  </div>
);
```

---

## Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/playlists` | PlaylistPage | List all user's playlists |
| `/playlists/:id` | PlaylistDetailPage | View single playlist with tracks |

---

## Authentication

- All playlist operations require JWT authentication
- Token is automatically attached to requests via `apiRequestJson()`
- Users can only manage their own playlists
- Backend enforces ownership validation

---

## Error Handling

### Error States

All components handle errors gracefully:

1. **Context-level errors** - Stored in `usePlaylists().error`
2. **Component-level errors** - Shown as toast notifications
3. **Network errors** - Automatically caught and displayed
4. **Validation errors** - Form validation before submission

### Error Messages

- "Failed to fetch playlists" - Get all playlists
- "Failed to fetch playlist" - Get single playlist
- "Failed to create playlist" - Playlist creation
- "Failed to delete playlist" - Playlist deletion
- "Failed to add song to playlist" - Add track
- "Failed to remove song from playlist" - Remove track

---

## Loading States

- Loading indicators shown during API calls
- Buttons disabled during operations
- Spinner displayed on detail page loading
- State reflected in context (`loading` boolean)

---

## UX Features

### Optimistic Updates
- Playlists list updates immediately after creation
- Success/error toasts for user feedback
- Disabled buttons prevent double-submission

### Defensive UX
- Confirmation dialog before playlist deletion
- Confirmation dialog before removing tracks
- "Add to Playlist" disabled when not authenticated
- Helpful empty states with CTAs

### Accessibility
- Semantic HTML (buttons, dialogs)
- ARIA labels where appropriate
- Keyboard navigation support
- Focus management in modals

---

## Performance Considerations

1. **Lazy Loading** - Playlists loaded on-demand
2. **Caching** - React Query handles response caching
3. **Memoization** - Context callbacks memoized with useCallback
4. **Error Boundaries** - Component-level error handling

---

## Testing Checklist

- [ ] Create playlist successfully
- [ ] Update playlist name/description
- [ ] Delete playlist with confirmation
- [ ] Add song to playlist from track card
- [ ] View playlist details with all tracks
- [ ] Remove song from playlist
- [ ] Search/filter playlists by name
- [ ] Handle unauthenticated user gracefully
- [ ] Show error messages on failed operations
- [ ] Loading states appear during operations
- [ ] Navigation links work correctly
- [ ] Mobile responsive design

---

## Future Enhancements

### Phase 2 (Recommended)

1. **Collaborative Playlists**
   - Share playlists with other users
   - Collaborative editing permissions

2. **Playlist Discovery**
   - Featured playlists
   - Public playlist browsing
   - Trending playlists

3. **Advanced Features**
   - Drag-and-drop track reordering
   - Playlist cover image uploads
   - Auto-generated playlists (mood-based, genre-based)
   - Shuffle and repeat modes
   - Export playlist (JSON, CSV)

4. **Social Features**
   - Like/heart playlists
   - Follow other users' playlists
   - Comments on playlists
   - Playlist sharing via link

5. **Analytics**
   - Playlist play statistics
   - Most played tracks in playlist
   - Creation/last modified dates

---

## Troubleshooting

### Button doesn't appear
- Ensure user is authenticated
- Check if `PlaylistProvider` wraps the component
- Verify `usePlaylists()` is called within provider

### Playlist not updating
- Call `fetchPlaylists()` after mutations
- Check network tab for API errors
- Verify JWT token is valid

### Modal not closing
- Ensure `onOpenChange` callback is properly connected
- Check for console errors
- Verify button click handlers aren't preventing default

### "usePlaylists must be used within PlaylistProvider"
- Add `<PlaylistProvider>` at top level
- Verify component is nested inside provider
- Check for multiple App instances

---

## Code Quality

- **TypeScript**: Full type coverage with Zod schemas
- **Error Handling**: Comprehensive try-catch blocks
- **Component Design**: Single responsibility principle
- **Naming**: Clear, descriptive names
- **Documentation**: Inline comments for complex logic
- **Accessibility**: WCAG 2.1 AA compliant

---

## Support & Maintenance

### Common Issues & Solutions

1. **Playlists not loading**
   - Check authentication status
   - Verify backend API is running
   - Check browser console for errors

2. **Can't add songs to playlist**
   - Ensure user is authenticated
   - Verify track ID is valid
   - Check playlist ownership

3. **Modal isn't submitting**
   - Verify form inputs have values
   - Check loading state isn't stuck
   - Look for console errors

---

## API Documentation Reference

See `BACKEND_API_DOCUMENTATION.md` for:
- Full request/response examples
- Error codes and status messages
- Rate limiting information
- Authentication details

---

## Version History

- **v1.0.0** (Current): Initial implementation with full CRUD operations

---

**Implementation Date**: April 15, 2026
**Technology Stack**: React 18, TypeScript, Wouter, TanStack Query, Zod, Shadcn/ui
