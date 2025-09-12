import React, { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";

type CriticalPoint = {
  clause: string;
  impact: string;
  explanation: string;
};

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
];

export default function Popup() {
  const [file, setFile] = useState<File | null>(null);
  const [selected, setSelected] = useState("en");
  const [text, setText] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [criticalPoints, setCriticalPoints] = useState<CriticalPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const askPageForText = (): Promise<{ text: string }> =>
    new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        const tab = tabs[0];
        const url = tab?.url;
        if (!tabId) return reject(new Error("No active tab"));
        if (!url) return reject(new Error("Tab has no URL"));
        if (url.endsWith(".pdf")) {
          chrome.runtime.sendMessage(
            { type: "EXTRACT_PDF", url: tab.url },
            (response) => {
              if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError.message));
              }
              if (!response?.text) {
                return reject(new Error("No text returned from PDF extractor"));
              }
              resolve(response);
            }
          );
        } else {
          chrome.tabs.sendMessage(tabId, { type: "GET_PAGE_TEXT" }, (response) => {
            if (chrome.runtime.lastError) {
              return reject(new Error(chrome.runtime.lastError.message));
            }
            if (!response?.text) {
              return reject(new Error("No text returned from content script"));
            }
            resolve(response);
          });
        }
      });
    });

  const handleExtract = async () => {
    setLoading(true);
    setErrorMsg("");
    setSummary("");
    setCriticalPoints([]);

    try {
      // 1) Get fresh text from the active tab (content.js)
      const { text: extracted } = await askPageForText();
      setText(extracted);

      // 2) Send THAT text to your backend (don’t use stale state)
      const resp = await fetch("https://clearclause.onrender.com/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extracted, language: selected}),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Backend error: ${resp.status} ${errText}`);
      }

      const data = await resp.json();

      // Expecting: { summary: string, critical_points: CriticalPoint[] }
      setSummary(data.summary || "Text Extracted Successfully");
      // setSummary("Text Extracted Successfully" + (extracted.length > 500 ? ` (showing first 500 chars: ${extracted.slice(0, 500)}...)` : `: ${extracted}`));
      setCriticalPoints(Array.isArray(data.critical_points) ? data.critical_points : []);
    } catch (err: any) {
      console.error("Extract/analyze error:", err);
      setErrorMsg(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{ width: 320, px: 5, py: 3, textAlign: "center", borderRadius: "16px" }}
    >
      <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
        ClearClause
      </Typography>
      <Typography variant="body2" color="textSecondary">
            Analyze Legal Agreements and T&Cs
      </Typography>

      <FormControl fullWidth sx={{ mt: 2 }}>
      <Select
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          console.log("Language changed to:", e.target.value);
        }}
        sx={{
          borderRadius: "12px",
          fontWeight: "bold",
          backgroundColor: "#f9f9f9",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          "& .MuiSelect-select": {
            display: "flex",
            alignItems: "center",
            gap: 1,
          },
        }}
      >
        {languages.map((lang) => (
          <MenuItem key={lang.code} value={lang.code}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span style={{ fontSize: "1.2rem" }}>{lang.flag}</span>
              <Typography variant="body1">{lang.name}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>

      {/* 🔹 Analyze Current Tab */}
      <Button
        variant="contained"
        fullWidth
        sx={{ my: 2, borderRadius: "12px", fontWeight: "bold", textTransform: "none" }}
        onClick={handleExtract}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : "Analyse Current Tab"}
      </Button>

      {/* 🔹 Errors */}
      {errorMsg && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {errorMsg}
        </Typography>
      )}

      {/* 🔹 Results */}
      {summary && (
        <Box sx={{ textAlign: "left", mt: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            Summary:
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {summary}
          </Typography>

          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            Critical Points:
          </Typography>
          <List dense>
            {criticalPoints.map((point, index) => (
              <ListItem key={index} alignItems="flex-start">
                <ListItemText
                  primary={point.clause || "Clause"}
                  secondary={
                    <>
                      <strong>Impact:</strong> {point.impact || "—"}
                      <br />
                      <strong>Explanation:</strong> {point.explanation || "—"}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Paper>
  );
}
