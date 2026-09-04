# Free-plan / egress optimization

**Purpose:** Keep Smart Lineman inside **Supabase Free** toward ~2,000 occasional users. Free does not bill overages; it **restricts** the project. Do not recreate the leaks listed here.

This is a standing constraint, not a one-off ship. Quota cuts are **PWA-only** unless you are also shipping native — do not touch `android-latest.json` or the APK for these changes.

---

## The box

| Limit | Free allowance | Rule |
|-------|----------------|------|
| Egress (uncached) | **5 GB / month** | Target under ~4 GB. Database JSON and Storage downloads both count. |
| Cached egress | 5 GB | Same. Prefer small stored files over on-the-fly resize. |
| Image Transformations | **Not on Free** | Zero `/render/image` / `.transform()`. Disable the feature in the dashboard. |
| Database size | 500 MB | `quiz_attempts` is the table that will grow. Archive last. |
| Realtime | 200 connections | Fine today. Do not add always-on channels for vanity live data. |

Custom phone/PIN auth uses RPCs, not `supabase.auth` MAU. Auth MAU is not the bill driver.

---

## Hard rules

1. **Public landing must not call Supabase** (PostgREST, Storage, Realtime, or RPCs). Strangers who never log in must not use the 5 GB pipe.
2. **Never build `/storage/v1/render/image` URLs.** Serve the stored public object. Compress on upload.
3. **Do not prefetch Rank / Hall of Fame** on login, Home, or pull-to-refresh. Those screens load when opened.
4. **Do not snapshot the live monthly list.** The Online / “Xm ago” badge comes from live `leaderboard_view` (`last_login_at` / `last_active`). Snapshot **closed months only**.
5. **Do not fetch another user’s `quiz_attempts`, PPE, tools, or fat profile** for a Rank tap. Public pride card uses the row already on screen.
6. **Do not put lesson posters, PDFs, or APKs in the `avatars` bucket.**

---

## File map

| Path | Role |
|------|------|
| `src/utils/avatarImage.js` | Stored public URL; no transforms |
| `src/components/Landing.jsx` | Static 500+ / 20+; Redis visits only |
| `src/utils/landingVisitService.js` | `/api/landing-visits` (Redis, not Postgres) |
| `src/SmartLinemanUI.jsx` | Pull-to-refresh = profile + notifications + cache invalidate; `sponsorAdBlocked` on landing / guests |
| `src/components/Home.jsx` | Core lessons from `completed_lessons` only; hourly CTA still two small `quiz_attempts` lookups |
| `src/components/LeaderboardUserSheet.jsx` | Public pride card vs admin identity card |
| `src/components/Competitions.jsx` | Own Rank row → My Progress; HoF skip-reload `boardsVersion` |
| `src/utils/hallOfFameSnapshots.js` | Closed-month localStorage snapshots + `HOF_GALLERY_BOARDS_VERSION` / cache key |
| `src/utils/leaderboardService.js` | All-time overlay, monthly views, HoF v11, encouragement boards |
| `src/utils/leaderboardCacheKeys.js` | `invalidateLeaderboardCaches` — keep keys in the same PR as new cache names |
| `src/utils/trainingLessonIds.js` | `filterCoreCompletedLessonIds` (Home + My Progress) |
| `src/components/safety/usePtwWatch.js` | PTW poll every 3s + Realtime while a permit is open |
| `src/utils/landingBoardsQuery.js` | Unused by landing; do not wire it back |

`/api/landing-stats` and `/api/landing-boards` still exist. **Do not call them from the public landing.**

---

## Done (do not regress)

| Cut | What changed | Trade-off |
|-----|----------------|-----------|
| Image transforms | `avatarDisplayUrl` serves `/object/public/avatars/...` | Old uncompressed camera originals download at full size until re-uploaded |
| Public landing | No count RPC, no podium, no HoF faces, no sponsor interstitial | Members 500+ / Mitra 20+ are hardcoded; Advertise chip is the public CTA |
| Rank tap card | Non-admin: name, photo, district, score, prize photos. No phone / blood / PPE / tools / attempt ledger | Own row opens My Progress. Admin tapping someone else still loads identity + PPE + tools |
| Pull-to-refresh | `fetchProfile` + `fetchNotifications(true)` + `invalidateLeaderboardCaches` | Rank is stale until Rank/Prizes opens |
| Home lesson ledger | No unbounded `quiz_attempts` fetch. Badge / Start / Continue use profile `completed_lessons` | Home can lag if `completed_lessons` is stale |
| My Progress ledger | Profile row only. Lessons / badge / chapters from `completed_lessons`; penalties from `total_penalties` | No hourly count, active days, or pace stats |
| HoF cache + snapshots | Gallery skip uses `HOF_GALLERY_BOARDS_VERSION`; invalidate clears v11; closed months persist in localStorage | Live monthly never snapshotted — Online badge stays live |

`leaderboardService` stays imported in `SmartLinemanUI.jsx` for the **month-winners preview**, not for pull-to-refresh Rank.

Hourly “this hour / today” queries on Home are **kept** (two bounded lookups per open).

---

## Remaining work (cheap first)

Do **not** start Hall of Fame snapshots next. That is month-end work and easy to freeze the Online badge. Client cuts first:

| Order | Work | Why it still costs |
|-------|------|--------------------|
| 1 | **All-time Rank** drop `overlayCumulativeReading` | `fetchAllTime` paginates **every** `lesson_bonus%` / `life_skill_bonus%` attempt for the top 50. Display `leaderboard_view` / `profiles.reading_points` instead. |
| 2 | **Live monthly from views** | `fetchMonthly` + `fetchEncouragementBoards` still page a month of attempts (`fetchMonthlyActivityAttempts`) for Online badges and learner/improved boards. Keep the badge; shrink the columns / reuse `leaderboard_view` activity already fetched. |
| 3 | **PTW poll** | `usePtwWatch.js` polls every **3s** plus Realtime while a permit is open. Widen the interval or rely on Realtime when the table is live. Only hurts operators/linemen with a permit open. |
| 4 | **Last:** 90-day `quiz_attempts` archive | Database size, not egress. Do after display no longer needs unbounded history. |

Play (compact ladder, not Rank/Prizes) can still open **another user’s My Progress**. That is a leftover privacy + egress path, not part of the Rank pride card.

---

## Do not reintroduce

| Smell | Correct pattern |
|-------|-----------------|
| `leaderboardService.fetchAllTime(true)` / `fetchMonthly(true)` from `refreshData` | Invalidate cache only |
| `Landing.jsx` importing `supabase` or `fetchLandingBoards` | Static copy + Redis visits |
| `SponsorAdOverlay` on `landing` / guests | `sponsorAdBlocked` includes `!user` and `currentView === 'landing'` |
| Rank sheet fetching `quiz_attempts` for the tapped user | Pride card from `preview` + `hallOfFameData` |
| Home or My Progress calling `mergeCoreLessonProgressIds` against a full attempt list | `filterCoreCompletedLessonIds(completed_lessons)` |
| `my_progress_attempts_*` / unbounded `quiz_attempts` from My Progress | Profile row only (`completed_lessons`, `total_penalties`) |
| Running `scripts/maintenance/optimize_avatars_to_webp.mjs` on Free | That script uses Image Transformations |

---

## Cache keys (keep in sync)

Current **write** keys in `leaderboardService.js`:

| Fetch | Key |
|-------|-----|
| All-time | `leaderboard_full_all_time_rdg` |
| Monthly | `leaderboard_monthly_ist_badge_<y>_<m>` |
| Encouragement | `leaderboard_encouragement_ist_badge_<y>_<m>_<bn\|en>` |
| Hall of Fame | `hall_of_fame_gallery_v11` (`boardsVersion: 11`) + per-month `slm_hof_month_v11_*` snapshots |

`invalidateLeaderboardCaches` must list every key that `requestManager` still writes. When you bump `hall_of_fame_gallery_v*`, bump **service, Competitions skip check, and invalidate** together.

---

## Gotchas

- **Online badge vs snapshots.** Monthly Rank shows Online / “Xm ago” from `leaderboard_view.last_login_at` / `last_active`. A frozen monthly snapshot would show last-month presence as if it were now.
- **Home vs My Progress.** Both trust `completed_lessons` for lesson count / badge. Do not bring the attempt ledger back on either screen.
- **Admin Rank card** still hits profiles + PPE + tools. That is intentional and rare.
- **`FAT_PROFILE_SELECT` includes `completed_lessons`.** Encouragement boards still pull it. Slimming that select is part of remaining monthly work, not a drive-by in unrelated PRs.

---

## Related

- [Avatars, sponsor images, Free Storage](./avatars-sponsor-storage.md)
- [Public landing](./public-landing.md)
- [Monthly encouragement boards](./monthly-encouragement-boards.md)
- [Score & leaderboard debugging](../../SCORE_DEBUGGING_GUIDE.md)
- [Shell interrupts](./shell-interrupts.md) — sponsor ad off landing
- [Production deployment](./deployment.md) — PWA-only ships must not touch the APK channel

---

## Change log

- **2026-09:** HoF v11 cache aligned; closed months snapshot to localStorage (`hallOfFameSnapshots.js`). Remaining: all-time overlay, monthly attempt paging, PTW poll, archive last.
