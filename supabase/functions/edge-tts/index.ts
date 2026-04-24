import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// A short silent MP3 buffer (~0.5s) to create natural pauses between sentences
const SILENCE_MP3 = new Uint8Array([
  255, 251, 144, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { text, lang = "bn-IN" } = await req.json();
    if (!text) return new Response(JSON.stringify({ error: "Text is required" }), { status: 400 });

    // Split text by punctuation to add natural pauses
    // Matches Bengali Dari (।), Comma (,), Question Mark (?), and English equivalents
    const parts = text.split(/([।?,!])/);
    const chunks = [];
    let currentPart = "";

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i].trim();
      if (!p) continue;
      
      // If it's a punctuation mark, attach it to the previous chunk
      if (/[।?,!]/.test(p)) {
        if (chunks.length > 0) {
          chunks[chunks.length - 1] += p;
        }
      } else {
        chunks.push(p);
      }
    }

    const audioBuffers = [];
    for (const chunk of chunks) {
      if (chunk.length > 180) {
          // Internal split if chunk is too long for Google
          const subChunks = chunk.match(/.{1,180}/g) || [];
          for (const sc of subChunks) {
              const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(sc)}&tl=${lang}&client=tw-ob`;
              const res = await fetch(url, { headers: { "Referer": "http://translate.google.com/", "User-Agent": "Mozilla/5.0" } });
              if (res.ok) audioBuffers.push(new Uint8Array(await res.arrayBuffer()));
          }
      } else {
          const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
          const res = await fetch(url, { headers: { "Referer": "http://translate.google.com/", "User-Agent": "Mozilla/5.0" } });
          if (res.ok) {
            audioBuffers.push(new Uint8Array(await res.arrayBuffer()));
            // Add silence after sentence-ending punctuation
            if (/[।?!]/.test(chunk)) audioBuffers.push(SILENCE_MP3);
          }
      }
    }

    const totalLength = audioBuffers.reduce((acc, buf) => acc + buf.length, 0);
    const combinedBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of audioBuffers) {
      combinedBuffer.set(buf, offset);
      offset += buf.length;
    }

    return new Response(combinedBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  }
})
