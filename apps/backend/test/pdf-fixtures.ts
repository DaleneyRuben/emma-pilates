/** A real PDF, one page per entry, with Helvetica text and offsets computed. */
export const pdfWithPages = (
  pages: { text: string; mediaBox?: string }[],
): Buffer => {
  const fontObject = 3 + pages.length * 2;
  const kids = pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`,
  ];
  pages.forEach(({ text, mediaBox = '0 0 595 842' }, index) => {
    const stream = `BT /F1 32 Tf 72 760 Td (${text}) Tj ET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [${mediaBox}] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${4 + index * 2} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  let body = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => {
    const offset = body.length;
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets
    .map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)
    .join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
};
