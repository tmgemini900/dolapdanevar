import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

app.post("/api/recipes", async (req, res) => {
  const { ingredients } = req.body;
  if (!ingredients || ingredients.length === 0) {
    return res.status(400).json({ error: "Malzeme listesi boş." });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // "json" kelimesi response_format: json_object için zorunlu
  const systemPrompt = `Sen bir dünya mutfağı uzmanı şefisin. Yalnızca geçerli JSON formatında cevap verirsin. "recipes" alanı her zaman JSON array (köşeli parantez) olmalı, markdown veya açıklama ekleme.`;

  const userPrompt = `Elimde şu malzemeler var: ${ingredients.join(", ")}.

Bu malzemeleri kullanarak 6 farklı tarif üret. JSON formatında döndür:
{"recipes":[{"id":"benzersiz-id","name":"Tarif Adı","cuisine":"Mutfak","category":"Çorba|Salata|Sandviç|Ana Yemek","time":"25 dk","difficulty":"Kolay|Orta|Zor","servings":"2-3 kişilik","description":"2 cümle açıklama","emoji":"🍜","ingredients":["200g tavuk"],"steps":["Adım 1"],"tip":"Şef ipucu"}]}

Kurallar:
- recipes alanı bir JSON array olsun (6 eleman)
- Her tarif farklı dünya mutfağından olsun (Türk, İtalyan, Meksika, Japon, Fransız, Hint, Yunan, Amerikan vb.)
- Farklı kategoriler kullan: Çorba, Salata, Sandviç, Ana Yemek
- id değerleri benzersiz olsun`;

  try {
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
      console.error("Groq API hatası:", groqRes.status, err);
      res.write(`data: ${JSON.stringify({ error: `Groq hatası (${groqRes.status}): ${err}` })}\n\n`);
      return res.end();
    }

    const reader = groqRes.body.getReader();
    const decoder = new TextDecoder();
    let lineBuffer = ""; // yarım satırları biriktir

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() ?? ""; // son satır yarım olabilir, sakla

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          continue;
        }
        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.delta?.content;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        } catch {
          // parse edilemedi, atla
        }
      }
    }

    res.end();
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", provider: "groq", model: GROQ_MODEL });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`🍽️  Sunucu http://localhost:${PORT} | Groq / ${GROQ_MODEL}`)
);
