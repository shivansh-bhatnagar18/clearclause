import Mark from "mark.js";

function getPageText(): string {
  return document.body.innerText || "";
}

function highlightText(phrases: string[]) {
  const markInstance = new Mark(document.body);
  markInstance.unmark();
  markInstance.mark(phrases, { separateWordSearch: false });
}

// Listen from popup
chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.action === "PROCESS_PAGE") {
    const text = getPageText();
    chrome.runtime.sendMessage({ action: "PROCESS_TEXT", payload: text });
  } else if (msg.action === "HIGHLIGHT") {
    highlightText(msg.payload);
  }
});
