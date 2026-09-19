# Safety Library — developer guide

**Purpose:** Browse safety equipment / charts from the **in-app catalog**, open a **detail modal** with images, metadata, and copy.

**Primary file:** `src/components/safety/SafetyLibrary.jsx`

**Related:**

| Path | Role |
|------|------|
| `src/data/safetyLibraryItems.js` | Catalog (items, categories, local image paths, related links). |
| `src/data/identifyCharts.js` | Structured Bangla chart pages (howto / compare / table / cards) keyed by Charts item id. |
| `src/components/safety/IdentifyChartPage.jsx` | Renders a chart as a scrollable in-app page (not a poster image). |
| `src/components/safety/IdentifyChartThumb.jsx` | CSS thumbnail for Charts grid cards. |
| `src/utils/libraryService.js` | Returns the in-app catalog (no live Google Sheet). |
| `src/utils/safetyLibraryImageUrl.js` | Resolves `/assets/safety/...` for web and native. |
| `src/utils/safetyLibraryRecents.js` | Last 8 opened item ids in `localStorage` (`slm_identify_recents_v1`). |
| `src/utils/safetyLibraryPractice.js` | Practice pool (all except Charts); mixed name/grid questions; same type cannot run 3 times in a row; one cumulative count+% in `slm_identify_practice_v1`. |
| `src/components/safety/IdentifyPractice.jsx` | Practice overlay on Identify (no type tabs; randomizes নাম কী? / ছবি বাছুন). |
| `src/components/safety/IdentifyGridPractice.jsx` | 2×2 photo pick; right/wrong flash only. |
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
3. **`SafetyLibrary`** — Always-visible search, Bangla category chips (including **সব**), photo+name grid, last-8 recents strip, and **detail modal** when `selectedItem` is set.

---

## Browse UX

- **Search** is always on (not behind a mobile icon). It matches `name_bn`, `function_bn`, `guide_bn`, Bangla/English category labels, and **chart page body text** (tables, steps, tips).
- **Chips** use Bangla labels only (no icons), with item counts: সব, পিপিই, টুলস, ইনসুলেটর, চার্ট, এবি কেবল সরঞ্জাম, অন্যান্য (only categories present in the catalog). Default chip stays **পিপিই**.
- **Video guides** is not always in the Identify header. After about a minute of browsing (practice time does not count), an orange **ভিডিও** pill fades in under **কতটা চেনেন?** (absolute, so the header does not shift), stays ~16s, then fades out. It stays available on More. Do not put the orange video banner back on this page.
- **কতটা চেনেন?** is an orange pill in the title row; the **?** wiggles (no button breathe/scale pulse). While practice is open it is replaced by an **X** on the right. The X asks **পরখ বন্ধ করবেন?** in a centered body portal (not a bottom sheet). There are **no type tabs**. Each question is randomly **নাম কী?** or **ছবি বাছুন**, from all catalog items except Charts, with the same type never three times in a row. Play continues until they confirm quit. Both auto-advance with ঠিক/ভুল only. Score is one running total in `localStorage` (`slm_identify_practice_v1`) — count + percent. The header `%` badge updates after every answer; tap it for a clean all-time card (bold % + count only).
- **Grid cards** are square photo + Bangla name only — no English category badge.
- **Recents** (`এইমাত্র`) show when search is empty: last 8 opened ids, local only.
- There is **no** Identify → আমার পিপিই shortcut on this page.

---

## Detail modal layout (important)

The modal is a **column flex** shell with view-specific behavior:

- **Mobile:** full-screen sheet style (`h-[100dvh]`) with safe-area top/bottom padding.
- **Desktop:** larger framed dialog (`sm:w-[min(96vw,1220px)]`, height constrained by viewport) that starts below the app title bar (`sm:pt-20 lg:pt-24` on overlay container) so the modal header is never hidden.

1. **Drag pill** (mobile only, `sm:hidden`) — tap to dismiss; decorative affordance.
2. **Toolbar row** (`shrink-0`) — **category** label (left) and **Close** (right). This bar sits **above** the image so labels and chrome **do not overlay** the artwork.
3. **Scroll body** (`flex-1 min-h-0`) — mobile is stacked; desktop is split into two columns.

- **Desktop content split:** `sm:grid` with image + text side-by-side (`~1.15fr / 0.85fr`) for product items.
- **Charts:** open as a **full-width illustrative page** (`IdentifyChartPage`) from `src/data/identifyCharts.js` — steps, compare panels, or tables. No poster WebP, no zoom toolbar. Grid cards use `IdentifyChartThumb` (CSS), and catalog `images` for Charts stay empty.
- **Related links UI:** compact chips under **এগুলোও** (`relatedWithLabel`). Chart chips stay on the amber row; other items on the white row. Category pills on related chips use the Bangla/English label helper, not the raw English `category` id.
- **Copy boxes** (product items): **এটা কী** (`function_bn`) then **খেয়াল রাখুন** (`guide_bn`). Price shows only when it is not `---`. Chart tip/warning live inside the page content.

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

Product images are app-hosted WebP under `/assets/safety/` (max ~960px). **Charts** use structured pages in `identifyCharts.js`, not chart poster files. Native APK loads assets from the live site (`nativeRemoteAssets`). Re-compress product photos with `node scripts/maintenance/compress-safety-library-images.mjs`.

### Adding or editing items

1. Put files in `public/assets/safety/` (library snapshots live in `public/assets/safety/library/`).
2. Edit `src/data/safetyLibraryItems.js` — add the item or append image paths / `related_items`.
3. Optional: `node scripts/maintenance/snapshot-safety-library.mjs path/to.csv` if you have an old FileList CSV to re-import (overwrites the catalog; re-apply local extras afterward).

### Cross-links

Set `related_items` to other catalog `id`s. The detail modal shows compact chips (chart + non-chart split). **Back** appears after following a link.

---

## Extension points

- **New categories:** Add a Bangla/English row in `CATEGORY_LABELS`, an entry in `CATEGORY_ORDER`, and keep any `category === 'Charts'` layout branches consistent.
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

- [ ] Search field is visible on a phone-width layout (not hidden behind an icon).
- [ ] Chips read in Bangla; **সব** lists every category; default is still **পিপিই**.
- [ ] Search finds an item by a word from `function_bn` / `guide_bn`, not only the title.
- [ ] Grid cards show photo + name only (no English badge). No orange video banner.
- [ ] Open an item; recents strip appears after close. Open 9 items: only 8 remain, newest first.
- [ ] Detail: **এটা কী** / **মনে রাখবেন**; related heading **সাথে আরো**; Bangla category pill.
- [ ] Open an item with **one** and **multiple** images; verify arrows/dots and no toolbar overlap.
- [ ] Multi-image transitions are visibly smooth (arrow tap + auto-slide), not abrupt.
- [ ] **Charts** item: image fits the 2/3-screen frame; zoom still works; no empty text boxes.
- [ ] Desktop: modal header sits below app title bar (not covered) and image/text are side-by-side.
- [ ] Safe area on notched phones: modal `pt-[env(safe-area-inset-top)]` on shell; toolbar immediately below drag pill.
- [ ] Works offline in PWA after first load (catalog is bundled; images may still need cache).
