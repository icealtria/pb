import hljs from "highlight.js";
import { html, raw } from "hono/html";

function highlightCodeWithLines(code: string, language: string) {
  const validLanguage = hljs.getLanguage(language) ? language : "plaintext";
  const highlighted = hljs.highlight(code, { language: validLanguage }).value;
  const lines = highlighted.split(/\n/).map((line, i) =>
    `<a class="line-number" href="#L-${i + 1}">${
      i + 1
    }</a><span class="line" id="L-${i + 1}">${line}</span>`
  ).join("\n");
  return `<pre><code>${lines}</code></pre>`;
}

const Layout = (children: any) =>
  html`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
    }
    pre {
      line-height: 0.8;
    }
    .line-number {
      display: inline-block;
      width: 3em;
      text-align: right;
      color: #6e7681;
      margin-right: 1em;
      user-select: none;
      text-decoration: none;
    }
    .line-number:hover {
      color: #848d97;
    }
    .line:target {
      background-color: rgba(255, 223, 88, 0.3);
    }
  </style>
</head>
<body class="hljs">
  ${children}
</body>
</html>
`;

export function highlight(code: string, language: string) {
  const highlighted = highlightCodeWithLines(code, language);
  return Layout(raw(highlighted));
}
