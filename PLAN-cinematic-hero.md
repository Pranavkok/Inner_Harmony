# Plan: Cinematic WebGL Scroll Hero for Inner Harmony

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done
Update the checkboxes as work proceeds so this file always reflects true progress and a new session can resume from here without re-reading the whole conversation.

## 0. Origin & scope decision

A prompt was provided to recreate a site called "Laocoön — Bronze and Time": a dark, luxury,
900vh scroll-driven WebGL page with a bronze horse statue, a liquid-metal shader background,
forge sparks, and per-letter text reveals. That prompt is **unrelated boilerplate** — this repo
is "Inner Harmony", Dr. Gargee Gadgil's warm/pastel holistic-healing site (parenting assessments,
DMIT, tarot-informed healing, Reiki, career counselling).

**Decision (confirmed with user):** adapt the *technique*, not the content/aesthetic.
We are NOT replacing `index.html` with the Laocoön content. We ARE building an equivalent
cinematic, scroll-driven WebGL experience — reskinned in Inner Harmony's rose/cream/gold palette,
with a sacred-geometry/lotus-like centerpiece instead of a bronze horse — and it augments the
existing **hero section only**. Everything below the hero (hook cards, marquee, about, services,
philosophy, accordion, parenting, career, steps, contact, footer) stays exactly as-is.

## 1. What we are building

Replace the current hero's flat 2D canvas particle system + static blurred orbs with a real
Three.js scene:

- A procedurally-generated **sacred-geometry centerpiece** (no external 3D asset — built from
  Three.js primitives, since we have no GLB and don't want a build/export pipeline) that slowly
  rotates and responds to mouse parallax, standing in for the bronze horse.
- A **warm liquid-gradient shader background** (rose → cream → gold, instead of bronze → sapphire)
  filling the hero, animated the same way as the reference (slow noise-warped sine waves, scroll
  reactive).
- A **light-mote particle system** (soft warm-gold/blush points, additive blending) standing in
  for the forge sparks.
- The existing custom cursor, per-phase hero text cycling (question → brand reveal), and pill tags
  stay, but the brand-reveal title gets the per-letter blur-up treatment from the reference.
- Camera does a **partial, scroll-driven orbit** (not a full 360° — the hero is a normal-height
  section followed by real content, not a 900vh pinned universe) while the hero is pinned, then
  releases into normal document scroll for the rest of the page.

## 2. Explicit non-goals

- Do NOT touch `services/about/philosophy/accordion/parenting/career/steps/contact/footer` markup,
  CSS, or JS logic.
- Do NOT introduce a build step, bundler, or npm dependency. Three.js loads via CDN `<script type="importmap">`
  + ES module `<script type="module">`, same pattern as the reference prompt.
- Do NOT change the color system's meaning — reuse the existing CSS custom properties
  (`--primary`, `--accent`, `--bg`, etc.) for the shader/lighting palette rather than inventing a
  parallel palette.
- Do NOT ship a 3D model file — the centerpiece is procedural geometry so the page stays
  dependency-free and asset-free (matches "single self-contained" spirit of the reference, adapted
  to this project's existing multi-file layout).
- Do NOT regress the current 2D-canvas experience for browsers/devices without WebGL — must
  detect and fall back gracefully to the existing particle canvas.

## 3. Architecture decisions

| Aspect | Reference (Laocoön) | This project |
|---|---|---|
| File layout | single `index.html`, everything inline | keep existing split: `index.html`, `css/style.css`, `js/main.js` — new code goes in a new `js/hero-webgl.js` module + a new `<style>`/section in `css/style.css`, loaded only from the hero |
| Page height | `body{min-height:900vh}`, whole page pinned | only the **hero section** is made tall/pinned (e.g. `height: 300vh` wrapper, inner `position: sticky` stage), rest of document scrolls normally immediately after |
| 3D asset | GLTF bronze horse from a bucket URL | procedural Three.js geometry (icosahedron core + torus rings + lathe-generated "petal" mesh), gold/rose PBR material |
| Palette | black / bronze / sapphire | Inner Harmony palette: `--bg #fdf4eb`, `--bg-alt #fcdbd8`, `--accent #ffeed0`, `--accent-warm #ecd8ca`, `--primary #583843`, `--primary-dark #4f2f39` |
| Fonts | Italiana + Outfit | keep existing Cormorant Garamond (display) + Jost (body) — no new fonts |
| Cursor | new custom two-ring cursor | reuse existing `#cursor`/`#cursorFollower` (already implemented in `main.js`) — no rebuild |
| Sparks | 450 orange/blue additive points | ~200–300 warm gold/blush additive points (fewer, since it's a hero-only effect, not full-page) |
| Scroll model | whole-page lerp drives a 360° orbit | hero-local scroll progress (0→1 across the pinned hero) drives a partial orbit (e.g. ±40°) + shader/particle intensity |

## 4. Section-by-section mapping (reference → adaptation)

- **Header/nav** → already exists (`#navbar`), untouched.
- **Cinematic text slides (4x)** → collapse into the *existing* hero text-cycling stage
  (`#questionPhase`/`#revealPhase` in `index.html`); only the reveal phase gets the per-letter
  blur-up treatment (title only, not the cycling questions — those already have their own GSAP
  treatment in `main.js`).
- **Image mask slide (slide-2)** → skip. Not part of the hero; no equivalent needed since we're
  not touching the about/services sections.
- **Grid-lines overlay + stories progress bar** → optional stretch goal, scoped to the hero only
  (e.g. a slim scroll-progress bar for the hero's own pinned duration). Not the full-page 5-line
  grid from the reference — that reads as very "tech/agency" and would clash with the soft wellness
  branding. **Decision: skip the grid overlay entirely**, keep the hero visually calmer.
- **Forge sparks** → warm light-mote particles (see §3).
- **Liquid-bronze shader** → liquid warm-gradient shader, reskinned palette, same math.
- **Bronze horse GLB** → procedural sacred-geometry centerpiece.
- **Camera 360° orbit over 900vh** → partial parallax orbit over the hero's own pinned scroll
  distance only.

## 5. Step-by-step build order

### Phase A — groundwork
- [x] A1. Three.js r0.160 pinned via `<script type="importmap">` in `<head>` of `index.html`,
      resolving `"three"` to the unpkg ES module build.
- [x] A2. `<canvas id="hero-webgl">` added inside `#hero`, before the existing `#heroCanvas`.
      `#heroCanvas`/`.orb`/`#heroMandala` kept in the DOM untouched, hidden via CSS only when
      `body.webgl-hero` is present.
- [x] A3. `#hero` wrapped in `.hero-wrap#heroWrap` (`height: 200vh` when `body.webgl-hero`,
      `.hero` becomes `position: sticky; top: 0`). Audited `js/main.js`: no ScrollTrigger below the
      hero uses a hard-coded offset tied to hero height — all trigger off their own section
      elements — so this was low-risk and confirmed safe in Phase E.

### Phase B — new WebGL module (`js/hero-webgl.js`)
- [x] B1. Scene/camera/renderer scoped to `#hero-webgl`, sized from `window.innerWidth/Height`
      (hero is always viewport-width/height in this layout).
- [x] B2. Warm 3-light rig: cream/gold spot key light (with soft shadows), blush/rose directional
      rim light, warm-white directional fill.
- [x] B3. Procedural centerpiece: gold icosahedron core + 3 rose/gold torus rings at angled tilts
      (independent spin speeds) + a 10-sphere petal halo, all under one `centerpiecePivot` group.
- [x] B4. 240 additive `THREE.Points`, warm-gold majority / blush-rose minority, procedural
      radial-gradient canvas sprite, drift-up-and-recycle motion with scroll-turbulence.
- [x] B5. Liquid-silk background shader ported (identical warped-sine/noise math), repaletted
      cream/gold (top) → dusty rose/mauve (bottom), plane attached to camera, `renderOrder -10`.
- [x] B6. Hero-local scroll progress computed from `#heroWrap`'s bounding rect (0→1 across the
      200vh wrapper only, not full document height); drives shader `uScroll`, particle turbulence,
      and a partial ±40° camera orbit.
- [x] B7. Mouse parallax tilts the centerpiece pivot via a scoped `mousemove` listener inside the
      module (didn't reuse `main.js`'s cursor-lerp listener — different purpose/target, and having
      two independent listeners for two independent effects is fine, confirmed no conflict).
- [x] B8. `supportsWebGL()` feature detection gate, plus a second-layer try/catch around scene
      setup — either failure path removes `body.webgl-hero` and reverts to the existing 2D canvas.
- [x] B9. Resize handling scoped to `window.innerWidth/Height` (confirmed via CSS that hero is
      always full-viewport in this layout, so no separate bounding-rect tracking needed).

### Phase C — text/overlay integration
- [x] C1. Per-letter blur-up reveal added to the brand title (`.hero-brand-name .brand-inner`)
      only, via `splitBrandNameIntoChars()` — operates on `.brand-inner`'s `textContent` (not the
      outer element's `innerHTML`) so the existing nested markup isn't corrupted. Each word is
      wrapped in a `white-space: nowrap` group so the line can only break between words, never
      mid-word (an actual bug caught in Phase E QA — see "what shipped" below).
- [x] C2. Verified in Phase E: pill tags, scroll indicator, and hook-section entry animation all
      still trigger correctly with the taller/sticky hero.

### Phase D — styling
- [x] D1. New `/* ===== HERO WEBGL ===== */` block in `css/style.css`. `.orb`/`#heroMandala`/
      `#heroCanvas` hidden via `body.webgl-hero .orb, body.webgl-hero .hero-canvas, body.webgl-hero
      .hero-mandala-bg { opacity: 0; visibility: hidden; }` — only when WebGL actually initialized
      successfully; otherwise they remain the visible fallback.
- [x] D2. **Decision taken (per user's "start implementation" go-ahead on my recommendation):**
      full 2D/CSS fallback below 768px (`isSmallScreen` check skips WebGL entirely) — no scaled-down
      3D tier on mobile, to protect battery/perf on a conversion-driving business site.

### Phase E — QA
- [x] E1. Verified via headless Chrome (puppeteer-core, `--use-angle=swiftshader --enable-webgl
      --ignore-gpu-blocklist`): `body.webgl-hero` applied, WebGL context created (1440×900), scene
      renders (centerpiece, shader, particles all visible in screenshots), no page/console errors
      from site code. (The one recurring console error, `THREE.WebGLRenderer: ... Canvas has an
      existing context of a different type`, was isolated to the QA script's own diagnostic
      `canvas.getContext()` probe requesting a second context type on the same canvas — not a bug
      in `hero-webgl.js`; confirmed reproducible only when that probe line runs.)
- [x] E2. Verified via step-scroll screenshot through the full page (hero → hook cards → ... →
      contact form → footer): no layout shift, no blank/stuck sections, all ScrollTrigger reveals
      below the hero fire correctly with the taller/sticky hero.
- [x] E3. Verified: mobile viewport (390×844) renders the original, unmodified 2D fallback (dot
      particles + mandala corner backdrop), empty `body.className`, WebGL canvas stays at
      `opacity: 0`.
- [x] E4. Render loop is gated by an `IntersectionObserver` on `#heroWrap` — `animate()` still
      calls `requestAnimationFrame` each frame but skips the expensive `renderer.render()` call
      while the hero isn't intersecting, so GPU work stops once the user has scrolled well past
      the hero (not a full `cancelAnimationFrame` teardown, but equivalent in practice since the
      per-frame cost without rendering is negligible).
- [x] E5. Verified: `prefers-reduced-motion: reduce` (desktop viewport) renders the original static
      mandala-backdrop hero, empty `body.className`, WebGL canvas stays at `opacity: 0`.

### Phase F — polish & handoff
- [x] F1. Code review pass done — no dead code found; the module is all load-bearing (no leftover
      Laocoön-specific code was ever copied in verbatim, only the shader math pattern).
- [x] F2. This file's checkboxes updated to reflect true completion status (see "What shipped"
      below for the two bugs caught and fixed during QA).
- [ ] F3. Ask user whether to commit (per repo convention: only commit when explicitly asked) —
      pending, see end of conversation.

## 6. Decisions taken

1. **Mobile behavior**: full 2D/CSS fallback below 768px (no scaled-down 3D tier). Confirmed.
2. **Hero pin length**: 200vh (within the recommended short 150–200vh range), so the effect reads
   as a flourish rather than delaying real content.
3. **Grid/progress-bar overlay**: skipped entirely, per §4.
4. **Reduced-motion / mobile fallback**: both in-scope for v1, both implemented and verified.

## What shipped (Phase F summary)

- `js/hero-webgl.js` (new): procedural sacred-geometry centerpiece, warm liquid-silk shader
  background, 240-particle light-mote system, hero-local scroll-driven partial camera orbit +
  mouse parallax, full graceful-degradation chain (reduced-motion / mobile / no-WebGL / init
  failure → original 2D hero, untouched).
- `index.html`: importmap, `#heroWrap` tall wrapper, `#hero-webgl` canvas, new script tag. No
  existing markup below the hero touched.
- `css/style.css`: new `HERO WEBGL` block (sticky stage, layer visibility toggles, per-letter
  reveal styles, mobile safety-net media query) plus, from Phase E QA fixes: a `.word-group`
  nowrap wrapper (prevents the brand title from wrapping mid-word), a soft radial scrim behind
  the hero text stack, and a cream text-shadow halo on all hero text (scoped to `body.webgl-hero`
  only) so the headline/tagline stay legible over the centerpiece regardless of which facet or
  shader color is behind them at a given scroll position.
- Two real bugs caught and fixed during Phase E QA (not present in the original Phase A–D build):
  1. Per-letter splitting broke word-wrapping (letters could wrap mid-word, e.g. "HARMO"/"NY") —
     fixed by grouping each word's chars in a `white-space: nowrap` wrapper.
  2. The centerpiece was dead-center behind the headline with no legibility treatment — fixed by
     nudging the centerpiece down/back slightly (`pivot.position.y`, camera distance) and adding
     the scrim + text-halo described above.

## 7. Resumption notes

Implementation is complete through Phase E; only F3 (ask about committing) remains, and that
requires the user's turn, not further coding. If a new session picks this up: the code is done and
QA-verified per above — the only remaining action is asking the user whether to commit.
