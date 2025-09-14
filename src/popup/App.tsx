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
  Tooltip,
  TextField
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import jsPDF from "jspdf";

const theme = createTheme({
  typography: {
    fontFamily: "Noto Sans, sans-serif",
  },
});

type Glossary = {
  term: string | null;
  definition: string | null;
}

type CriticalPoint = {
  clause: string;
  impact: string;
  explanation: string;
  category: string;
  riskLevel: "low"|"medium"|"high";
  glossary: Glossary;
};

type chatMessage = {
  role: "user" | "assistant";
  content: string;
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
  const [selected, setSelected] = useState("en");
  const [text, setText] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [criticalPoints, setCriticalPoints] = useState<CriticalPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [chatHistory, setChatHistory] = useState<chatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);

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
      console.log("Passing Language to backend:", selected);
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

  const handleExportJSON = () => {
    const data = {
      summary,
      critical_points: criticalPoints,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clearclause-analysis.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("ClearClause Analysis", 10, 10);

    doc.setFont("helvetica", "normal");
    doc.text(`Summary: ${summary}`, 10, 20);

    let y = 30;
    criticalPoints.forEach((point, i) => {
      doc.text(`Clause ${i + 1}: ${point.clause}`, 10, y);
      y += 8;
      doc.text(`Impact: ${point.impact}`, 10, y);
      y += 8;
      doc.text(`Explanation: ${point.explanation}`, 10, y);
      y += 8;
      doc.text(`Category: ${point.category || "N/A"}`, 10, y);
      y += 8;
      doc.text(`Risk: ${point.riskLevel?.toUpperCase() || "N/A"}`, 10, y);
      y += 12;

      if (point.glossary?.term) {
        doc.text(
          `Glossary: ${point.glossary.term} → ${point.glossary.definition}`,
          10,
          y
        );
        y += 12;
      }

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save("clearclause-analysis.pdf");
  };

  const handleAskQuestions = async () => {
    if (!userInput.trim()) return;
    const newHistory: chatMessage[] = [...chatHistory, { role: "user", content: userInput.trim() }];
    setChatHistory(newHistory);
    setUserInput("");
    setChatLoading(true);

    try {
      const resp = await fetch("https://clearclause.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text,
          question: userInput.trim(),
          language: selected,
        }),
      });

      const data = await resp.json();
      const answer = data.answer || "No answer from backend";
      setChatHistory([...newHistory, { role: "assistant", content: answer }]);
    } catch (err) {
      console.error("Chat error:", err);
      setChatHistory([...newHistory, { role: "assistant", content: "Error getting answer" }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
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

          <Typography variant="subtitle1" sx={{ fontWeight: "bold", mt: 2 }}>
              Ask Questions:
            </Typography>
            <Paper
              sx={{
                maxHeight: 200,
                overflowY: "auto",
                p: 1,
                borderRadius: "8px",
                mb: 1,
                mt: 2,
                backgroundColor: "#fafafa",
              }}
            >
              {chatHistory.map((msg, idx) => (
                <Box
                  key={idx}
                  sx={{
                    textAlign: msg.role === "user" ? "right" : "left",
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      display: "inline-block",
                      p: 1,
                      borderRadius: "12px",
                      backgroundColor:
                        msg.role === "user" ? "#1976d2" : "#e0e0e0",
                      color: msg.role === "user" ? "white" : "black",
                      maxWidth: "80%",
                      wordWrap: "break-word",
                    }}
                  >
                    {msg.content}
                  </Typography>
                </Box>
              ))}
              {chatLoading && (
                <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                  Thinking...
                </Typography>
              )}
            </Paper>

            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask a question..."
              />
              <Button
                variant="contained"
                onClick={handleAskQuestions}
                disabled={chatLoading}
              >
                Send
              </Button>
            </Box>

          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            Critical Points:
          </Typography>
          <List dense>
            {criticalPoints.map((point, index) => (
              <ListItem key={index} alignItems="flex-start">
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                        {point.category || "Uncategorized"}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: "8px",
                          color: "white",
                          fontWeight: "bold",
                          backgroundColor:
                            point.riskLevel === "high"
                              ? "red"
                              : point.riskLevel === "medium"
                              ? "orange"
                              : "green",
                        }}
                      >
                        {point.riskLevel?.toUpperCase() || "N/A"}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Clause:</strong> {point.clause || "—"}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Impact:</strong> {point.impact || "—"}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Explanation:</strong>{" "}
                        {point.explanation || "—"}{" "}
                        {point.glossary?.term && (
                          <Tooltip title={point.glossary.definition || ""} arrow>
                            <span
                              style={{
                                textDecoration: "underline dotted",
                                cursor: "help",
                                color: "#1976d2",
                                fontWeight: 500,
                                marginLeft: "4px",
                              }}
                            >
                              {point.glossary.term}
                            </span>
                          </Tooltip>
                        )}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleExportJSON}
              sx={{ borderRadius: "8px" }}
            >
              Export JSON
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleExportPDF}
              sx={{ borderRadius: "8px" }}
            >
              Export PDF
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
    </ThemeProvider>
  );
}
