import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const EDGE_TTS_URL = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D318896D85";

serve(async (req) => {
  // Handle CORS
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
    const { text, lang = "bn-IN", voice = "bn-IN-TanishaaNeural" } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "Text is required" }), { status: 400 });
    }

    // Connect to Microsoft Edge TTS WebSocket
    const socket = new WebSocket(EDGE_TTS_URL);
    let audioBuffer = new Uint8Array(0);
    
    return new Promise((resolve) => {
      socket.onopen = () => {
        // 1. Send Config
        const configMessage = `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
        socket.send(configMessage);

        // 2. Send SSML with optimized natural prosody
        const ssmlMessage = `X-RequestId:${crypto.randomUUID().replace(/-/g, "")}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'><voice name='${voice}'><prosody rate='+0%' pitch='0Hz'>${text}</prosody></voice></speak>`;
        socket.send(ssmlMessage);
      };

      socket.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          const data = new Uint8Array(await event.data.arrayBuffer());
          // Find the start of the audio data (after the header)
          // The header ends with "Path:audio\r\n"
          const headerEnd = "Path:audio\r\n";
          const textDecoder = new TextDecoder();
          const decoded = textDecoder.decode(data.slice(0, 500)); // Header is usually short
          const index = decoded.indexOf(headerEnd);
          
          if (index !== -1) {
            const audioData = data.slice(index + headerEnd.length);
            const newBuffer = new Uint8Array(audioBuffer.length + audioData.length);
            newBuffer.set(audioBuffer);
            newBuffer.set(audioData, audioBuffer.length);
            audioBuffer = newBuffer;
          }
        } else if (typeof event.data === "string" && event.data.includes("Path:turn.end")) {
          socket.close();
          resolve(new Response(audioBuffer, {
            headers: {
              "Content-Type": "audio/mpeg",
              "Access-Control-Allow-Origin": "*",
            },
          }));
        }
      };

      socket.onerror = (err) => {
        console.error("WebSocket Error:", err);
        resolve(new Response(JSON.stringify({ error: "TTS generation failed" }), { 
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" }
        }));
      };
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
})
