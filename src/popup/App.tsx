import React, { useEffect, useState } from "react";
import { Box, Button, Typography, Paper } from "@mui/material";

export default function Popup() {
    const [file, setFile] = useState<File | null>(null);
    const [text, setText] = useState<string>("");

    useEffect(() => {
      if (!chrome?.runtime?.onMessage) {
        console.log("chrome.runtime not available (probably running in dev server).");
        return;
      }
    
      const listener = (message: any) => {
        if (message.action === "SHOW_TEXT") {
          setText(message.data);
          console.log("Received:", message.data);
        }
      };
    
      chrome.runtime.onMessage.addListener(listener);
    
      return () => {
        chrome.runtime.onMessage.removeListener(listener);
      };
    }, []);
  
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        setFile(event.target.files[0]);
      }
    };
  
    const handleSubmit = () => {
      if (file) {
        console.log("File submitted:", file.name);
      } else {
        alert("Please upload a file first!");
      }
    };

    const handleExtract = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0].id) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["content.js"],
          });
        }
      });
    };

    return (
      <Paper
        elevation={3}
        sx={{
          width: 300,
          p: 3,
          textAlign: "center",
          borderRadius: "16px",
        }}
      >
        <Typography
          variant="h5"
          gutterBottom
          sx={{fontWeight: "bold" }}
        >
          ClearClause
        </Typography>
  
        <Button
          variant="contained"
          fullWidth
          sx={{
            my: 2,
            borderRadius: "12px",
            fontWeight: "bold",
            textTransform: "none",
          }}
          onClick={handleExtract}
        >
          Analyse Document
        </Button>
  
        <Box
          sx={{
            border: "2px dashed grey",
            borderRadius: "12px",
            p: 4,
            my: 2,
            cursor: "pointer",
            color: "gray",
          }}
        >
          <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
            {file ? file.name : "Upload your file here"}
          </label>
          <input
            id="file-upload"
            type="file"
            hidden
            onChange={handleFileChange}
          />
        </Box>
  
        <Button
          variant="outlined"
          fullWidth
          onClick={handleSubmit}
          sx={{
            borderRadius: "12px",
            fontWeight: "bold",
            textTransform: "none",
          }}
        >
          Submit
        </Button>
      </Paper>
    );
  }