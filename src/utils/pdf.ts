import * as pdfjsLib from "pdfjs-dist";

export async function extractPdfText(url: string): Promise<string> {
  const loadingTask = pdfjsLib.getDocument(url);
  const pdf = await loadingTask.promise;

  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((i: any) => i.str).join(" ");
  }
  return text;
}
