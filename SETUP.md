# Setup Guide for ClearClause

This guide will help you set up and run the **ClearClause Chrome Extension** to test the prototype.

---

## Prerequisites

- **Node.js** (>=16)  
- **npm** (comes with Node.js)  
- **Google Chrome** (latest version)

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/clearclause.git
cd clearclause/frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Extension

```bash
npm run build
```
This will generate a `dist/` folder inside the frontend directory.

### 4. Load Extension in Chrome

1) Open Google Chrome.
2) Go to Extensions → Manage Extensions.
3) Enable Developer Mode (top-right).
4) Click Load unpacked.
5) Select the `dist/` folder.
6) The extension should now appear in your toolbar.

### How to Use

1) Navigate to any legal webpage or open a PDF with terms & conditions.
2) Click the ClearClause extension icon in Chrome.
3) Choose your preferred language.
4) Click Analyse Current Tab.
5) The extension will show:
    - Summary of the document
    - Critical clauses with risk levels
    - Glossary tooltips for legal terms
    - Options to export as JSON or PDF
