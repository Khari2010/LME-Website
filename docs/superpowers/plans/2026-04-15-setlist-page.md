# Setlist Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive `/setlist` page with a filtered accordion of LME's 19 booking-ready medleys, SoundCloud mini-players for 3 tracks, and a CTA to the booking form.

**Architecture:** Static data file with all 19 medleys → client component page with filter pills and accordion → SoundCloud iframe embeds for medleys with audio. No API routes needed. Follows the same hidden-page pattern as `/bookingform`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, SoundCloud iframe embed

---

### Task 1: Create the medley data file

**Files:**
- Create: `src/lib/setlist-data.ts`

- [ ] **Step 1: Create `src/lib/setlist-data.ts` with types and all 19 medleys**

```ts
export const GENRES = [
  "Soca",
  "Afrobeats",
  "Dancehall",
  "RnB",
  "Throwbacks",
  "Reggae",
  "Gospel",
] as const;

export type Genre = (typeof GENRES)[number];

export const GENRE_COLOURS: Record<Genre, string> = {
  Soca: "#f59e0b",
  Afrobeats: "#a855f7",
  Dancehall: "#22c55e",
  RnB: "#ef4444",
  Throwbacks: "#3b82f6",
  Reggae: "#10b981",
  Gospel: "#eab308",
};

export type Song = {
  title: string;
  artist: string;
};

export type Medley = {
  name: string;
  genre: Genre;
  songs: Song[];
  soundcloudUrl?: string;
};

export const MEDLEYS: Medley[] = [
  {
    name: "Soca Entry",
    genre: "Soca",
    songs: [
      { title: "Hot Hot Hot", artist: "Arrow" },
      { title: "Nani Whine", artist: "Crazy" },
      { title: "Dollar Whine", artist: "Mr. Vegas / Collin Lucas" },
      { title: "Holiday", artist: "Problem Child" },
      { title: "Mind Your Funky Business", artist: "Fimba" },
      { title: "Mind My Business", artist: "Patrice Roberts" },
      { title: "Run Wid It", artist: "Mr. Killa" },
      { title: "Follow Da Leader", artist: "The Soca Boys" },
      { title: "It's Carnival", artist: "Machel Montano" },
      { title: "Jump", artist: "Rupee" },
      { title: "Famalay", artist: "Skinny Fabulous, Machel Montano & Bunji Garlin" },
    ],
  },
  {
    name: "Love the Afro (2024)",
    genre: "Afrobeats",
    songs: [
      { title: "Love Me JeJe", artist: "Tems" },
      { title: "Soh Soh", artist: "Odeal" },
      { title: "Essence", artist: "Wizkid ft. Tems" },
      { title: "Monalisa", artist: "Lojay & Sarz" },
      { title: "Yahyuppiyah", artist: "Uncle Waffles, Tony Duardo & Justin99 ft. Pcee, EeQue & Chley" },
      { title: "Unavailable", artist: "Davido ft. Musa Keys" },
      { title: "Anybody", artist: "Burna Boy" },
    ],
  },
  {
    name: "Original Dancehall (2024)",
    genre: "Dancehall",
    songs: [
      { title: "Jump", artist: "Tyla" },
      { title: "Bubble Gum", artist: "Valiant" },
      { title: "Continental", artist: "Nigy Boy" },
      { title: "Talibans II", artist: "Byron Messia & Burna Boy" },
      { title: "Drift", artist: "Teejay" },
      { title: "Ravers Gas", artist: "Ding Dong" },
      { title: "Ambala", artist: "Squash" },
      { title: "Mad Out", artist: "Valiant" },
      { title: "Crocodile Teeth", artist: "Skillibeng" },
      { title: "Speed Off", artist: "Valiant" },
      { title: "Verified Choppa 2", artist: "Marksman" },
      { title: "Brrp", artist: "Skeng" },
    ],
  },
  {
    name: "Nostalgia (UK Throwbacks)",
    genre: "Throwbacks",
    songs: [
      { title: "Fireflies", artist: "Owl City" },
      { title: "A Thousand Years", artist: "Christina Perri" },
      { title: "Year 3000", artist: "Busted" },
      { title: "Wannabe", artist: "Spice Girls" },
      { title: "Rock DJ", artist: "Robbie Williams" },
      { title: "Murder on the Dancefloor", artist: "Sophie Ellis-Bextor" },
      { title: "Spinning Around", artist: "Kylie Minogue" },
      { title: "Don't Stop the Music", artist: "Rihanna" },
      { title: "Closer", artist: "Ne-Yo" },
      { title: "Bonkers", artist: "Dizzee Rascal" },
    ],
  },
  {
    name: "Afrobeats Medley",
    genre: "Afrobeats",
    songs: [
      { title: "Mood", artist: "Wizkid ft. BNXN" },
      { title: "Kilometre", artist: "Burna Boy" },
      { title: "Dumebi", artist: "Rema" },
      { title: "Kelebu", artist: "Rema" },
      { title: "Ozeba", artist: "Rema" },
    ],
  },
  {
    name: "Just Dance (90s/00s Dance)",
    genre: "Throwbacks",
    songs: [
      { title: "Whoomp! (There It Is)", artist: "Tag Team" },
      { title: "Gonna Make You Sweat (Everybody Dance Now)", artist: "C+C Music Factory" },
      { title: "I'm Every Woman", artist: "Whitney Houston" },
      { title: "Free", artist: "Ultra Nate" },
      { title: "Red Alert", artist: "Basement Jaxx" },
      { title: "Believe", artist: "Cher" },
      { title: "Lola's Theme", artist: "The Shapeshifters" },
      { title: "Lady (Hear Me Tonight)", artist: "Modjo" },
      { title: "Make Luv", artist: "Room 5 ft. Oliver Cheatham" },
      { title: "I'm Too Sexy", artist: "Right Said Fred" },
      { title: "I Like to Move It", artist: "Reel 2 Real ft. The Mad Stuntman" },
      { title: "Macarena", artist: "Los Del Rio" },
      { title: "U Can't Touch This", artist: "MC Hammer" },
      { title: "Everybody (Backstreet's Back)", artist: "Backstreet Boys" },
      { title: "Move Your Feet", artist: "Junior Senior" },
      { title: "The Weekend", artist: "Michael Gray" },
      { title: "I'm Horny", artist: "Mousse T. vs Hot 'n' Juicy" },
      { title: "Finally", artist: "CeCe Peniston" },
    ],
  },
  {
    name: "Channel Surf (Theme Tunes)",
    genre: "Throwbacks",
    soundcloudUrl: "https://soundcloud.com/lme-band/channel-surf-90s-00s-theme-tunes",
    songs: [
      { title: "The Story of Tracy Beaker", artist: "Keisha White" },
      { title: "SpongeBob SquarePants Theme", artist: "SpongeBob SquarePants" },
      { title: "Proud Family Theme", artist: "Solange" },
      { title: "One on One Theme", artist: "" },
      { title: "Fresh Prince of Bel-Air Theme", artist: "DJ Jazzy Jeff & The Fresh Prince" },
      { title: "That's So Raven Theme", artist: "Raven-Symone" },
    ],
  },
  {
    name: "Evolution of Music (70s to 10s)",
    genre: "Throwbacks",
    songs: [
      { title: "I Will Survive", artist: "Gloria Gaynor" },
      { title: "Boogie Wonderland", artist: "Earth, Wind & Fire" },
      { title: "September", artist: "Earth, Wind & Fire" },
      { title: "Outstanding", artist: "The Gap Band" },
      { title: "Careless Whisper", artist: "George Michael" },
      { title: "Every Little Step", artist: "Bobby Brown" },
      { title: "Remember the Time", artist: "Michael Jackson" },
      { title: "Poison", artist: "Bell Biv DeVoe" },
      { title: "1, 2 Step", artist: "Ciara ft. Missy Elliott" },
      { title: "Get Right", artist: "Jennifer Lopez" },
      { title: "When I See You", artist: "Fantasia" },
    ],
  },
  {
    name: "RnB",
    genre: "RnB",
    songs: [
      { title: "Rock the Boat", artist: "Aaliyah" },
      { title: "Ascension (Don't Ever Wonder)", artist: "Maxwell" },
      { title: "You Are My Starship", artist: "Dazz Band" },
      { title: "Cater 2 U", artist: "Destiny's Child" },
      { title: "Until the End of Time", artist: "Justin Timberlake ft. Beyonce" },
      { title: "Can We Talk", artist: "Tevin Campbell" },
      { title: "Don't Walk Away", artist: "Jade" },
    ],
  },
  {
    name: "Lovers Lane (Reggae)",
    genre: "Reggae",
    songs: [
      { title: "Smile Jamaica", artist: "Chronixx" },
      { title: "Love Doctor", artist: "Romain Virgo" },
      { title: "Main Squeeze", artist: "Lloyd Brown" },
      { title: "She's Royal", artist: "Tarrus Riley" },
      { title: "The Girl Is Mine", artist: "Morgan Heritage" },
      { title: "Rock Away", artist: "Beres Hammond" },
      { title: "Silly Games", artist: "Janet Kay" },
      { title: "Too Experienced", artist: "Barrington Levy" },
      { title: "Substitute Lover", artist: "Half Pint" },
      { title: "Blessings (When a Man Loves a Woman)", artist: "Christopher Martin" },
    ],
  },
  {
    name: "Gospel Entry",
    genre: "Gospel",
    songs: [
      { title: "Looking for You", artist: "Kirk Franklin" },
      { title: "When Jesus Says Yes", artist: "Michelle Williams" },
      { title: "Wish Somebody's Soul Would Catch on Fire", artist: "The Spirituals / traditional gospel" },
    ],
  },
  {
    name: "CD Burn Unit (2000s RnB)",
    genre: "RnB",
    soundcloudUrl: "https://soundcloud.com/lme-band/cd-burn-unit-00s-mix-chelsies-bday-party",
    songs: [
      { title: "Single Ladies", artist: "Beyonce" },
      { title: "What's My Name?", artist: "Rihanna ft. Drake" },
      { title: "Drop It Like It's Hot", artist: "Snoop Dogg ft. Pharrell" },
      { title: "Who's That Girl?", artist: "Eve" },
      { title: "Just a Friend 2002", artist: "Mario" },
      { title: "Foolish", artist: "Ashanti" },
      { title: "Caught Up", artist: "Usher" },
      { title: "It's Not Right but It's Okay", artist: "Whitney Houston" },
      { title: "Kiss Kiss", artist: "Chris Brown ft. T-Pain" },
      { title: "So Sick", artist: "Ne-Yo" },
      { title: "Jenny from the Block", artist: "Jennifer Lopez" },
      { title: "Independent Women", artist: "Destiny's Child" },
      { title: "Entourage", artist: "Omarion" },
    ],
  },
  {
    name: "Heavy Hitterz",
    genre: "RnB",
    soundcloudUrl: "https://soundcloud.com/lme-band/heavy-hitterz-90s-00s-mix-just-dance",
    songs: [
      { title: "Love Like This", artist: "Faith Evans" },
      { title: "Crazy in Love", artist: "Beyonce ft. Jay-Z" },
      { title: "1 Thing", artist: "Amerie" },
      { title: "Scandalous", artist: "Mis-Teeq" },
      { title: "Dirrty", artist: "Christina Aguilera" },
      { title: "Show Me What You Got", artist: "Jay-Z" },
      { title: "This Is How We Do It", artist: "Montell Jordan" },
      { title: "Let It Go", artist: "Keyshia Cole ft. Missy Elliott & Lil Kim" },
      { title: "Return of the Mack", artist: "Mark Morrison" },
      { title: "Nuthin' but a 'G' Thang", artist: "Dr. Dre ft. Snoop Doggy Dogg" },
      { title: "Freak Like Me", artist: "Adina Howard" },
      { title: "Freak Like Me", artist: "Sugababes" },
      { title: "Thong Song", artist: "Sisqo" },
      { title: "In the Morning", artist: "Egypt" },
      { title: "Too Many Man", artist: "Boy Better Know" },
      { title: "Head, Shoulders, Knees & Toes", artist: "KSI, S-X, Tion Wayne & Bugzy Malone" },
      { title: "Migraine Skank", artist: "Gracious K" },
    ],
  },
  {
    name: "Caribbean Way",
    genre: "Dancehall",
    songs: [
      { title: "Welcome to Jamrock", artist: "Damian Marley" },
      { title: "I'm Still in Love with You", artist: "Sean Paul ft. Sasha" },
      { title: "Heads High", artist: "Mr. Vegas" },
      { title: "Romie", artist: "Beenie Man" },
      { title: "No, No, No", artist: "Dawn Penn" },
      { title: "Can't Satisfy Her", artist: "I Wayne" },
      { title: "Too Experienced", artist: "Barrington Levy" },
      { title: "I Was Born a Winner", artist: "Freddie McGregor" },
      { title: "I Am Blessed", artist: "Mr. Vegas" },
      { title: "Everyone Falls in Love", artist: "Tanto Metro & Devonte" },
      { title: "Basement Party", artist: "Rayvon" },
      { title: "Dancehall Queen", artist: "Beenie Man ft. Chevelle Franklin" },
      { title: "So Special", artist: "Mavado" },
      { title: "Hope and Pray", artist: "Mavado" },
      { title: "Rum and RedBull", artist: "Beenie Man ft. Future Fambo" },
      { title: "Pon de River, Pon de Bank", artist: "Elephant Man" },
      { title: "It's Raining", artist: "Marvia Providence" },
      { title: "Hear My Cry O Lord", artist: "Marvia Providence" },
      { title: "Bun Bad Mind", artist: "Elephant Man" },
      { title: "Weh Dem a Do", artist: "Mavado" },
      { title: "Signal Di Plane", artist: "Elephant Man" },
      { title: "Willie Bounce", artist: "Elephant Man" },
      { title: "Wacky Dip", artist: "Voicemail" },
      { title: "Step Out", artist: "Busy Signal" },
      { title: "Tuck in Yuh Belly", artist: "Leftside" },
      { title: "Tight Up Skirt", artist: "Red Rat" },
      { title: "Goodas Mi Back", artist: "Tony Matterhorn" },
      { title: "Dutty Wine", artist: "Tony Matterhorn" },
      { title: "Hot Wuk", artist: "Mr. Vegas" },
      { title: "When You Feel Lonely", artist: "Mavado" },
      { title: "Come Into My Room", artist: "Mavado" },
    ],
  },
  {
    name: "Cassette Culture",
    genre: "Throwbacks",
    songs: [
      { title: "Right Here", artist: "SWV" },
      { title: "Optimistic", artist: "Sounds of Blackness" },
      { title: "Back to Life", artist: "Soul II Soul" },
      { title: "Scream", artist: "Michael Jackson & Janet Jackson" },
      { title: "I Wanna Be Down", artist: "Brandy" },
      { title: "Back & Forth", artist: "Aaliyah" },
      { title: "Just Friends (Sunny)", artist: "Musiq Soulchild" },
      { title: "U Know What's Up", artist: "Donell Jones" },
      { title: "Doo Wop (That Thing)", artist: "Lauryn Hill" },
      { title: "Juicy", artist: "The Notorious B.I.G." },
      { title: "California Love", artist: "2Pac ft. Dr. Dre" },
      { title: "Summertime", artist: "DJ Jazzy Jeff & The Fresh Prince" },
      { title: "Real Love", artist: "Mary J. Blige" },
      { title: "Family Affair", artist: "Mary J. Blige" },
    ],
  },
  {
    name: "2025 Highlights",
    genre: "Throwbacks",
    songs: [
      { title: "Real Love", artist: "Mary J. Blige" },
      { title: "Cardboard Box", artist: "FLO" },
      { title: "Not Like Us", artist: "Kendrick Lamar" },
      { title: "Folded", artist: "Kehlani" },
      { title: "Snooze", artist: "SZA" },
      { title: "Do What I Say", artist: "KWN" },
      { title: "MUTT", artist: "Leon Thomas" },
      { title: "KARMA", artist: "Wizkid" },
      { title: "Clarks", artist: "Vybz Kartel ft. Popcaan & Gaza Slim" },
      { title: "Soh Soh", artist: "Odeal" },
      { title: "Like2", artist: "CallMeTheKidd" },
    ],
  },
  {
    name: "GBNF BET Awards Style",
    genre: "RnB",
    songs: [
      { title: "Thriller", artist: "Michael Jackson" },
      { title: "Don't Stop 'Til You Get Enough", artist: "Michael Jackson" },
      { title: "I Wanna Thank Ya", artist: "Angie Stone ft. Snoop Dogg" },
      { title: "Wish I Didn't Miss You", artist: "Angie Stone" },
      { title: "Saving All My Love for You", artist: "Whitney Houston" },
      { title: "Never Too Much", artist: "Luther Vandross" },
    ],
  },
  {
    name: "Burna / Rema / Afro 25",
    genre: "Afrobeats",
    songs: [
      { title: "Kilometre", artist: "Burna Boy" },
      { title: "Dumebi", artist: "Rema" },
      { title: "Kelebu", artist: "Rema" },
      { title: "Ozeba", artist: "Rema" },
    ],
  },
  {
    name: "Big Dansa (Soca 25)",
    genre: "Soca",
    songs: [
      { title: "Year for Love", artist: "Voice" },
      { title: "The Greatest Bend Over", artist: "Yung Bredda" },
      { title: "Brain Freeze", artist: "Leadpipe & Saddis" },
      { title: "Cheers to Life", artist: "Voice" },
      { title: "Dansa", artist: "Klassik Frescobar" },
      { title: "Kick in She Back Doh", artist: "Burning Flames" },
      { title: "Do What You Want", artist: "Skinny Fabulous" },
      { title: "Wete Fete", artist: "Asa Bantan" },
      { title: "In the Water", artist: "Suh Raw" },
      { title: "Pump Yuh Flag", artist: "Machel Montano" },
    ],
  },
];
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit src/lib/setlist-data.ts 2>&1 || echo "Check manually"`

If that fails due to tsconfig paths, just verify no red squiggles by opening the file. The data is all typed inline so there are no external dependencies.

- [ ] **Step 3: Commit**

```bash
git add src/lib/setlist-data.ts
git commit -m "feat(setlist): add medley data with types and SoundCloud URLs"
```

---

### Task 2: Create the setlist page with header, accordion, and CTA

**Files:**
- Create: `src/app/setlist/page.tsx`

This is a `"use client"` page because of accordion interactivity (useState for expanded item, active filter).

- [ ] **Step 1: Create the page file `src/app/setlist/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { MEDLEYS, GENRES, GENRE_COLOURS, type Genre } from "@/lib/setlist-data";

type Filter = Genre | "All" | "Audio";

export default function SetlistPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const filtered = MEDLEYS.filter((m) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Audio") return !!m.soundcloudUrl;
    return m.genre === activeFilter;
  });

  function handleFilterClick(filter: Filter) {
    setActiveFilter(filter);
    setExpandedIndex(null);
  }

  function toggleMedley(index: number) {
    setExpandedIndex(expandedIndex === index ? null : index);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-[680px] mx-auto px-6 pt-12 pb-16 flex-1 w-full">
        {/* Header */}
        <div className="text-center mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logos/lme-typo-white.png"
            alt="LME — Live Music Enhancers"
            className="h-12 mx-auto mb-6"
          />
          <h1 className="font-display text-[3.2rem] text-lme-white tracking-[0.12em] leading-none mb-2">
            SET LIST
          </h1>
          <p className="font-mono text-[0.8rem] text-teal-primary tracking-[0.25em] uppercase mb-6">
            WE WANT TO PARTY.
          </p>
          <p className="text-[0.95rem] text-muted max-w-[540px] mx-auto leading-relaxed">
            {MEDLEYS.length} booking-ready medleys — browse by vibe, listen to
            samples.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 flex-wrap justify-center mb-8">
          <button
            onClick={() => handleFilterClick("All")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeFilter === "All"
                ? "bg-teal-primary text-lme-black"
                : "bg-card border border-border text-body hover:border-teal-primary"
            }`}
          >
            All ({MEDLEYS.length})
          </button>
          {GENRES.map((genre) => {
            const count = MEDLEYS.filter((m) => m.genre === genre).length;
            if (count === 0) return null;
            return (
              <button
                key={genre}
                onClick={() => handleFilterClick(genre)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeFilter === genre
                    ? "bg-teal-primary text-lme-black"
                    : "bg-card border border-border text-body hover:border-teal-primary"
                }`}
              >
                {genre}
              </button>
            );
          })}
          <button
            onClick={() => handleFilterClick("Audio")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeFilter === "Audio"
                ? "bg-teal-primary text-lme-black"
                : "bg-card border border-teal-primary text-teal-primary hover:bg-teal-primary/10"
            }`}
          >
            🎧 Has Audio
          </button>
        </div>

        {/* Accordion */}
        <div className="space-y-2">
          {filtered.map((medley, i) => {
            const isExpanded = expandedIndex === i;
            const accentColour = GENRE_COLOURS[medley.genre];

            return (
              <div
                key={medley.name}
                className={`rounded-lg overflow-hidden border transition-colors ${
                  isExpanded
                    ? "border-teal-primary"
                    : "border-border"
                }`}
              >
                {/* Header */}
                <button
                  onClick={() => toggleMedley(i)}
                  className={`w-full px-4 py-3.5 flex items-center justify-between text-left transition-colors ${
                    isExpanded ? "bg-[#0d1f1d]" : "bg-dark-surface hover:bg-card"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1.5 h-8 rounded-sm shrink-0"
                      style={{ backgroundColor: accentColour }}
                    />
                    <div>
                      <div className="font-semibold text-sm text-lme-white">
                        {medley.name}
                        {medley.soundcloudUrl && (
                          <span className="ml-2 text-teal-primary text-xs">
                            🎧
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted">
                        {medley.songs.length} tracks · {medley.genre}
                      </div>
                    </div>
                  </div>
                  <span className="text-muted text-sm shrink-0 ml-2">
                    {isExpanded ? "▼" : "▶"}
                  </span>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-[#0a0a0a] border-t border-border/50">
                    {/* SoundCloud player */}
                    {medley.soundcloudUrl && (
                      <div className="mb-3">
                        <iframe
                          width="100%"
                          height="20"
                          scrolling="no"
                          frameBorder="no"
                          allow="autoplay"
                          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(medley.soundcloudUrl)}&color=%2314B8A6&inverse=true&auto_play=false&show_user=false`}
                          title={`${medley.name} on SoundCloud`}
                          className="rounded"
                        />
                        <a
                          href={medley.soundcloudUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-xs text-teal-primary hover:underline"
                        >
                          Open in SoundCloud ↗
                        </a>
                      </div>
                    )}

                    {/* Track list */}
                    <div className="divide-y divide-border/30">
                      {medley.songs.map((song, j) => (
                        <div
                          key={`${song.title}-${j}`}
                          className="flex justify-between py-1.5 text-xs"
                        >
                          <span className="text-lme-white">
                            {song.title}
                          </span>
                          <span className="text-muted text-right ml-4 shrink-0">
                            {song.artist}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA Footer */}
        <div className="text-center mt-12 pt-10 border-t border-border">
          <p className="text-sm text-muted mb-4">
            Want a tailored set for your event?
          </p>
          <Link
            href="/bookingform"
            className="inline-block px-8 py-3 bg-teal-primary text-lme-black rounded-md font-bold text-sm hover:bg-teal-glow transition-colors"
          >
            Book LME →
          </Link>
        </div>
      </div>

      <footer className="text-center py-12 font-mono text-[0.7rem] text-muted tracking-[0.1em]">
        &copy; 2026 LME &mdash; Live Music Enhancers | lmeband.com
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Start the dev server and verify the page renders**

Run: `pnpm dev` (already on port 3002)

Open `http://localhost:3002/setlist` in the browser. Verify:
- Header with LME logo, title "SET LIST", subtitle
- Filter pills render with correct labels
- Clicking a medley expands it to show the song list
- Clicking again collapses it
- Clicking a different medley closes the previous one
- Filter pills filter the list correctly
- "Has Audio" filter shows only 3 medleys (Channel Surf, CD Burn Unit, Heavy Hitterz)
- SoundCloud player appears for medleys with audio
- "Open in SoundCloud" link opens in new tab
- "Book LME" button links to `/bookingform`
- Page is responsive on mobile

- [ ] **Step 3: Commit**

```bash
git add src/app/setlist/page.tsx
git commit -m "feat(setlist): add interactive setlist page with filtered accordion and SoundCloud embeds"
```

---

### Task 3: Add SEO metadata

**Files:**
- Create: `src/app/setlist/layout.tsx`

- [ ] **Step 1: Create `src/app/setlist/layout.tsx` with metadata**

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LME — Set List",
  description:
    "Browse LME's booking-ready medleys — Dancehall, RnB, Afrobeats, Soca, Throwbacks, Reggae, Gospel. Listen to samples and book your event.",
  openGraph: {
    title: "LME — Set List",
    description:
      "Browse LME's booking-ready medleys. Dancehall, RnB, Afrobeats, Soca, and more.",
    type: "website",
    url: "https://lmeband.com/setlist",
    images: ["/images/band/dsc01991.jpg"],
  },
};

export default function SetlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

- [ ] **Step 2: Verify metadata renders**

Run `curl -s http://localhost:3002/setlist | grep -o '<title>[^<]*</title>'` — should output `<title>LME — Set List</title>`.

- [ ] **Step 3: Commit**

```bash
git add src/app/setlist/layout.tsx
git commit -m "feat(setlist): add SEO metadata for setlist page"
```

---

### Task 4: Add smooth expand/collapse animation

**Files:**
- Modify: `src/app/setlist/page.tsx`

The accordion currently has no height animation — content just appears/disappears. Add a CSS transition using grid-rows trick for smooth expand/collapse.

- [ ] **Step 1: Update the expanded content wrapper in `src/app/setlist/page.tsx`**

Replace the conditional render `{isExpanded && (` block with an animated wrapper. Change the accordion item JSX (inside the `.map()`) to use a `div` with `grid` transition instead of conditional rendering:

Find this in the component's accordion item, after the `</button>` closing tag:

```tsx
                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-[#0a0a0a] border-t border-border/50">
```

Replace with:

```tsx
                {/* Expanded content */}
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className={`px-4 py-3 bg-[#0a0a0a] ${isExpanded ? "border-t border-border/50" : ""}`}>
```

And close the two extra divs — find the closing:

```tsx
                  </div>
                )}
```

Replace with:

```tsx
                    </div>
                  </div>
                </div>
```

- [ ] **Step 2: Verify animation works**

Open `http://localhost:3002/setlist`. Click a medley — it should smoothly expand. Click again — smoothly collapse. Click a different medley — the previous one smoothly collapses while the new one expands.

- [ ] **Step 3: Commit**

```bash
git add src/app/setlist/page.tsx
git commit -m "feat(setlist): add smooth expand/collapse animation to accordion"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run the build to ensure no errors**

Run: `pnpm build`

Expected: Build succeeds with no errors.

- [ ] **Step 2: Full visual check**

Open `http://localhost:3002/setlist` and verify:
- All 19 medleys render
- Each genre filter works and shows correct medleys
- "Has Audio" shows 3 medleys
- SoundCloud embeds load and play
- "Open in SoundCloud" links work
- Accordion animation is smooth
- "Book LME" button links to `/bookingform`
- Mobile responsive (filter pills wrap, accordion full width)
- Footer matches booking form page

- [ ] **Step 3: Commit any fixes if needed**
