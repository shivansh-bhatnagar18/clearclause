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
} from "@mui/material";

type CriticalPoint = {
  clause: string;
  impact: string;
  explanation: string;
};

export default function Popup() {
  const [file, setFile] = useState<File | null>(null);
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
        console.log("Active tab URL:", url);
        if (url.endsWith(".pdf")) {
          // chrome.runtime.sendMessage(
          //   { type: "EXTRACT_PDF", url: tab.url },
          //   (response) => {
          //     if (chrome.runtime.lastError) {
          //       return reject(new Error(chrome.runtime.lastError.message));
          //     }
          //     if (!response?.text) {
          //       return reject(new Error("No text returned from PDF extractor"));
          //     }
          //     resolve(response);
          //   }
          // );
          chrome.runtime.sendMessage({
            type: "EXTRACT_PDF",
            url: "https://assets-bg.gem.gov.in/resources/upload/shared_doc/gtc/GeM-GTC-40-1741175351.pdf"
          }, response => {
            if (response.ok) {
              console.log("PDF text:", response.text.slice(0, 500)); // preview first 500 chars
            } else {
              console.error("Extract error:", response.error);
            }
          });
          
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
        body: JSON.stringify({ text: extracted }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Backend error: ${resp.status} ${errText}`);
      }

      const data = await resp.json();

      // Expecting: { summary: string, critical_points: CriticalPoint[] }
      setSummary(data.summary || "");
      setCriticalPoints(Array.isArray(data.critical_points) ? data.critical_points : []);
    } catch (err: any) {
      console.error("Extract/analyze error:", err);
      setErrorMsg(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) setFile(event.target.files[0]);
  };

  const handleSubmit = () => {
    if (file) console.log("File submitted:", file.name);
    else alert("Please upload a file first!");
  };

  return (
    <Paper
      elevation={3}
      sx={{ width: 320, p: 3, textAlign: "center", borderRadius: "16px" }}
    >
      <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
        ClearClause
      </Typography>

      <Button
        variant="contained"
        fullWidth
        sx={{ my: 2, borderRadius: "12px", fontWeight: "bold", textTransform: "none" }}
        onClick={handleExtract}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : "Analyse Document"}
      </Button>

      {errorMsg && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {errorMsg}
        </Typography>
      )}

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

      <Box
        sx={{
          border: "2px dashed grey",
          borderRadius: "12px",
          p: 3,
          my: 2,
          cursor: "pointer",
          color: "gray",
        }}
      >
        <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
          {file ? file.name : "Upload your file here"}
        </label>
        <input id="file-upload" type="file" hidden onChange={handleFileChange} />
      </Box>

      <Button
        variant="outlined"
        fullWidth
        onClick={handleSubmit}
        sx={{ borderRadius: "12px", fontWeight: "bold", textTransform: "none" }}
      >
        Submit
      </Button>
    </Paper>
  );
}
