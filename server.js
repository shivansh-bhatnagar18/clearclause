import express from "express";
import cors from "cors";
import { VertexAI } from "@google-cloud/vertexai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const vertex_ai = new VertexAI({
    project: "clearclause-470012",
    location: "us-central1",
  });
  
  const model = vertex_ai.preview.getGenerativeModel({
    model: "gemini-2.5-pro",
  });

  app.post("/analyze", async (req, res) => {
    try {
      const { text } = req.body;
  
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
        console.error("Failed to parse model output:", clean);
        return res.status(500).json({ error: "Invalid model output" });
      }
  
      res.json(parsed);
    } catch (err) {
      console.error(err);
      res.status(500).send("Error analyzing text");
    }
  });
  
  app.listen(5000, () => console.log("Server running on port 5000"));