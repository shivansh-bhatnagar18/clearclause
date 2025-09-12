import express from "express";
import cors from "cors";
import { VertexAI } from "@google-cloud/vertexai";
import multer from "multer";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { TranslationServiceClient } from "@google-cloud/translate";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const PORT = process.env.PORT || 10000;

app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

const vertex_ai = new VertexAI({
    project: "clearclause-470012",
    location: "us-central1",
  });
  
  const model = vertex_ai.preview.getGenerativeModel({
    model: "gemini-2.5-pro",
  });

const translationClient = new TranslationServiceClient();
const projectId = "clearclause-470012";
const location = "global";

async function translateText(text, targetLanguage) {
  if (!text) return text;
  try {
    const [response] = await translationClient.translateText({
      parent: `projects/${projectId}/locations/${location}`,
      contents: [text],
      mimeType: "text/plain",
      targetLanguageCode: targetLanguage,
    });
    return response.translations?.[0]?.translatedText || text;
  } catch (err) {
    console.error("Translation failed:", err);
    return text; // fallback to original
  }
}

app.post("/analyze", async (req, res) => {
    try {
      const { text, language } = req.body;
  
      const prompt = `
  You are a legal agreement analyzer. 
Read the given text and respond ONLY in valid JSON. 
Do not include explanations outside of JSON.

Your response MUST strictly follow this schema:

{
  "summary": "string — short, clear summary of the agreement",
  "critical_points": [
    {
      "clause": "string — name of the clause",
      "impact": "string — type of impact (e.g., Loss of Rights, Financial Risk, Privacy Concern)",
      "explanation": "string — plain explanation of why this clause matters for the user"
    }
  ]
}

Rules:
- Always return an array of objects for \`critical_points\`. Never return plain strings.  
- If no critical points are found, return an empty array [].  
- Do not include anything outside this JSON object. 

  
  Text:
  ${text}
      `;
  
      const result = await model.generateContent(prompt);
      const raw = result.response.candidates[0].content.parts[0].text;
      let clean = raw.replace(/```json|```/g, "").trim();
      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch (e) {
        console.error("❌ Failed to parse model output:", clean);
        return res.status(500).json({ error: "Invalid model output" });
      }

      // Translate values if needed
      if (language && language !== "en") {
        parsed.summary = await translateText(parsed.summary, language);

        parsed.critical_points = await Promise.all(
          parsed.critical_points.map(async (point) => ({
            clause: await translateText(point.clause, language),
            impact: await translateText(point.impact, language),
            explanation: await translateText(point.explanation, language),
          }))
        );
      }
      console.log("✅ Parsed model output:", parsed);  
      res.json(parsed);
    } catch (err) {
      console.error(err);
      res.status(500).send("Error analyzing text");
    }
  });

app.post("/extract", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  try {
    const data = await pdfParse(req.file.buffer);
    res.json({ text: data.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error extracting text from PDF" });
  }
});
  
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}
);
