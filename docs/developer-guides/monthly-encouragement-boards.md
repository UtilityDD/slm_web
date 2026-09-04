# Monthly encouragement boards & Hall of Fame tabs

Canonical reference for the **four monthly leaderboard tabs** (live rankings + past-month Hall of Fame), prize rules, data assembly, and UI copy.

## Purpose

Besides the main monthly champion list, the app surfaces **three encouragement boards** so newer or specialist players can compete for month-end prizes without needing to beat the overall #1.

| Board ID | Tab label (BN) | Who ranks |
|----------|----------------|-----------|
| `main_champion` | মাসের সেরা | Top 3 by **total monthly points** (everyone). |
| `new_player` | নতুন সদস্য | Top 3 among joiners in the **last 90 days** who are **not** in the monthly top 3. |
| `most_improved` | সবচেয়ে এগিয়ে | Top 3 by **positive point growth** vs previous month (eligibility gates apply). |
| `top_learner` | পড়াশোনা | Top 3 by **lesson reading points** this month (`lesson_bonus_*` attempts). |

**Prizes:** top **3** on each list receive awards at month-end, but **each person gets at most one prize**. Boards are processed in priority order (`BOARD_ORDER`: champion → new → improved → learner). If someone already won on a higher-priority list, they are skipped on lower lists and the **next eligible player** takes that slot.

- **Live monthly tabs** show standings plus **replacement prize winners**; leaders who already won on a higher list appear **grayed out** (`PRIZE_STATUS.SUPERSEDED`).
- **Hall of Fame** and the **info modal** use `buildBoardDisplayList()` — same superseded + replacement layout.

Copy and rules live in `getEncouragementCopy()` — EN/BN strings for tabs, logic lines, and info modal.

---

## File map

| Path | Role |
|------|------|
| `src/utils/monthlyEncouragementBoards.js` | Rules constants, `buildEncouragementBoards`, `archiveBoardsFromEncouragement`, `resolvePrizeWinners`, `getEncouragementCopy`, tab helpers (`getMonthlyLeaderboardList`, `getHallOfFameWinners`, …). |
| `src/utils/hallOfFameSnapshots.js` | Closed-month localStorage snapshots; `HOF_GALLERY_BOARDS_VERSION` / `HOF_GALLERY_CACHE_KEY` |
| `src/utils/leaderboardService.js` | `fetchMonthly`, `fetchEncouragementBoards`, `fetchHallOfFame` (gallery cache + month snapshots). |
| `src/utils/leaderboardCacheKeys.js` | `invalidateLeaderboardCaches` — must list all leaderboard-related cache keys. |
| `src/components/Competitions.jsx` | Global Rankings UI: All-Time / This Month tabs, monthly sub-tabs, Hall of Fame gallery + sub-tabs, podium/list rendering. |
| `src/components/MonthlyEncouragementBoards.jsx` | `MonthlyBoardHeader` (one-line logic + ⓘ). |
| `src/components/MonthlyBoardInfoModal.jsx` | Info modal: prizes, rules, current top 3 for active board, timing note (champion only). |
| `scripts/maintenance/preview_hall_of_fame_boards.mjs` | Read-only CLI to compare champion vs new-player rows per past month. |

---

## Rules constants (`RULES` in `monthlyEncouragementBoards.js`)

| Constant | Value | Meaning |
|----------|-------|---------|
| `NEW_PLAYER_DAYS` | 90 | Joined on or after `getNewPlayerCutoff(year, month)`. |
| `NEW_MIN_POINTS` | 500 | New-player **prize** eligibility (or 15 hourlies or 5 lessons). |
| `NEW_MIN_HOURLY` | 15 | |
| `NEW_MIN_LESSONS` | 5 | |
| `IMPROVE_MIN_PREV` | 200 | Previous month points floor for Most Improved pool. |
| `IMPROVE_MIN_CUR` | 500 | Current month points floor. |
| `LEARNER_MIN_LESSONS` | 8 | Distinct `lesson_bonus_*` quizzes in month for learner prize eligibility. |
| `TOP_N` | 3 | Display and prize slots per board. |

**New Player pool (important):** `buildEncouragementBoards` builds `newPool` from users who pass the 90-day test **and** are **not** in the current month’s champion top 3 (`championTopIds`). This keeps the New tab distinct from Champion when the overall leaders are also “new” by age.

**Most Improved:** excludes accounts joined in the current calendar month; excludes prior month’s #1 champion.

---

## Live monthly UI (`Competitions.jsx`, `leaderboardTab === 'monthly'`)

1. **Primary tabs:** All-Time | This Month (unchanged).
2. **Sub-tabs** (`MONTHLY_SUB_TAB_ORDER`): মাসের সেরা | নতুন সদস্য | সবচেয়ে এগিয়ে | পড়াশোনা.
3. **Data:**
   - **মাসের সেরা:** full list from `leaderboardService.fetchMonthly` (up to 50 rows).
   - **Other three:** top 3 from `fetchEncouragementBoards` → `boards[boardId].ranked`.
4. **Header:** `MonthlyBoardHeader` shows `meta.logic` (from `getEncouragementCopy`); ⓘ opens `MonthlyBoardInfoModal`.
5. **Score column:** `formatMonthlyPlayerScore(item, monthlyBoardTab)` — improvement board shows `+N`, learner shows `learner_score`.

**Fetch:** `fetchMonthlyLeaderboard` runs `fetchMonthly` and `fetchEncouragementBoards` in parallel.

---

## Hall of Fame (`showHallOfFame`)

- Toggle from Global Rankings header (“মাসের সেরা” / “বিজয়ীরা”).
- **Same four sub-tabs** as live monthly (`hallOfFameBoardTab`).
- **Data:** `leaderboardService.fetchHallOfFame` → past months from **March 2026+**, excluding the **current** calendar month.
- Each entry shape:

```js
{
  year, month,
  boardsVersion: 11,
  boards: {
    main_champion: [/* display rows: standing_rank, prize_rank, prize_status */],
    new_player: [/* superseded leaders + replacement winners */],
    most_improved: [/* … */],
    top_learner: [/* … */],
  },
  prizeWinners: { byBoard, winners, skipped },
  winners: [/* alias for main_champion — backward compat */],
}
```

- **Display:** `getHallOfFameWinners(entry, hallOfFameBoardTab)` reads `boards[boardKey]` from `buildBoardDisplayList` / `archiveBoardsFromEncouragement`. Subtitle: `hallOfFamePrizeNote`.
- **Refetch:** `fetchHallOfFameGallery` in `Competitions.jsx` skips reload when in-memory data already has `boardsVersion === HOF_GALLERY_BOARDS_VERSION` (from `hallOfFameSnapshots.js`). `invalidateLeaderboardCaches` clears `hall_of_fame_gallery_v11`. Closed months also persist as `slm_hof_month_v11_<y>_<m>` in localStorage — `fetchHallOfFame` skips Supabase when every closed month is snapshotted. **Do not** snapshot the live current month.

**Assembly:** `buildEncouragementBoards` → `resolvePrizeWinners` → `archiveBoardsFromEncouragement` (stores display rows with `prize_status`: `winner` | `superseded` | `replacement`).

---

## Caching

| Key | TTL (min) | Set in |
|-----|-----------|--------|
| `leaderboard_monthly_<y>_<m>` / `leaderboard_monthly_ist_badge_<y>_<m>` | 5 | `fetchMonthly` (current write key is the `ist_badge` form) |
| `leaderboard_encouragement_<y>_<m>_<bn\|en>` / `leaderboard_encouragement_ist_badge_<y>_<m>_<bn\|en>` | 5 | `fetchEncouragementBoards` (data is language-agnostic; key includes language for cache slot only) |
| `hall_of_fame_gallery_v11` | 30 | `fetchHallOfFame` (assembled gallery; month bodies may come from `slm_hof_month_v11_*` snapshots) |

On profile/points changes outside Competitions, call **`invalidateLeaderboardCaches(userId)`** (see `leaderboardCacheKeys.js`). When adding keys, update that helper in the same PR.

Bump `hall_of_fame_gallery_v*` and set `boardsVersion` when the Hall of Fame entry shape or board logic changes so clients refetch.

---

## Copy & i18n

All user-facing EN/BN strings for boards, tabs, prize rules, and empty states are centralized in **`getEncouragementCopy(language)`**. Prefer full sentences in Bengali over bullet fragments (`·`, `র‍্যাঙ্ক:` labels).

Info modal section titles in `MonthlyBoardInfoModal.jsx` are a mix of local BN strings and `copy.prizeRule` / `copy.prizeTitle`.

---

## Extension points

- **Change eligibility thresholds:** edit `RULES` and eligibility helpers in `monthlyEncouragementBoards.js`; update BN/EN `logic` strings in `getEncouragementCopy`.
- **Add a fifth board:** add `BOARD_IDS`, `BOARD_ORDER`, `MONTHLY_SUB_TAB_ORDER`, copy blocks, branch in `buildEncouragementBoards`, `archiveBoardsFromEncouragement`, and Competitions sub-tab UI.
- **Hall of Fame start month:** filter in `fetchHallOfFame` (`month_num.gte.3` / 2026) and `byMonth` loop.

---

## Gotchas

1. **`Competitions.jsx` has two return trees** (`isFullLeaderboard` vs hourly quiz). `MonthlyBoardInfoModal` must be mounted in **both** if info buttons appear in both (Global Rankings branch includes it; hourly branch has its own).
2. **Champion vs New sameness:** With only young accounts, overall top 3 may all be within 90 days; excluding champion top 3 from the new pool is **intentional** so tabs differ.
3. **Activity month bucket** uses `new Date(attempt.created_at)` local fields — can disagree with DB month on `monthly_leaderboard_view` near boundaries (same caveat as `SCORE_DEBUGGING_GUIDE.md` timezone section).
4. **`joined_at`** comes from `profiles.created_at` via view join + `fetchHallOfFame` profile enrichment; missing `created_at` excludes users from New Player boards.
5. **Most Improved** is often empty early in the month until players pass 500 pts and beat last month’s pace.
6. **Do not snapshot the live monthly list** to save egress. Online / “Xm ago” is live `leaderboard_view` data. Snapshot **closed** months only. See [Free-plan / egress optimization](./free-plan-optimization.md).

---

## Related

- [Score & leaderboard debugging](../../SCORE_DEBUGGING_GUIDE.md) — monthly view net points, cache invalidation, timezone notes.
- [Free-plan / egress optimization](./free-plan-optimization.md) — Rank tap card, no Rank prefetch, remaining `quiz_attempts` paging / HoF cache align.
- [Hourly Visual Quiz](./hourly-visual-quiz.md) — hourly penalties and difficulty (separate from encouragement boards).

---

## Change log

- **2026-09:** HoF v11 cache aligned; closed months snapshot to localStorage. Live monthly still pages attempt activity for Online badges.
- **2026-06:** Four tabbed boards; Hall of Fame stores **display rows** (`buildBoardDisplayList`: superseded leaders grayed + replacement winners); `resolvePrizeWinners` enforces one award per person; `MonthlyBoardHeader` + info modal.
