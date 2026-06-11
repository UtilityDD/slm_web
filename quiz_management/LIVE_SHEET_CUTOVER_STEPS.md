# Live visual quiz sheet cutover (manual, safe)

The app and images are already deployed. **Users are unchanged** until you edit the Google Sheet.

## Files to use

| File | Purpose |
|------|---------|
| `live_visual_quiz_cutover_diff.txt` | Every cell change (before → after) |
| `live_visual_quiz_migrated_preview.csv` | Full sheet with 218 image cells migrated |
| `live_sheet_cutover_guide.txt` | Find/replace by Drive ID (59 ready images) |
| `live_sheet_image_map.csv` | Master map (`on_disk=yes/no`) |

## Recommended method (review + paste)

1. Open your **live** Google Sheet → visual quiz tab (gid `160776708`).
2. Open `live_visual_quiz_cutover_diff.txt` and skim the first few rows.
3. For image columns only, update cells to match the preview:
   - `question_image_url`, `option_1`–`option_4`
   - `preview_q`, `preview_o1`–`preview_o4` (optional editor columns)
4. **Do not change** rows that still reference the 9 **SKIP** Drive IDs (see `live_sheet_cutover_guide.txt`).
5. Save / publish the sheet.

## Faster method (Find & Replace)

For each **READY** ID in `live_sheet_cutover_guide.txt`:

- **Find:** `1GN9r25E-vhH3o0PmYTh_CeHpvAREF_Dr` (ID only)
- **Replace:** `img_1GN9r25E-vhH3o0PmYTh_CeHpvAREF_Dr.jpg`
- **Replace all** (repeat for 59 IDs; skip the 9 SKIP IDs)

## After you update the sheet

```bash
node scripts/maintenance/validate_visual_quiz_sheet.mjs --strict
```

Then test: open site logged out → Competitions → start hourly quiz → confirm images load.

## Rollback

Reverse each replace (local filename → Drive URL), or restore a sheet backup.

## Regenerate preview (if live sheet changed)

```bash
node scripts/maintenance/apply_visual_quiz_local_urls.mjs
```
