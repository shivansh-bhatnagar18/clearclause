chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "EXTRACTED_TEXT") {
    console.log("Extracted text from content script:", message.data);
    chrome.runtime.sendMessage({
      action: "SHOW_TEXT",
      data: message.data,
    });
  }
});