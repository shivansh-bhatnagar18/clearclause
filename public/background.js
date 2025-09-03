import * as pdfjsLib from "./libs/pdf.mjs";

// set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("libs/pdf.worker.mjs");

async function extractTextFromPDF(url) {
  try {
    console.log("Fetching PDF from", url);

    // fetch and convert to ArrayBuffer
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch PDF: " + response.statusText);
    const data = await response.arrayBuffer();

    // load document
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;

    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(" ") + "\n";
    }

    console.log("Extracted text length:", text.length);
    return text.trim();
  } catch (err) {
    console.error("PDF extract error:", err);
    throw err;
  }
}

// listen for requests from content script or popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "EXTRACT_PDF") {
    extractTextFromPDF(msg.url)
      .then(text => sendResponse({ ok: true, text }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // keep channel open
  }
});
