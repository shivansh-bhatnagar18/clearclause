function extractLegalText() {
    const selectors = ["main", "article", ".terms", ".privacy", ".content", "body"];
    let textContent = "";
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) textContent += " " + el.textContent;
    }
    return textContent.trim();
  }
  
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "GET_PAGE_TEXT") {
      const extractedText = extractLegalText();
      console.log("Extracted Text (content.js):", extractedText.slice(0, 200));
      sendResponse({ text: extractedText });
      return true; // keeps the message channel open if needed
    }
  });
  