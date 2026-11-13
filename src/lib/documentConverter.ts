function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatInlineMarkdown(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
  out = out.replace(/`(.+?)`/g, '<code style="font-family:monospace;background:#f4f4f5;padding:1px 4px;border-radius:3px;">$1</code>');
  return out;
}

/**
 * Mengonversi konten Markdown (.md) menjadi HTML terstruktur yang siap
 * dirender untuk pratinjau dokumen resmi maupun diekspor ke format Word (.doc).
 */
export function markdownToDocumentHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const htmlParts: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line)) {
      htmlParts.push('<hr style="border:none;border-top:1.5px solid #27272a;margin:14px 0;" />');
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      htmlParts.push(
        `<h3 style="font-size:12pt;font-weight:bold;margin:14px 0 6px 0;">${formatInlineMarkdown(line.slice(4))}</h3>`
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      htmlParts.push(
        `<h2 style="font-size:13pt;font-weight:bold;margin:16px 0 8px 0;text-transform:uppercase;">${formatInlineMarkdown(line.slice(3))}</h2>`
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      htmlParts.push(
        `<h1 style="font-size:14pt;font-weight:bold;text-align:center;margin:0 0 12px 0;text-transform:uppercase;">${formatInlineMarkdown(line.slice(2))}</h1>`
      );
      i++;
      continue;
    }

    // Markdown table
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        if (cur.startsWith('|') && cur.endsWith('|')) {
          tableLines.push(cur);
          i++;
        } else {
          break;
        }
      }

      const rows = tableLines
        .filter((row) => !/^\|[\s:-]+\|$/.test(row.replace(/\|/g, '|').replace(/[^|\s:-]/g, 'x')) && !/^\|(?:\s*:?-+:?\s*\|)+$/.test(row))
        .map((row) =>
          row
            .slice(1, -1)
            .split('|')
            .map((cell) => cell.trim())
        );

      if (rows.length > 0) {
        const hasSeparator =
          tableLines.length > 1 && /^\|(?:\s*:?-+:?\s*\|)+$/.test(tableLines[1]);
        const bodyRows = hasSeparator ? rows.slice(1) : rows;
        const headerRow = hasSeparator ? rows[0] : null;

        let tableHtml =
          '<table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:11pt;">';
        if (headerRow) {
          tableHtml += '<thead><tr>';
          for (const cell of headerRow) {
            tableHtml += `<th style="border:1px solid #a1a1aa;background:#f4f4f5;padding:6px 8px;text-align:left;font-weight:bold;">${formatInlineMarkdown(cell)}</th>`;
          }
          tableHtml += '</tr></thead>';
        }
        tableHtml += '<tbody>';
        for (const r of bodyRows) {
          tableHtml += '<tr>';
          for (const cell of r) {
            tableHtml += `<td style="border:1px solid #a1a1aa;padding:6px 8px;vertical-align:top;">${formatInlineMarkdown(cell)}</td>`;
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table>';
        htmlParts.push(tableHtml);
      }
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(formatInlineMarkdown(lines[i].trim().slice(2)));
        i++;
      }
      htmlParts.push(
        `<blockquote style="border-left:3px solid #047857;background:#f4f4f5;padding:8px 12px;margin:10px 0;font-size:10.5pt;">${quoteLines.join('<br />')}</blockquote>`
      );
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(
          `<li style="margin-bottom:4px;">${formatInlineMarkdown(
            lines[i].trim().replace(/^[-*]\s+/, '')
          )}</li>`
        );
        i++;
      }
      htmlParts.push(`<ul style="margin:6px 0 10px 22px;padding:0;">${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(
          `<li style="margin-bottom:4px;">${formatInlineMarkdown(
            lines[i].trim().replace(/^\d+\.\s+/, '')
          )}</li>`
        );
        i++;
      }
      htmlParts.push(`<ol style="margin:6px 0 10px 22px;padding:0;">${items.join('')}</ol>`);
      continue;
    }

    // Paragraph (preserve explicit line breaks within same paragraph block, e.g. signature block)
    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (
        !cur ||
        /^---+$/.test(cur) ||
        cur.startsWith('#') ||
        cur.startsWith('> ') ||
        /^[-*]\s+/.test(cur) ||
        /^\d+\.\s+/.test(cur) ||
        (cur.startsWith('|') && cur.endsWith('|'))
      ) {
        break;
      }
      paraLines.push(formatInlineMarkdown(cur));
      i++;
    }
    htmlParts.push(
      `<p style="margin:0 0 8px 0;line-height:1.5;text-align:justify;">${paraLines.join('<br />')}</p>`
    );
  }

  return htmlParts.join('\n');
}

/**
 * Membungkus HTML hasil konversi Markdown menjadi dokumen .doc (Word-compatible)
 * berukuran A4 lengkap dengan namespace Microsoft Office Word.
 */
export function buildWordDocPayload(title: string, markdown: string): string {
  const bodyHtml = markdownToDocumentHtml(markdown);
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: A4 portrait;
      margin: 2.2cm 2.5cm 2.2cm 2.5cm;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11.5pt;
      color: #18181b;
      line-height: 1.5;
    }
    h1, h2, h3 {
      color: #09090b;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

