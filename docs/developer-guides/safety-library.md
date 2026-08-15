# Safety Library — developer guide

**Purpose:** Browse safety equipment / charts from the **in-app catalog**, open a **detail modal** with images, metadata, and copy.

**Primary file:** `src/components/safety/SafetyLibrary.jsx`

**Related:**

| Path | Role |
|------|------|
| `src/data/safetyLibraryItems.js` | Catalog (items, categories, local image paths, related links). |
| `src/utils/libraryService.js` | Returns the in-app catalog (no live Google Sheet). |
| `src/utils/safetyLibraryImageUrl.js` | Resolves `/assets/safety/...` for web and native. |
| `src/SmartLinemanUI.jsx` | Lazy-loads `SafetyLibrary` when `currentView === 'safety-library'`. |

Identify does **not** fetch the published Google Sheet at runtime. Hourly visual quiz still uses its own sheet tab.

---

## Public props

| Prop | Type | Notes |
|------|------|--------|
| `language` | `'en'` \| `'bn'` | Drives `t` copy object. |
| `setCurrentView` | `(view: string) => void` | Used for navigation (e.g. video guides). |

---

## UI building blocks (same file)

1. **`ImageSlider`** — Multi-image carousel with auto-advance (3s), prev/next chevrons, dots. Props: `images`, `alt`, `aspect` (Tailwind classes), `showControls`, **`enableZoom`** (optional). When `enableZoom` is true (detail modal only): `−` / `1×` / `+` pill (bottom-left), scale **1×–2.5×** in **0.25** steps; **drag** (pointer + touch) pans the zoomed image with clamped bounds, `cursor-grab` / `grabbing`, **`touch-none`** on the viewport; **two-finger pinch** scales between the same min/max (global `pointermove` / `pointerup` in capture phase so both contacts track); auto-advance pauses while zoom is above 1× or a pinch is active; pan resets with zoom or slide change. Slide changes use a guaranteed transition via Web Animations API (`translateX` + fade + slight scale) so image swaps are visibly smooth across mobile and desktop.

**Carousel arrows:** Left/right chevrons stay **always visible** on all pointer types (including desktop) so users do not miss image navigation affordances.

**Mobile zoom/pan:** Uses **Pointer events** + `setPointerCapture` for single-finger pan when zoomed. While zoomed, a **non-passive `touchmove`** listener calls `preventDefault` so the parent modal scroll does not steal the gesture; **`-webkit-touch-callout: none`**, **no tap highlight**, **`draggable={false}`** + `onDragStart` prevent iOS image callout/drag quirks; **`lostpointercapture`** clears drag state and prunes the internal pointer map.
2. **`GridImage`** — Single random thumbnail from `images` for grid cards.
3. **`SafetyLibrary`** — Search, category filter, grid, and **detail modal** when `selectedItem` is set.

---

## Detail modal layout (important)

The modal is a **column flex** shell with view-specific behavior:

- **Mobile:** full-screen sheet style (`h-[100dvh]`) with safe-area top/bottom padding.
- **Desktop:** larger framed dialog (`sm:w-[min(96vw,1220px)]`, height constrained by viewport) that starts below the app title bar (`sm:pt-20 lg:pt-24` on overlay container) so the modal header is never hidden.

1. **Drag pill** (mobile only, `sm:hidden`) — tap to dismiss; decorative affordance.
2. **Toolbar row** (`shrink-0`) — **category** label (left) and **Close** (right). This bar sits **above** the image so labels and chrome **do not overlay** the artwork.
3. **Scroll body** (`flex-1 min-h-0`) — mobile is stacked; desktop is split into two columns.

- **Desktop content split:** `sm:grid` with image + text side-by-side (`~1.15fr / 0.85fr`).
- **Charts:** images fit the same **2/3 viewport** frame as other items (`h-[66dvh]`, `object-contain`). Use zoom to read small text.
- **Related links UI:** chart links and non-chart links are rendered as compact chip/button rows without section labels.

**Do not** reintroduce `absolute top-4` badges or close buttons on top of the image region without reserving space (padding or a dedicated bar)—that caused overlap on tall graphics and titles.

---

## Data shape (typical item)

```js
{
  id: 'PPE:হেলমেট',
  category: 'PPE',
  name_bn: 'হেলমেট',
  function_bn: '...',
  images: ['/assets/safety/library/ppe/Safety_Helmet.webp'],
  approx_price_inr: '450',
  guide_bn: '...',
  related_items: [{ id, category, name_bn }]
}
```

Images are app-hosted WebP paths under `/assets/safety/`, sized for phones (product photos max 960px, charts max 1080×1600). Native APK loads them from the live site (`nativeRemoteAssets`), not Google Drive. Re-compress with `node scripts/maintenance/compress-safety-library-images.mjs`.

### Adding or editing items

1. Put files in `public/assets/safety/` (library snapshots live in `public/assets/safety/library/`).
2. Edit `src/data/safetyLibraryItems.js` — add the item or append image paths / `related_items`.
3. Optional: `node scripts/maintenance/snapshot-safety-library.mjs path/to.csv` if you have an old FileList CSV to re-import (overwrites the catalog; re-apply local extras afterward).

### Cross-links

Set `related_items` to other catalog `id`s. The detail modal shows compact chips (chart + non-chart split). **Back** appears after following a link.

---

## Extension points

- **New categories:** Add a chip icon in `getCategoryMetadata` and keep any `category === 'Charts'` layout branches consistent.
- **Modal actions:** Add buttons only in the toolbar or the scrollable footer area—avoid stacking over `ImageSlider`.
- **Images:** Use `/assets/safety/...` paths. `toSafetyLibraryDisplayUrl` rewrites them for native.

---

## Gotchas

- **Z-index:** Safety Library detail modal uses `z-[11000]` so it stays above app headers/menus and other overlays.
- **Auto-slide timer:** `ImageSlider` resets when `images` reference changes; avoid recreating the array each parent render without need.
- **Encoding:** User-visible strings for BN should live in the catalog as UTF-8 in the repo.
- **APK size:** `assets/safety` is stripped from the APK and loaded from `https://www.smartlineman.in`. Deploy the website before expecting new library photos on native.
- **Do not** point Identify back at the published FileList CSV. The hourly **quiz** tab of that workbook is a separate channel.

---

## Quick check after UI changes

- [ ] Open an item with **one** and **multiple** images; verify arrows/dots and no toolbar overlap.
- [ ] Multi-image transitions are visibly smooth (arrow tap + auto-slide), not abrupt.
- [ ] **Charts** item: image fits the 2/3-screen frame; zoom still works.
- [ ] Desktop: modal header sits below app title bar (not covered) and image/text are side-by-side.
- [ ] Safe area on notched phones: modal `pt-[env(safe-area-inset-top)]` on shell; toolbar immediately below drag pill.
- [ ] Works offline in PWA after first load (catalog is bundled; images may still need cache).
