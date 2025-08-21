import React, { useState } from "react";
// import { Button } from "@/components/ui/button"; // optional shadcn

export default function Popup() {
  const [loading, setLoading] = useState(false);

  const processPage = async () => {
    setLoading(true);
    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id!, { action: "PROCESS_PAGE" });
    });
    setLoading(false);
  };

  return (
    <div className="p-4 w-64">
      <h1 className="text-lg font-bold">AI Highlighter</h1>
      {/* <Button onClick={processPage} disabled={loading}>
        {loading ? "Processing..." : "Highlight Page"}
      </Button> */}
    </div>
  );
}
