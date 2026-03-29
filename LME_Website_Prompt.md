# LME Website — Claude Code Build Prompt

Build a single-page website for **LME (Live Music Enhancers)**, a five-piece live band from Birmingham, UK. The site should be a static HTML/CSS/JS site — no frameworks, no build tools. One self-contained `index.html` file with all styles and scripts inline (external font imports are fine). The site must be fully responsive (mobile-first).

This is a brand and credibility site. The goal is to make LME look undeniable — professional, high-energy, culturally relevant. Not a generic band template. Think editorial music site meets creative agency portfolio — closer to TIDAL's homepage or a Folioblox-style dark portfolio than a wedding band listing. Oversized typography, bold visual hierarchy, photography integrated with the layout, and a premium feel throughout.

**Design references** (see attached screenshots for visual direction):
- Folioblox-style dark creative portfolio — oversized hero typography, numbered categories, brand trust marquee, editorial photo grid
- TIDAL — music platform aesthetic, dark + bold accent colour, silhouette photography, immersive hero sections
- DZP — experimental typography as design element, text overlapping imagery, halftone textures, grid-breaking layouts
- EBM/Track Number — large-scale numbers as design elements, warm editorial photography, clean overlapping type
- Shipping site — bold text over photography, full-bleed imagery, mixed typography scales

The LME version of this is: dark (#080808) background, teal accent energy, Bebas Neue headlines that dominate, band photography integrated with the layout, and an overall feel that says "this band is serious" without saying a word of corporate language.

---

## BRAND IDENTITY (Locked — follow exactly)

### Name & Positioning

- **Primary name:** LME — always leads. "Live Music Enhancers" is the descriptor underneath, never the headline.
- **Tagline:** WE WANT TO PARTY.
- **Founded:** 2023, Birmingham, UK
- **What:** Five-piece live band blending Dancehall, RnB, Afrobeats, Pop, Gospel, Disco, and Soca
- **Positioning:** Not a covers act, not a backing band — a live music experience. Genre-bending arrangements, raw energy, a vibe that turns any venue into a function.
- **Reference brands:** The Compozers (live credibility), Going To Granny's (event energy), NSG (cultural cool), WSTRN (genre-fluid versatility), RnB & Slow Jams (audience overlap)

### Colour System

The site is dark-first. Black is the dominant background, teal is the signature accent.

**Core:**
| Role | Hex | Usage |
|------|-----|-------|
| LME Black | #080808 | Primary background |
| LME White | #F5F5F0 | Text, logo on dark |
| Teal Primary | #14B8A6 | Main accent — CTAs, highlights, section markers |

**Teal Scale (use for depth, gradients, hover states):**
| Name | Hex | Usage |
|------|-----|-------|
| Teal Dark | #064E3B | Deep backgrounds, hero gradients |
| Teal Deep | #0D9488 | Cards, surfaces, secondary accent |
| Teal Primary | #14B8A6 | Signature accent — the workhorse |
| Teal Glow | #5EEAD4 | Highlights, hover states, glowing text |
| Teal Mist | #99F6E4 | Very light accents, subtle touches |

**Supporting Neutrals:**
| Name | Hex | Usage |
|------|-----|-------|
| Dark Surface | #111111 | Elevated backgrounds |
| Card | #1A1A1A | Cards, panels |
| Border | #252525 | Dividers, borders |
| Muted | #8A8A8A | Secondary/muted text |
| Body | #C4C4C4 | Body text on dark |

**Rules:**
- Teal ALWAYS pops against black. It's the energy.
- Black is the dominant background — always.
- Never use teal as a full flat background without gradient depth.
- White creates breathing room and contrast.

### Typography

Import from Google Fonts: `Bebas+Neue`, `Syne:wght@400;500;600;700;800`, `Space+Mono:wght@400;700`

| Role | Font | Weight | Usage | Case |
|------|------|--------|-------|------|
| Primary | Bebas Neue | Regular | Headlines, hero text, section titles | UPPERCASE always |
| Secondary | Syne | 400–800 | Body copy, descriptions, about text | Sentence case |
| Utility | Space Mono | 400, 700 | Dates, handles, metadata, labels, genre tags | Uppercase + wide tracking |

**Type Scale:**
| Level | Font | Size Range | Letter-spacing |
|-------|------|------------|----------------|
| Display | Bebas Neue | 48–96px | 0.08–0.15em |
| Heading | Bebas Neue | 28–48px | 0.06em |
| Subheading | Syne Bold | 18–24px | — |
| Body | Syne Regular | 15–16px | 1.6 line-height |
| Caption/Meta | Space Mono | 11–13px | 0.15–0.3em |

**Rules:**
- Bebas Neue is ALWAYS uppercase. No exceptions.
- Never use fonts outside these three.

### Brand Voice

The copy on this site should be **slang-forward but never sloppy**. Fun and familiar to the culture, readable for someone booking a wedding band.

**Words we use:** vibes, energy, live & direct, function, set, shell down, different, mad, we outside, locked in, no dead vibes

**Words we NEVER use:** services, bespoke, tailored, solutions, provide, offerings, corporate, synergy, utilise

---

## DESIGN DIRECTION & VISUAL LANGUAGE

The design should feel like an **editorial music platform** — not a band template. Think TIDAL's homepage meets a creative agency portfolio. The following principles are drawn from approved reference designs and must inform every layout decision.

### Core Visual Principles

1. **Typography IS the design.** Headlines aren't just labels — they're visual elements. Use oversized Bebas Neue display text (96px+) that dominates sections and creates visual weight. Text can overlap imagery, break grid boundaries, and act as a compositional anchor. Think of each section headline as a poster, not a header.

2. **Layered depth.** Elements should feel like they exist on different planes — text over images, gradient overlays creating depth, subtle z-index layering. Avoid flat, single-plane layouts. Use dark gradient overlays on photography (linear-gradient from rgba(8,8,8,0.8) to transparent) so text sits confidently on top of imagery.

3. **Grid-breaking editorial layout.** Not everything lives in a neat centred column. Use asymmetric layouts — text aligned left with imagery bleeding right (or vice versa). Full-bleed sections alternating with contained ones. Some elements should feel like they break out of the expected grid. The About section, for example, could have the headline large on the left with body text in a narrower column on the right, similar to a magazine spread.

4. **Photography integrated with typography.** Band photos shouldn't sit in boxes — they should interact with the layout. Images can sit behind text with dark overlays, fill half the viewport as a full-bleed panel, or be cropped into interesting shapes within the grid. The hero should feel like the band photo IS the section, not a background behind a content box.

5. **Bold numbering and metadata as design elements.** Use large-scale numbers (like "01", "02") as section markers in Space Mono or Bebas Neue, styled in Teal Glow or at low opacity as background texture. This adds editorial structure and visual rhythm. Think of the numbered categories in the Folioblox reference.

6. **Accent colour as energy, not decoration.** Teal should appear in sharp, deliberate moments — a single word in a headline, a CTA button, the credits marquee, hover states, section labels. Never sprayed everywhere. When teal appears, it should feel like a flash of energy.

7. **Texture and visual interest.** Consider subtle grain/noise texture overlays on dark sections (CSS `background-image` with a noise SVG or pseudo-element) to avoid flat digital black. This adds the analogue, premium feel seen in the DZP reference. Keep it subtle — barely visible, just enough to add depth.

8. **Generous whitespace (darkspace).** Let sections breathe. Padding between sections should be generous (120px+ on desktop). Don't pack content tight — the space between elements is as important as the elements themselves. This is what separates editorial design from a template.

### Layout Patterns to Use

- **Hero:** Full-bleed photography with dark gradient overlay, oversized logo centred, tagline below, credits marquee at the bottom. The photo should feel immersive — 100vh, edge to edge.
- **Split sections:** Content on one side (headline + body), imagery on the other. Asymmetric split (e.g. 55/45 or 60/40), not a boring 50/50.
- **Full-width statement sections:** A single oversized headline spanning the full viewport width with no other content — used as a visual break/transition between content sections. E.g. "WE DON'T DO DEAD VIBES." in massive Bebas Neue with teal glow.
- **Card grids:** For videos and gallery — dark surface cards (#1A1A1A) with subtle border (#252525), rounded corners (8-12px), hover state that lifts (translateY + subtle teal glow/shadow).
- **Numbered sections:** Each major section gets a large "01" / "02" / "03" number in Space Mono, Teal Glow colour, positioned as a label above the section heading.

### Hover & Interaction

- Buttons: subtle scale (1.02-1.05) + background shift to Teal Deep on hover
- Video cards: slight lift (translateY -4px) + teal box-shadow glow
- Social links: colour transition from muted to Teal Primary
- All transitions: 0.3s ease — smooth, never jarring

---

## LOGO FILES

You will have these logo PNG files to work with:

- `LME_W.png` — White icon mark (use in nav and footer)
- `LME_full_logo_W_B.png` — Full lockup, white on black background (use in hero)
- `LME_B.png` — Black icon mark (not needed for this dark site)
- `LME_Typo_W.png` — Typographic wordmark, white
- `LME_Typo_B.png` — Typographic wordmark, black

The icon mark PNGs have a black background — use `mix-blend-mode: screen` to make the black transparent and show only the white logo on the dark site background. Do NOT use CSS `filter: invert()`.

---

## SITE STRUCTURE (Single-page scroll, top to bottom)

### 1. Navigation

- Sticky nav, transparent on top, transitions to `rgba(8,8,8,0.85)` with `backdrop-filter: blur(10px)` on scroll
- LME white icon logo (left) — `mix-blend-mode: screen` for the black background PNG
- Anchor links (right): About · Listen · Watch · Book
- Mobile: hamburger menu
- Use `mix-blend-mode: difference` on nav when over the hero for visibility

### 2. Hero Section

- Full viewport height (100vh), full-bleed edge to edge — no padding, no margins
- Background: one of the band's photos (will be provided), covering the entire section. Apply a dark gradient overlay: `linear-gradient(to bottom, rgba(8,8,8,0.3) 0%, rgba(8,8,8,0.6) 50%, rgba(8,8,8,0.95) 100%)` — keep the image visible at the top, fade to near-black at the bottom so the credits marquee sits cleanly
- Centre: LME full lockup logo (`LME_full_logo_W_B.png`), LARGE and dominant — this should feel like a poster. Use `mix-blend-mode: screen`. On desktop the logo should be at least 400px wide.
- Below logo: Tagline "WE WANT TO PARTY." in Space Mono, uppercase, wide tracking (0.3em), Teal Glow (#5EEAD4) colour. Give it breathing room from the logo.
- Bottom of hero: Scrolling credits marquee — continuous horizontal scroll animation, no pause
  - Content: `STORMZY · TEMS · HEADIE ONE · SUGARBABES · ALEX ISLEY · FIREBOY DML · GAMBIMI · SILVERSTONE F1 · QATAR WORLD CUP`
  - Duplicate the text string so the scroll loops seamlessly
  - Style: Space Mono, uppercase, Teal Primary colour, wide letter-spacing, small font size (12-13px)
  - Sits at the very bottom of the hero with a subtle top border (#252525)
  - Important: These are individual member credits, not LME entity credits — but they establish credibility

### 3. About Section

- Use the numbered section pattern: "01" in Space Mono, Teal Glow, large (48px+), positioned above the section heading
- Section label: "ABOUT" in Space Mono, teal, small, uppercase, wide tracking — sits next to or below the number
- **Asymmetric split layout** (editorial magazine spread style):
  - Left side (55-60%): Oversized headline in Bebas Neue — e.g. "LIVE & DIRECT FROM BIRMINGHAM" or "THE ENERGY IS DIFFERENT" — should feel like a poster headline, 48-72px
  - Right side (40-45%): Body copy in Syne, aligned top. Keep it SHORT — three to four sentences max:

> LME is a five-piece live band out of Birmingham blending Dancehall, RnB, Afrobeats, Pop, Gospel, Disco, and Soca into one energy. We don't do dead vibes. Whether it's a headline show, a wedding, a brand launch, or a private function — we bring the heat every time. Live & direct, Birmingham to everywhere.

- Below the split: Genre tags displayed as a row of pill/chip elements in Space Mono, uppercase, wide tracking, with teal borders or subtle teal background: DANCEHALL · RNB · AFROBEATS · POP · GOSPEL · DISCO · SOCA
- One band photo — can be full-bleed below the text block, or integrated into the split layout with a dark overlay. Band-focused, well-lit.
- On mobile: stacks vertically — headline, body copy, genre tags, photo

### 4. Listen Section

- Numbered section: "02" in Space Mono, Teal Glow
- Section label: "LISTEN" in Space Mono
- Headline in Bebas Neue — e.g. "HEAR THE ENERGY" or "PRESS PLAY"
- SoundCloud embed — use an iframe embed from: `https://soundcloud.com/lme-band`
  - SoundCloud embed format: `<iframe width="100%" height="300" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/lme-band&color=%2314B8A6&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true"></iframe>`
  - Note the teal colour `%2314B8A6` applied to the player
  - Wrap in a dark surface card (#1A1A1A) with subtle border (#252525) and rounded corners for polish
- If SoundCloud embeds don't work or look wrong, fall back to a styled link card that opens SoundCloud in a new tab

### 5. Watch Section

- Numbered section: "03" in Space Mono, Teal Glow
- Section label: "WATCH" in Space Mono
- Headline in Bebas Neue — e.g. "SEE THE ENERGY LIVE" — oversized, could span the full width
- YouTube videos displayed as **clickable thumbnail cards** (NOT iframes — iframes get blocked in many contexts)
- Card styling: dark surface background (#1A1A1A), subtle border (#252525), rounded corners (8-12px)
- Each card: YouTube thumbnail image (`https://img.youtube.com/vi/[VIDEO_ID]/maxresdefault.jpg`), teal play button overlay (triangle using CSS borders), video title at the bottom with gradient overlay
- Hover: card lifts (translateY -4px) with subtle teal box-shadow glow
- Links open YouTube in a new tab
- Videos to include:

| Title | Video ID |
|-------|----------|
| Millennials Mix — Chris Brown, Tweet, Amerie | HJbWRR2Xq8Q |
| LME End of Year Show | oKE48x3DNm8 |
| LiveMusicEnhancers — Dance Set | a1Yf0NabIt4 |

### 5b. Statement Break (between Watch and Book sections)

- A full-width visual break section — no content structure, just impact
- Large oversized Bebas Neue text centred on screen: "NO DEAD VIBES." or "WE DON'T DO DEAD VIBES."
- Text in Teal Glow (#5EEAD4), 72-96px, with subtle text-shadow glow effect
- Dark background, generous vertical padding (100-150px)
- Optional: faint grain texture overlay for depth
- This is a palette cleanser between content sections — pure brand energy

### 6. Gallery Section (Optional — include if photos are provided)

- Photo grid — masonry or clean CSS grid layout
- Band-focused imagery only. Well-lit, high-energy, intentional.
- If no photos are provided, skip this section entirely

### 7. Book LME Section

- Numbered section: "04" in Space Mono, Teal Glow
- Section label: "BOOKINGS" in Space Mono
- Headline in Bebas Neue — oversized, e.g. "BRING THE ENERGY" or "BOOK LME" — 64-96px, should feel like a poster
- Short copy in Syne: one or two lines about what LME does — weddings, parties, corporate events, private functions, brand launches. Keep it in the LME voice — no "we provide services", more "We bring the energy to your event. Weddings, private parties, brand launches, corporate functions — whatever the occasion, we shell it down."
- CTA: Email link styled as a prominent button → `mailto:Admin@lmeband.com`
  - Button styling: Teal Primary background (#14B8A6), black text, Bebas Neue uppercase, generous padding, hover shifts to Teal Deep with subtle scale
  - Button text: "GET IN TOUCH" or "ENQUIRE NOW"
- Below button: `Admin@lmeband.com` displayed as plain text in Space Mono, muted colour (#8A8A8A)
- No form — just the email CTA. Keep it clean.
- Consider a subtle teal gradient background panel behind this whole section to give it visual weight and differentiate it from the other dark sections

### 8. Footer

- Clean, minimal footer with subtle top border (#252525)
- LME white icon logo (small, `mix-blend-mode: screen`)
- Social links — displayed as minimal text abbreviations in Space Mono, uppercase, spaced out, muted colour that transitions to Teal Primary on hover:
  - IG → https://www.instagram.com/lme.band
  - TK → https://www.tiktok.com/@lmeltd_ *(handle is being changed to @lme.band)*
  - YT → https://youtube.com/@livemusicenhancers
  - FB → https://www.facebook.com/LiveMusicEnhancers
  - SC → https://soundcloud.com/lme-band
- Copyright in Space Mono, small, muted: `© 2026 Live Music Enhancers Limited. All rights reserved.`
- Contact email: `Admin@lmeband.com` in Space Mono

---

## DESIGN & UX REQUIREMENTS

### Animations & Texture
- Scroll-triggered reveal animations on sections — fade up with subtle translateY (40px). Use Intersection Observer. Stagger child elements slightly for a cascading reveal.
- Credits marquee: continuous CSS animation (`@keyframes scroll-left`), smooth, no pauses, ~30-40s duration
- Nav background transition on scroll (0.3s ease)
- Hover states on buttons, links, and video cards (subtle scale or colour shift using teal, 0.3s ease)
- **Grain texture:** Apply a subtle noise/grain overlay to the body or specific sections using a CSS pseudo-element with a noise SVG or a tiny repeating noise PNG. Opacity 0.03-0.05 — barely visible, just enough to add analogue depth and prevent flat digital black. Example approach:
  ```css
  body::after {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background-image: url("data:image/svg+xml,..."); /* tiny noise pattern */
    opacity: 0.04;
    pointer-events: none;
    z-index: 9999;
  }
  ```

### Responsive
- Mobile-first approach
- Hero logo scales down appropriately
- Gallery grid collapses from multi-column to single column
- Nav collapses to hamburger menu below 900px
- Video grid goes from row to stacked on mobile

### Performance
- Lazy load images (`loading="lazy"`)
- YouTube thumbnails are static images (no iframe overhead)
- Minimal JavaScript — only what's needed for scroll animations, nav behaviour, and mobile menu

### General
- Smooth scroll behaviour (`scroll-behavior: smooth` on html)
- No external CSS frameworks — custom CSS only
- Clean, semantic HTML
- Meta tags for SEO: title "LME — Live Music Enhancers | We Want To Party", description covering the genre blend and Birmingham origin
- Open Graph tags for social sharing (og:title, og:description, og:image if a hero image is available)
- Favicon: use the LME icon mark

---

## WHAT NOT TO DO

- Don't make it look like a generic band template or wedding band listing page
- Don't use safe, boring centred layouts with everything in neat boxes — break the grid, use asymmetry
- Don't make headlines small and polite — they should be oversized and bold, like a poster
- Don't use any corporate language (services, bespoke, tailored, solutions)
- Don't use crowd-focused imagery — the band is always the hero
- Don't use colours outside the defined palette
- Don't use fonts outside Bebas Neue, Syne, and Space Mono
- Don't add a mailing list signup, form, or any feature not listed above — keep this version lean
- Don't use `filter: invert()` on logo PNGs — use `mix-blend-mode: screen`
- Don't use flat, textureless black backgrounds everywhere — add subtle grain texture or gradient variation for depth
- Don't pack sections tight — generous padding (120px+ between sections on desktop) is essential

---

## CONTACT & SOCIAL LINKS REFERENCE

| Platform | URL | Handle |
|----------|-----|--------|
| Email | Admin@lmeband.com | — |
| Instagram | https://www.instagram.com/lme.band | @lme.band |
| TikTok | https://www.tiktok.com/@lmeltd_ | @lmeltd_ (changing to @lme.band) |
| YouTube | https://youtube.com/@livemusicenhancers | @livemusicenhancers |
| Facebook | https://www.facebook.com/LiveMusicEnhancers | LiveMusicEnhancers |
| SoundCloud | https://soundcloud.com/lme-band | lme-band |
| Website | https://lmeband.com | — |

---

## REFERENCE FILES

- **LME_Brand_Kit_V5.html** — The master brand identity document. Open it in a browser to see the full colour system, typography, voice guidelines, and logo applications in context. Use this as the definitive reference for any brand decisions.
- **Design reference screenshots** — Attached separately. These show the editorial, typographic, and layout direction for the site.

---

*This prompt contains the complete LME brand system and site specification. Build exactly to this spec — the brand identity is locked and should not be deviated from.*
