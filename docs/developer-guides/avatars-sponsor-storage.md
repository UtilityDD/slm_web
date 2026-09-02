# Avatars, sponsor images, and Free-plan Storage

**Purpose:** Keep profile photos and sponsor ad images inside the **Supabase Free** Storage quota. Image Transformations are **not** on Free; using them burns quota and can restrict the project.

---

## File map

| Path | Role |
|------|------|
| `src/utils/avatarImage.js` | Compress on upload; `avatarDisplayUrl` serves the **stored public object** |
| `src/components/AvatarPhoto.jsx` | Renders `avatarDisplayUrl` (list / card / podium / full) |
| `src/utils/avatarCache.js` | Device JPEG cache from the stored URL |
| `src/hooks/useCachedAvatar.js` | Instant local face, then sync remote |
| `src/components/Admin.jsx` `handleSponsorImageUpload` | Compress sponsor product / logo before upload |
| `scripts/maintenance/optimize_avatars_to_webp.mjs` | One-off WebP rewrite via **Image Transformations** — **do not run on Free** |

Storage bucket: public **`avatars`** (profile photos **and** sponsor ad files). Lesson images stay on Drive / the website, not this bucket.

---

## Public contract

### Display

- `avatarDisplayUrl(url)` returns `/storage/v1/object/public/avatars/{path}`.
- Old `/storage/v1/render/image/...` URLs are rewritten to the same object (query string dropped).
- Non-storage URLs (data, blob, Drive) pass through.
- The `edge` argument is kept for call sites (`AVATAR_EDGE.list` / `card` / `podium` / `full`) but **does not** change the URL. Stored files are already ~512px.

**Never** build `/render/image` URLs in app code.

### Upload — avatars

`uploadCompressedAvatar` / `compressAvatarFile`:

| Limit | Value |
|-------|--------|
| Longest side | `AVATAR_MAX_EDGE` (512) |
| Format | WebP q0.8, JPEG fallback q0.82 |
| Pick max | 12 MB (`AVATAR_PICK_MAX_BYTES`) |
| Cache-Control | `31536000` |

White fill (no alpha). Used from profile nudge and Admin user photo.

### Upload — sponsor ads (Admin)

`compressImageFile` then upload to `avatars`:

| Field | Longest side | Fill |
|-------|----------------|------|
| Product image (`image_url`) | `SPONSOR_IMAGE_MAX_EDGE` (1280) | White |
| Logo (`logo_url`) | `SPONSOR_LOGO_MAX_EDGE` (512) | Keep alpha |

Cache-Control is **1 year** (not 1 hour) so phones do not re-download every session.

---

## Dashboard (required once)

App code no longer requests transforms. Turn the feature **off** so scripts, old tabs, and bots cannot:

1. Supabase → **Storage → Settings**
2. Disable **Enable Image Transformations**

Usage **Storage Image Transformations** resets at the next billing cycle. This month’s count will not go down.

---

## Gotchas

- **Free plan:** Image Transformations unavailable (Pro includes 100 origin images / month). Egress is **5 GB** uncached + **5 GB** cached. Serving stored WebPs is cheaper than on-the-fly resize **and** stays legal on Free.
- **Old camera originals** that were never run through `compressAvatarFile` will now download at full size. New uploads are small. Do **not** “fix” them with `optimize_avatars_to_webp.mjs` while on Free — that script uses `/render/image`.
- **Layered `placeholderEdge`** in `AvatarPhoto` no longer loads a smaller first frame (same URL). A distinct `placeholderSrc` (e.g. zoom preview) still works.
- **Do not** put lesson posters, PDFs, or APKs in the `avatars` bucket.

---

## Related

- [Public landing](./public-landing.md) — unauthenticated pages also render avatars via `AvatarPhoto`.
- [Production deployment](./deployment.md) — this change is PWA-only; do not touch `android-latest.json` / the APK unless you are shipping a native build.
