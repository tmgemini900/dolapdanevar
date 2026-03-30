import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { ingredients } = await req.json();

    if (!ingredients || ingredients.length === 0) {
      return new Response(
        JSON.stringify({ error: "Malzeme listesi boş." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const systemPrompt = `Sen bir dünya mutfağı uzmanı şefisin. Yalnızca geçerli JSON formatında cevap verirsin. "recipes" alanı her zaman JSON array (köşeli parantez) olmalı, markdown veya açıklama ekleme.`;

    const userPrompt = `Elimde şu malzemeler var: ${ingredients.join(", ")}.

Bu malzemeleri kullanarak 6 farklı tarif üret. JSON formatında döndür:
{"recipes":[{"id":"benzersiz-id","name":"Tarif Adı","cuisine":"Mutfak","category":"Çorba|Salata|Sandviç|Ana Yemek","time":"25 dk","difficulty":"Kolay|Orta|Zor","servings":"2-3 kişilik","description":"2 cümle açıklama","emoji":"🍜","ingredients":["200g tavuk"],"steps":["Adım 1"],"tip":"Şef ipucu"}]}

Kurallar:
- recipes alanı bir JSON array olsun (6 eleman)
- Her tarif farklı dünya mutfağından olsun (Türk, İtalyan, Meksika, Japon, Fransız, Hint, Yunan, Amerikan vb.)
- Farklı kategoriler kullan: Çorba, Salata, Sandviç, Ana Yemek
- id değerleri benzersiz olsun`;

    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return new Response(
        JSON.stringify({ error: `Groq hatası (${groqRes.status}): ${err}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // SSE stream'i client'a aktar
    const stream = new ReadableStream({
      async start(controller) {
        const reader = groqRes.body!.getReader();
        const decoder = new TextDecoder();
        let lineBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split("\n");
          lineBuffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ done: true })}\n\n`
                )
              );
              continue;
            }
            try {
              const json = JSON.parse(data);
              const text = json.choices?.[0]?.delta?.content;
              if (text) {
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({ text })}\n\n`
                  )
                );
              }
            } catch {
              // parse edilemedi, atla
            }
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
