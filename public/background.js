async function extractTextFromPDF(url) {
  console.log("Fetching PDF:", url);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch PDF: " + response.statusText);

  const blob = await response.blob();

  const formData = new FormData();
  formData.append("file", blob, "document.pdf");

  const serverResp = await fetch("https://clearclause.onrender.com/extract",  {
    method: "POST",
    body: formData,
  });

  const data = await serverResp.json();
  if (data.error) throw new Error(data.error);

  return data.text;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "EXTRACT_PDF") {
    extractTextFromPDF(msg.url)
      .then(text => sendResponse({ ok: true, text }))
      .catch(err => {
        console.error("PDF extract error:", err);
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }
});

