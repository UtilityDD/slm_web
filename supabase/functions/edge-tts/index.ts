// @ts-ignore: Deno types are handled by Supabase at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req: Request) => {
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

    // Clean text and split by punctuation
    // Using "..." instead of "," to force silence without the word "coma"
    const chunks = text
        .replace(/[,，]/g, " ... ") // Replace commas with dots for silence
        .replace(/[।?!]/g, (m: string) => `${m} ... `) // Add extra pause after sentence end
        .split(/(?<=\.\.\.)\s+/);
    
    const audioBuffers: Uint8Array[] = [];
    for (const chunk of chunks) {
        const trimmed = chunk.trim();
        if (!trimmed || trimmed === "...") continue;
        
        // Chunk handling for Google limit (200 chars)
        const subChunks = trimmed.length > 180 ? trimmed.match(/.{1,180}/g) || [] : [trimmed];
        
        for (const sc of subChunks) {
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(sc)}&tl=${lang}&client=tw-ob`;
            
            const res = await fetch(url, { 
                headers: { 
                    "Referer": "http://translate.google.com/", 
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
                } 
            });
            
            if (res.ok) {
                audioBuffers.push(new Uint8Array(await res.arrayBuffer()));
            }
        }
    }

    if (audioBuffers.length === 0) {
        return new Response(JSON.stringify({ error: "Failed to generate audio" }), { status: 500 });
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
        "Cache-Control": "public, max-age=3600"
      },
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers: { "Access-Control-Allow-Origin": "*" } 
    });
  }
})
