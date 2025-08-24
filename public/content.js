function extractLegalText() {
    const selectors = [
        "main",
        "article",
        ".terms",
        ".privacy",
        ".content",
        "body"
    ];

    let textContent = "";
    selectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            textContent += " " + element.textContent;
        }
    });
    console.log(textContent);
    return textContent.trim();
}

chrome.runtime.sendMessage({
    action: "EXTRACTED_TEXT",
    data: extractLegalText(),
});