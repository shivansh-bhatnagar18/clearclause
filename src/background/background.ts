chrome.runtime.onMessage.addListener(async (msg, sender) => {
    if (msg.action === "PROCESS_TEXT") {
      const text: string = msg.payload;
  
      // Example using OpenAI API
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Extract key phrases from the text." },
            { role: "user", content: text }
          ]
        })
      });
  
      const data = await res.json();
      const highlights = data.choices[0].message.content.split("\n");
  
      // Send back to content script for highlighting
      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, { action: "HIGHLIGHT", payload: highlights });
      }
    }
  });
  