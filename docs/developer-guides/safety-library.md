# Safety Library — developer guide

**Purpose:** Browse safety equipment / charts from synced library data, open a **detail modal** with images (Google Drive–hosted URLs resolved for display), metadata, and copy.

**Primary file:** `src/components/safety/SafetyLibrary.jsx`

**Related:**

| Path | Role |
|------|------|
| `src/utils/libraryService.js` | Loads and filters library items (source of `items` / categories). |
| `src/SmartLinemanUI.jsx` | Lazy-loads `SafetyLibrary` when `currentView === 'safety-library'`. |

---

## Public props

| Prop | Type | Notes |
|------|------|--------|
| `language` | `'en'` \| `'bn'` | Drives `t` copy object. |
| `setCurrentView` | `(view: string) => void` | Used for navigation (e.g. video guides). |

---

## UI building blocks (same file)

1. **`getGoogleDriveDirectLink(url)`** — Rewrites common Drive share URLs to a `googleusercontent` direct image URL (with cache-bust date). Falls through for non-Drive URLs.
2. **`ImageSlider`** — Multi-image carousel with auto-advance (3s), prev/next chevrons, dots. Props: `images`, `alt`, `aspect` (Tailwind classes), `showControls`, **`enableZoom`** (optional). When `enableZoom` is true (detail modal only): `−` / `1×` / `+` pill (bottom-left), scale **1×–2.5×** in **0.25** steps; **drag** (pointer + touch) pans the zoomed image with clamped bounds, `cursor-grab` / `grabbing`, **`touch-none`** on the viewport; **two-finger pinch** scales between the same min/max (global `pointermove` / `pointerup` in capture phase so both contacts track); auto-advance pauses while zoom is above 1× or a pinch is active; pan resets with zoom or slide change. Slide changes use a guaranteed transition via Web Animations API (`translateX` + fade + slight scale) so image swaps are visibly smooth across mobile and desktop.

**Carousel arrows:** Left/right chevrons stay **always visible** on all pointer types (including desktop) so users do not miss image navigation affordances.

**Mobile zoom/pan:** Uses **Pointer events** + `setPointerCapture` for single-finger pan when zoomed. While zoomed, a **non-passive `touchmove`** listener calls `preventDefault` so the parent modal scroll does not steal the gesture; **`-webkit-touch-callout: none`**, **no tap highlight**, **`draggable={false}`** + `onDragStart` prevent iOS image callout/drag quirks; **`lostpointercapture`** clears drag state and prunes the internal pointer map.
3. **`GridImage`** — Single random thumbnail from `images` for grid cards.
4. **`SafetyLibrary`** — Search, category filter, grid, and **detail modal** when `selectedItem` is set.

---

## Detail modal layout (important)

The modal is a **column flex** shell with view-specific behavior:

- **Mobile:** full-screen sheet style (`h-[100dvh]`) with safe-area top/bottom padding.
- **Desktop:** larger framed dialog (`sm:w-[min(96vw,1220px)]`, height constrained by viewport) that starts below the app title bar (`sm:pt-20 lg:pt-24` on overlay container) so the modal header is never hidden.

1. **Drag pill** (mobile only, `sm:hidden`) — tap to dismiss; decorative affordance.
2. **Toolbar row** (`shrink-0`) — **category** label (left) and **Close** (right). This bar sits **above** the image so labels and chrome **do not overlay** the artwork.
3. **Scroll body** (`flex-1 min-h-0`) — mobile is stacked; desktop is split into two columns.

- **Desktop content split:** `sm:grid` with image + text side-by-side (`~1.15fr / 0.85fr`).
- **Charts vertical viewing:** when selected item is `category === 'Charts'`, media pane enables vertical scroll on desktop so tall chart graphics can be viewed fully.
- **Related links UI:** chart links and non-chart links are rendered as compact chip/button rows without section labels.

**Do not** reintroduce `absolute top-4` badges or close buttons on top of the image region without reserving space (padding or a dedicated bar)—that caused overlap on tall graphics and titles.

---

## Data shape (typical item)

Consumers expect fields such as: `id`, `name_bn`, `category`, `images` (array of URLs), optional `function_bn`, `guide_bn`, `approx_price_inr`, optional **`related_items`** — resolved at load time from the sheet. Exact schema should match `libraryService` / backend sync.

### Cross-links between items (Charts ↔ PPE, etc.)

In the **published Google Sheet**, add optional columns (any row for that item can contribute; values are merged and de-duplicated):

| Column (header) | What to put |
|-----------------|-------------|
| **`Related_Keys`** | Recommended: pipe-separated **Google Drive / file URLs** — copy the exact value from the target row’s **`File Link`** column (same URL format you already use for images). |
| **`Related`** | Shorter alias for the same cell content as `Related_Keys`. |
| **`Related_File_Links`** | Optional second column if you prefer to keep text keys and URLs separate; same pipe-separated URL rules. |

**Preferred (unique even when `Name_BN` repeats):** paste **`File Link`** URLs only, separated by `|`:

```text
https://drive.google.com/file/d/XXXX/view?usp=sharing | https://drive.google.com/file/d/YYYY/view?usp=sharing
```

The app matches by **Drive file id** (and normalized URL), so the target row is unambiguous.

**Legacy (still supported):** pipe-separated **canonical item ids** — `Folder Name` + `:` + display name, e.g. `Charts:Helmet guide | PPE:Helmet`. Use only when names are unique; duplicate `Name_BN` across items can collide.

**Not supported:** a generic “open this Google Sheet tab” browser URL without a **file** id (the published CSV has no stable row handle for that). Use the row’s **`File Link`** instead.

At runtime, `libraryService` resolves tokens to other items in the same fetch. Unmatched URLs or ids are skipped. The detail modal shows compact chip/button rows (chart + non-chart split), no section title; **Back** appears after following a link.

### CSV/header robustness

- `libraryService.parseCSV()` strips UTF-8 BOM from header row and trims header names before lookup.
- This prevents cases where `Related_Keys` exists in the sheet but is silently missed because of BOM-prefixed first header.

---

## Extension points

- **New categories:** Ensure filter chips and any `category === 'Charts'` layout branches stay consistent.
- **Modal actions:** Add buttons only in the toolbar or the scrollable footer area—avoid stacking over `ImageSlider`.
- **Images:** Prefer `getGoogleDriveDirectLink` for new Drive-backed assets; handle `onError` in slider like existing `handleImageError`.

---

## Gotchas

- **Z-index:** Safety Library detail modal uses `z-[11000]` so it stays above app headers/menus and other overlays.
- **Auto-slide timer:** `ImageSlider` resets when `images` reference changes; avoid recreating the array each parent render without need.
- **Encoding:** User-visible strings for BN should live in the `t` object as UTF-8 in the repo—avoid pasting mojibake literals in JSX.

---

## Quick check after UI changes

- [ ] Open an item with **one** and **multiple** images; verify arrows/dots and no toolbar overlap.
- [ ] Multi-image transitions are visibly smooth (arrow tap + auto-slide), not abrupt.
- [ ] **Charts** item: tall image scrolls; toolbar still visible.
- [ ] Desktop: modal header sits below app title bar (not covered) and image/text are side-by-side.
- [ ] Safe area on notched phones: modal `pt-[env(safe-area-inset-top)]` on shell; toolbar immediately below drag pill.
