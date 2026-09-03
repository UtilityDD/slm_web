# Shell interrupts

**Purpose:** Keep full-screen ads and soft nudges from covering a **timed hourly quiz**. Scoring, submit, and the pack timer stay in `Competitions.jsx`; this stack only decides who may own the screen.

## File map

| Path | Role |
|------|------|
| `src/components/Competitions.jsx` | `onHourlyQuizPlayChange(true)` while a timed Play-surface attempt is open |
| `src/SmartLinemanUI.jsx` | `hourlyQuizPlaying`; `*Blocked` flags for ad / nudges / idle story |
| `src/utils/overlayQueue.js` | Who wins if two overlay flags are true |
| `src/utils/sessionInterruptBudget.js` | At most one **soft** prompt per app open |
| `src/components/SponsorAdOverlay.jsx` | Full-screen sponsor interstitial (`z-[230]`) |
| `src/components/ProfileFieldNudge.jsx` | Profile completion nudge |
| `src/components/PpeFieldNudge.jsx` | PPE field nudge |
| `src/components/PushOptInPrompt.jsx` | Push permission prompt |
| `src/components/IdleStoryReminder.jsx` | Idle accident-story reminder |

## Public contract

`onHourlyQuizPlayChange(playing)` — Play `Competitions` only.

`playing` is true when:

- not `isFullLeaderboard` (Rank / Prizes must not report)
- `activeQuiz` is set
- `quizSubmitted` is false
- `reviewMode` is false

Unmount (leave Play) reports `false`. Results and review are not “playing”.

## What is blocked while playing

| Surface | Flag |
|---------|------|
| Sponsor ad | `sponsorAdBlocked` |
| Profile nudge | `profileNudgeBlocked` |
| PPE nudge | `ppeNudgeBlocked` |
| Push opt-in | `pushOptInBlocked` |
| Idle story reminder | `idleReminderBlocked` |

Each overlay already dismisses if `blocked` becomes true while it is open. After the attempt ends, the usual dwell + every-other-open ad rules apply again.

## Soft budget vs overlay priority

- **Budget** (`sessionInterruptBudget.js`): first claim wins among profile, PPE, sponsor, push, culture survey, ad contact. Critical modals (update, logout, session ended) are not budgeted.
- **Priority** (`overlayQueue.js`): if two flags are true, the higher overlay wins. Sponsor is lowest among those auto prompts.

Hourly quiz play is **not** an overlay id. It is a block so those prompts never start (or close if they already did).

## Gotchas

- Hourly quiz portal is `z-[150]`; sponsor/push overlays are `z-[230]`. Blocking is required; raising quiz z-index is not enough (ads would still steal timer seconds if shown first).
- Do not pass `onHourlyQuizPlayChange` on Rank/Prizes unless those surfaces actually show the timed modal.
- `selectHourlySponsorAd` rotates paid vs invite by **clock hour**. It is unrelated to the hourly quiz.
- Public **landing** (and guests) must keep `sponsorAdBlocked` true. The Advertise chip is the public CTA; do not reopen the interstitial there.

## Related

- [Hourly Visual Quiz](./hourly-visual-quiz.md) — timed play UI
- [Public landing](./public-landing.md) — guests never hit `get_active_sponsor_ad`
- [Free-plan / egress optimization](./free-plan-optimization.md)
- [Production deployment](./deployment.md) — shipping PWA vs APK
