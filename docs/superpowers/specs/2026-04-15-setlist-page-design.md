# Setlist Page Design

**Route:** `/setlist` (hidden page, not linked from main site nav — shared via direct URL)  
**Audience:** Potential clients browsing what LME offers before booking  
**Pattern:** Follows the same hidden-page approach as `/bookingform`

## Page Structure

### 1. Header
- LME logo (same as booking form: `/images/logos/lme-typo-white.png`)
- Title: "Set List"
- Subtitle: "19 booking-ready medleys — browse by vibe, listen to samples"
- Centered layout, consistent with booking form page styling

### 2. Filter Pills
Horizontally scrollable pill buttons to filter medleys by genre/tag. One medley can belong to one genre category.

**Genre filters:**
- All (default, shows count)
- Soca
- Dancehall
- Afrobeats
- RnB
- Throwbacks
- Reggae
- Gospel

**Special filter:**
- "Has Audio" — filters to only medleys with a SoundCloud link (styled differently with teal border)

Clicking a genre pill filters the accordion list. "All" resets. Only one filter active at a time.

### 3. Medley Accordion
A vertical list of 19 booking-ready medleys. Each row is collapsible.

**Collapsed state shows:**
- Colour-coded accent bar on the left (per genre — see Genre Colours below)
- Medley name
- Track count + genre label
- 🎧 icon if SoundCloud audio is available
- Chevron indicator (▶ collapsed, ▼ expanded)

**Expanded state shows:**
- Header background changes to dark teal (`#0d1f1d`) with teal border
- If audio available: mini SoundCloud embed (compact player bar) + "Open in SC" link that opens SoundCloud in new tab
- Full track list: song name (left) and artist (right), separated by subtle dividers
- All tracks shown (no truncation)

**Interaction:**
- Click anywhere on the header to toggle expand/collapse
- Only one medley expanded at a time (opening one closes the previous)
- Smooth height animation on expand/collapse

### 4. CTA Footer
- Separator line
- Text: "Want a tailored set for your event?"
- Button: "Book LME" linking to `/bookingform`
- Consistent with site's teal CTA button styling

## Genre Colours (Accent Bars)
Each genre has a distinct colour for the left accent bar:

| Genre | Colour | Hex |
|-------|--------|-----|
| Soca | Amber | `#f59e0b` |
| Afrobeats | Purple | `#a855f7` |
| Dancehall | Green | `#22c55e` |
| RnB | Red | `#ef4444` |
| Throwbacks | Blue | `#3b82f6` |
| Reggae | Emerald | `#10b981` |
| Gospel | Gold | `#eab308` |

## Genre Assignments for Medleys

| Medley | Genre | Has Audio |
|--------|-------|-----------|
| Soca Entry | Soca | No |
| Love the Afro (2024) | Afrobeats | No |
| Original Dancehall (2024) | Dancehall | No |
| Nostalgia (UK Throwbacks) | Throwbacks | No |
| Afrobeats Medley | Afrobeats | No |
| Just Dance (90s/00s Dance) | Throwbacks | No |
| Channel Surf (Theme Tunes) | Throwbacks | Yes |
| Evolution of Music (70s to 10s) | Throwbacks | No |
| RnB | RnB | No |
| Lovers Lane (Reggae) | Reggae | No |
| Gospel Entry | Gospel | No |
| CD Burn Unit (2000s RnB) | RnB | Yes |
| Heavy Hitterz | RnB | Yes |
| Caribbean Way | Dancehall | No |
| Cassette Culture | Throwbacks | No |
| 2025 Highlights | Throwbacks | No |
| GBNF BET Awards Style | RnB | No |
| Burna / Rema / Afro 25 | Afrobeats | No |
| Big Dansa (Soca 25) | Soca | No |

## SoundCloud Integration

Three medleys currently have SoundCloud tracks on `soundcloud.com/lme-band`:

1. **Channel Surf** — "Channel Surf (90s/00s Theme tunes)"
2. **Heavy Hitterz** — "Heavy Hitterz (90s/00s Mix) + Just Dance"
3. **CD Burn Unit** — "CD Burn Unit(00s Mix) - Chelsies Bday Party"

**Implementation:**
- Use the SoundCloud oEmbed API or direct iframe embed URLs for the compact player
- Each medley with audio gets a `soundcloudUrl` field in its data
- Mini player: compact SoundCloud iframe (small bar, no waveform visual)
- "Open in SC" link: opens the track URL in a new tab

## Data Structure

All medley data lives in a single data file (e.g. `src/lib/setlist-data.ts`):

```ts
type Medley = {
  name: string;
  genre: Genre;
  songs: { title: string; artist: string }[];
  soundcloudUrl?: string; // full track URL on SoundCloud
};
```

## Scope — Only Booking-Ready Medleys

The page shows only the 19 "booking ready" medleys. The 9 "in development" medleys from the catalogue are excluded — they aren't useful to potential clients.

## Technical Notes

- **Route:** `src/app/setlist/page.tsx` — client component (accordion interactivity)
- **Data:** `src/lib/setlist-data.ts` — typed medley data array
- **Styling:** Tailwind classes, matching the existing dark theme (`lme-black`, `lme-white`, `teal-primary`, etc.)
- **Fonts:** Uses existing font variables (Bebas Neue for display, Syne for body)
- **No API needed** — all data is static, hardcoded in the data file
- **Mobile responsive** — filter pills horizontally scroll, accordion fills width
- **SEO metadata:** title "LME — Set List", description about browsing the repertoire
