// Extract HTML text
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
    const text = extractLegalText();
    sendResponse({ ok: true, text });
  }
});
