# QRaksha — DESIGN.md

Reference: Altius landing page (dark/peach alternating sections, orange accent, institutional-fintech tone). This file adapts that language for QRaksha. Do not copy Altius copy, logos, or illustrations; copy only the system.

---

## 1. Brand Feel

- **Tone:** Institutional, precise, security-grade. Calm authority, not "scary cyber." Trust through restraint.
- **Keywords:** Verified. Physical. Tamper-evident. Quiet confidence.
- **One-liner for design decisions:** "If a bank and a hardware security lab designed a landing page."
- **Avoid:** Neon cyberpunk, matrix green text, glassmorphism blobs, stock shield-and-padlock icons, emoji, purple gradients.

---

## 2. Color System

Brand uses warm near-black + peach + one orange accent. Verdict colors are **semantic only** and never used decoratively, so the orange brand never gets confused with the WARNING red.

### Core tokens

| Token                   | Hex                    | Use                                                   |
| ----------------------- | ---------------------- | ----------------------------------------------------- |
| `--bg-ink`              | `#120907`              | Dark section background (warm black, never pure #000) |
| `--bg-ink-2`            | `#1C0F0B`              | Cards on dark, raised surfaces                        |
| `--bg-peach`            | `#FFEDE6`              | Light section background                              |
| `--bg-peach-2`          | `#FFDDD0`              | Cards on light, hover fills                           |
| `--brand`               | `#FF4B1F`              | Primary accent: CTAs, section labels, borders, glow   |
| `--brand-soft`          | `#FF8A66`              | Gradients, secondary accents                          |
| `--brand-deep`          | `#B7280A`              | Pressed states, outlines on peach                     |
| `--text-on-dark`        | `#F6E9E3`              | Headings on dark                                      |
| `--text-on-dark-muted`  | `#B79E94`              | Body on dark                                          |
| `--text-on-light`       | `#1A0D09`              | Headings on peach                                     |
| `--text-on-light-muted` | `#5E4036`              | Body on peach                                         |
| `--line-dark`           | `rgba(255,75,31,0.35)` | 1px card borders on dark                              |
| `--line-light`          | `rgba(26,13,9,0.15)`   | 1px card borders on peach                             |

### Verdict tokens (semantic only)

| Verdict    | Token      | Hex       | Where allowed                     |
| ---------- | ---------- | --------- | --------------------------------- |
| VERIFIED   | `--ok`     | `#2FBF71` | Verdict card, shield, status chip |
| UNVERIFIED | `--warn`   | `#F2B531` | Verdict card, status chip         |
| WARNING    | `--danger` | `#E5384F` | Verdict card, alert state         |

Rule: verdict colors appear only inside the verdict UI, the three-tier explainer, and demo result states. Everything else uses brand orange.

### Gradients

- **Hero bars:** vertical columns fading from `--brand` at the bottom to transparent at the top, on `--bg-ink`. Column heights vary like an audio waveform. For QRaksha these read as QR modules rising out of the dark.
- **Section glow:** radial `rgba(255,75,31,0.18)` to transparent, positioned behind the key visual only. One glow per section, max.

---

## 3. Typography

- **Display / headings:** a clean grotesk, medium weight (500), tight tracking (-0.02em). Suggested: `Inter Tight`, `Geist`, or `General Sans`.
- **Body:** same family, 400.
- **Label / eyebrow / data:** monospace, uppercase, 0.14em tracking. Suggested: `JetBrains Mono` or `Geist Mono`.
- Use the mono face for: section eyebrows, tags, verdict names, hashes, step numbers (`01`, `02`), ticker text.

| Role                     | Size (desktop / mobile) | Weight        | Notes                                                |
| ------------------------ | ----------------------- | ------------- | ---------------------------------------------------- |
| Hero H1                  | 64 / 38 px              | 500           | Max 3 lines, centered                                |
| Section H2               | 44 / 30 px              | 500           | Left-aligned on content sections                     |
| Card title               | 20 / 18 px              | 500           |                                                      |
| Body                     | 16 / 15 px              | 400           | Line-height 1.6, max-width 62ch                      |
| Eyebrow                  | 12 px                   | 500 mono      | Uppercase, brand color, preceded by a 14px line icon |
| Quote (testimonial band) | 32 / 20 px              | 500 mono caps | Used once, on dark                                   |

---

## 4. Layout & Spacing

- 12-column grid, max content width **1200px**, side padding 24px (mobile) / 48px (desktop).
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 72, 120.
- Section vertical padding: **120px desktop / 72px mobile**.
- **Section rhythm alternates** (core Altius trait):
  1. Hero: dark
  2. Problem: peach
  3. Solution: dark
  4. How it works / agent pipeline: peach
  5. Attacks covered: dark
  6. Verdicts: peach
  7. Demo: dark
  8. CTA + footer: dark
- Hero is centered. All other sections are two-column: text left (5 cols), visual right (7 cols), flipping on mobile to text first.

---

## 5. Components

### Eyebrow label

`[icon] THE PROBLEM`. Mono, uppercase, brand color, 12px. Every section starts with one.

### Buttons

- **Primary:** filled `--brand`, text `--bg-ink`, radius 4px (near-square, not pill), 40px height, mono-adjacent 14px medium. Hover: lighten to `--brand-soft`, add 0 0 24px brand glow.
- **Secondary:** transparent, 1px `--brand` border, text `--brand`. Hover: fill `rgba(255,75,31,0.12)`.
- On peach: primary stays brand orange, secondary border becomes `--brand-deep`.

### Cards

- Dark: `--bg-ink-2`, 1px `--line-dark`, radius 4px, padding 24px.
- Light: `--bg-peach-2`, 1px `--line-light`, radius 4px.
- Top-left: mono index (`01`), top-right: small line icon. Title, then 2-3 lines of body.
- Hover: border brightens to full `--brand`, no lift or shadow.

### Ticker bar (top of page)

Thin 32px marquee, `--brand` background, mono dark text, scrolling. Content: short proof lines, e.g. `UPI CONFIRMS WHO GETS PAID. QRAKSHA CONFIRMS THE QR IS REAL.` Pause on hover. Respect `prefers-reduced-motion`.

### Nav

Transparent over hero, logo left, 3 links + one secondary CTA right. Collapses to a menu button on mobile. Sticky with `--bg-ink` at 80% opacity once scrolled.

### Verdict card (QRaksha-specific)

- Large rounded-4 card, left edge 4px solid verdict color, mono verdict label (`VERIFIED`), one-line reason, then a 3-row evidence list (Identity / Vision / Context) each with its own pass/flag chip.
- Shield icon top-right in the verdict color.

### Agent pipeline node

Square node, 1px brand border, mono agent name, tiny status dot. Connected by 1px lines with small arrowheads. Misbinding Agent and Trust Agent get a filled brand border to mark them as decision nodes.

### Hash chip

Mono, 12px, truncated (`0x9f3a…c21e`), peach on dark or ink on peach, 1px border, copy-on-click. Used wherever the blockchain credential is mentioned.

---

## 6. Imagery & Visual Language

- **Hero visual:** the Three.js cube-built QR slab (`qraksha-hero-three.html`) with scan line and verdict shield, on top of the vertical-bar gradient. Slab in warm off-white and brand orange cubes, slow idle rotation, scan line sweeps every ~4s and resolves into the shield.
- **Isometric layered diagrams** (Altius's "layers" illustration) are reused for the pipeline: stacked translucent planes in brand orange for Decode, Identity/Vision/Context, Misbinding, Trust. Flat fills, thin outlines, no shadows.
- **Line icons:** 1.5px stroke, square caps, brand color. One consistent set (Lucide or Phosphor Light).
- **Frame details:** small corner brackets and mono coordinate tags (`TRACK ▸`, `FIG. 01`) around hero and diagram visuals, like a technical drawing. Use sparingly.
- **Photography:** if used, desaturated and warm-toned, real shop counters and QR stands. Never stock hackers or padlocks.
- No illustrations of people. No gradients on text.

---

## 7. Motion

- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`. Durations: 200ms (hover), 500ms (reveal), 900ms (hero).
- Scroll reveals: fade + 16px upward translate, staggered 80ms per child, once only.
- Hero bars: slow breathing (6-8s loop), amplitude subtle.
- Scan line and verdict resolve are the **one** signature animation. Do not add competing motion nearby.
- Respect `prefers-reduced-motion`: disable marquee, bar breathing, and scan loop; show the resolved verdict statically.

---

## 8. Page Structure & Copy Direction

1. **Hero:** H1 along the lines of "Know the QR is real before you pay." Sub: one sentence on physical-QR-to-merchant verification. CTAs: `Try the demo` / `Read the idea`.
2. **Trust strip:** logos replaced by mono tags: `UPI-COMPATIBLE`, `NO NEW PAYMENT APP`, `TAMPER-EVIDENT`.
3. **Problem (peach):** UPI tells you who receives the money, not whether this physical QR belongs here. Show replaced / cloned / relocated QR as three small cards.
4. **Solution (dark):** two-sided model, merchant registers once, customer scans optionally before paying.
5. **How it works (peach):** isometric agent pipeline, four steps max visible, hash chip for the credential.
6. **Attacks covered (dark):** Replacement, Cloning, Relocation, Physical tampering as a 4-card grid.
7. **Verdicts (peach):** three verdict cards side by side: VERIFIED, UNVERIFIED, WARNING.
8. **Demo (dark):** Demo 1 (replacement) and Demo 2 (relocation, the "killer demo") as a tabbed block with a result state per tab.
9. **Pitch band (dark):** the judge line in the large mono quote style: "A UPI app can tell you who receives the money. QRaksha tells you whether the QR in front of you was supposed to be there."
10. **CTA + footer:** simple email or GitHub link, mono legal line.

---

## 9. Accessibility & Responsiveness

- Body text contrast at least 4.5:1. `--text-on-dark-muted` on `--bg-ink` is about 7:1; verify any new pairing.
- Never rely on color alone for verdicts: always pair with label text and an icon (check / dash / alert).
- Focus ring: 2px `--brand`, 2px offset, on every interactive element.
- Breakpoints: 640, 1024, 1280. The hero Three.js canvas falls back to a static PNG below 640px or when WebGL is unavailable.
- Tap targets 44px minimum on mobile.

---

## 10. Do / Don't

**Do**

- Alternate dark and peach sections.
- Keep radius at 4px, borders at 1px, shadows at none.
- Use mono for anything technical or verdict-related.
- Keep one accent color plus the three verdict colors.

**Don't**

- Use brand orange for the WARNING state.
- Mix more than two typefaces.
- Add drop shadows, glass blur, or rounded pill buttons.
- Put glow behind more than one element per section.

---

## 11. Implementation Notes (CSS tokens)

```css
:root {
  --bg-ink: #120907;
  --bg-ink-2: #1c0f0b;
  --bg-peach: #ffede6;
  --bg-peach-2: #ffddd0;
  --brand: #ff4b1f;
  --brand-soft: #ff8a66;
  --brand-deep: #b7280a;
  --text-on-dark: #f6e9e3;
  --text-on-dark-muted: #b79e94;
  --text-on-light: #1a0d09;
  --text-on-light-muted: #5e4036;
  --ok: #2fbf71;
  --warn: #f2b531;
  --danger: #e5384f;
  --radius: 4px;
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
}
```
