# ৮ মন্ত্র live card — Google AI Studio audio script

ElevenLabs free voice is weak for field Bangla. Prefer **Google AI Studio** (Gemini speech).

**Important:** Generate **one clip at a time** (one prompt → one download).

Do **not** put clips in `public/audio/mantra/` (that ships on Vercel).  
Compress to **48 kbps mono MP3**, then upload to Supabase:

`avatars/audio/mantra/<name>.mp3`

The live card loads those URLs directly from Supabase (no Vercel hop).

---

## Host (do this after every new clip)

```powershell
# 1) Compress (ffmpeg)
ffmpeg -y -i safe_01.wav -ac 1 -ar 22050 -b:a 48k safe_01.mp3

# 2) Upload (linked project)
supabase storage cp --linked --experimental --cache-control "max-age=31536000" --content-type "audio/mpeg" -r .\mp3-folder ss:///avatars/audio/mantra
```

18 SAFE/সবাই clips ≈ **377 KB** total (was ~5.8 MB wav).

---

## Pronunciation fix (why “এস” sounded like “eso”)

In Bangla TTS, **এস** is often read as a Bangla word, not the English letter **S**.

**Rule for SAFE HOME letter names:**

| Don’t write | Write instead (clearer) |
|-------------|-------------------------|
| এস | **ইংরেজি এস্** or lead with Latin **S** |
| এ (alone for A) | **ইংরেজি এ** / **A** |
| এফ | **ইংরেজি এফ্** / **F** |
| ই (for E) | **ইংরেজি ই** / **E** |
| এইচ | **ইংরেজি এইচ্** / **H** |
| ও (for O) | **ইংরেজি ও** / **O** |
| এম | **ইংরেজি এম্** / **M** |

Recommended pattern for SAFE HOME steps:

`S। Stop। থামো। …`  
(Latin letter first — AI Studio usually says “ess”, not “eso”.)

সবাই ফিরো uses Bangla letters (স, ব, আ…) — those are fine as-is.

---

## Voice style (paste every time)

```
তুমি একজন অভিজ্ঞ লাইনম্যান ওস্তাদ। ধীরে, পরিষ্কার, সহজ মাঠের বাংলা বলো।
মিউজিক নেই। শুধু কণ্ঠ। তাড়াহুড়ো নয়।
শুধু নিচের একটা লাইন বলো — অন্য কিছু যোগ করো না।
ল্যাটিন অক্ষর (S, A, F…) ইংরেজি অক্ষরের নাম হিসেবে বলো — বাংলা শব্দের মতো নয়।
```

---

## SAFE HOME — one line per generate

| Save as | Paste only this |
|---------|-----------------|
| `safe_word.mp3` | সেফ হোম। নিরাপদে বাড়ি ফেরার আট কথা। |
| `safe_01.wav` | S। Stop। থামো। আগে থামো। আবহাওয়া ও খুঁটি দেখো। একা কাজ করো না। |
| `safe_02.wav` | A। Armour। কবচ। হেলমেট, জুতো, গ্লাভস, বেল্ট পরো। হেল্পারও পরবে। |
| `safe_03.wav` | F। Form। পারমিট। লিখিত পারমিট হাতে নাও। ফিডারের নাম মিলাও। |
| `safe_04.wav` | E। End power। কাটো। দুদিক অফ করো। তালা মারো। ডেঞ্জার বোর্ড ঝোলাও। |
| `safe_05.wav` | H। Hold earth। আর্থ। আগে টেস্টার, তারপর দুদিকে আর্থ বাঁধো। |
| `safe_06.wav` | O। Ok fence। ফিতে। লাল ফিতে ও কোন দিয়ে জায়গা ঘেরো। |
| `safe_07.wav` | M। Mend। কাজ। বেল্ট লক করে তবে কাজ শুরু। |
| `safe_08.wav` | E। Exit। গোনা। কাজ শেষে হাতিয়ার ও লোক গোনো। আর্থ শেষে খোলো। পারমিট ফেরত দাও। |

If **S** still misreads, use this alternate for `safe_01` only:

```
ইংরেজি এস্। Stop। থামো। আগে থামো। আবহাওয়া ও খুঁটি দেখো। একা কাজ করো না।
```

(Hasanta **স্** helps; avoid plain **এস**.)

---

## সবাই ফিরো — one line per generate

| Save as | Paste only this |
|---------|-----------------|
| `sobai_word.wav` | সবাই ফিরো। সবাই ফিরো। কাজের আগে আট অক্ষর। |
| `sobai_01.wav` | স। সতর্ক। আগে থামো। খুঁটি ও আবহাওয়া দেখো। একা কাজ নয়। |
| `sobai_02.wav` | ব। বডি কবচ। হেলমেট, গ্লাভস, জুতো, বেল্ট। মাটিতে থাকা ভাইও পরবে। |
| `sobai_03.wav` | আ। আদেশ। লিখিত পারমিট হাতে নাও। |
| `sobai_04.wav` | ই। ইন আউট। দুদিকের পাওয়ার কেটে তালা লাগাও। |
| `sobai_05.wav` | ফ। ফুল আর্থ। টেস্ট করে দুদিকে আর্থিং করো। |
| `sobai_06.wav` | ই। ইশারা। লাল ফিতে ও কোন দিয়ে এলাকা ঘেরো। |
| `sobai_07.wav` | র। রিপেয়ার। বেল্ট লক করে মন দিয়ে কাজ করো। |
| `sobai_08.wav` | ও। ওজন। হাতিয়ার ও লোক গোনো। আর্থ খুলে পারমিট ফেরত দাও। |

---

## Steps

1. AI Studio → speech / audio  
2. Voice style + **one** line  
3. Download → rename exactly  
4. Compress to `.mp3` (48 kbps mono) and upload to `ss:///avatars/audio/mantra`  
5. Do not commit audio into `public/` — Vercel must not serve these files  

Mute button on the live card stays as-is.

---

## ৮-ধাপের সুরের ছড়া (option 1)

**Not in the app yet.** Keep this script if we add audio later. The ছড়া page is text-only for now.

Save as: `chora.mp3` → upload to `avatars/audio/mantra/chora.mp3` (not Vercel).

Keep it **calm** — toolbox talk, not a rally. Soft pad behind the voice is enough. No drums.

### Voice style

```
তুমি একজন শান্ত, অভিজ্ঞ লাইনম্যান ওস্তাদ। টুলবক্স টকের মতো কথা বলো।
উত্তেজিত নয়। চিৎকার নয়। তাড়াহুড়ো নয়। হাসি-ঠাট্টা নয়।
ধীরে, সমান সুরে, পরিষ্কার মাঠের বাংলা।
হালকা নরম বাদ্য থাকতে পারে — খুব আস্তে, শুধু পেছনে। ঢোল বা জোরে তালি নয়।
কণ্ঠ শান্ত ও স্পষ্ট। কোরাসও একই শান্ত সুরে — শুধু একটু ধীরে।
শুধু নিচের লেখা বলো — অন্য কথা যোগ করো না।
```

If it still sounds excited, add:

```
আরও শান্ত। একদম সাধারণ কণ্ঠ। কোনো উচ্ছ্বাস নয়।
```

### The whole ছড়া (paste once)

```
সবাই ফিরো, সবাই ফিরো।

থামো রে ভাই, কবচ পরো।
সবাই ফিরো, সবাই ফিরো।

পারমিট নাও, দুদিক কাটো।
সবাই ফিরো, সবাই ফিরো।

আর্থ বাঁধো, ফিতে ঘেরো।
সবাই ফিরো, সবাই ফিরো।

কাজ সেরে, গুনে ফিরো।
সবাই ফিরো, সবাই ফিরো।
```

Do not upload or wire this until the play control is added back.
