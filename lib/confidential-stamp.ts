import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import JSZip from "jszip";
import sharp from "sharp";
import { confidentialLines, type ConfidentialCopy } from "./confidential-statement";

const footerFile = "dgqi-confidential-footer.xml";
const footerRel = "rIdDgqiConfidential";

export async function stampConfidentialCopy(input: ConfidentialCopy & { bytes: Buffer; fileType: string }) {
  const lines = confidentialLines(input);
  try {
    if (input.fileType === "application/pdf") {
      return { bytes: await stampPdf(input.bytes, lines.control, lines.notice), fileType: input.fileType };
    }
    if (input.fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return { bytes: await stampDocx(input.bytes, lines.full), fileType: input.fileType };
    }
    if (input.fileType === "image/png" || input.fileType === "image/jpeg" || input.fileType === "image/webp") {
      return { bytes: await stampImage(input.bytes, input.fileType, lines.control, lines.notice), fileType: input.fileType };
    }
  } catch {
    return { bytes: input.bytes, fileType: input.fileType };
  }
  return { bytes: input.bytes, fileType: input.fileType };
}

async function stampPdf(bytes: Buffer, control: string, notice: string) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const color = rgb(0.22, 0.28, 0.26);
  const heading = pdfSafe(font, control);
  const body = pdfSafe(font, notice);
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const footer = 46;
    if (height > footer + 80 && width > 120) {
      const scale = (height - footer) / height;
      page.scaleContent(scale, scale);
      page.translateContent(((1 - scale) * width) / 2, footer);
    }
    page.drawLine({
      start: { x: 28, y: 36 },
      end: { x: Math.max(36, width - 28), y: 36 },
      thickness: 0.4,
      color,
    });
    drawFitted(page, font, heading, width, 22, color);
    drawFitted(page, font, body, width, 11, color);
  }
  return Buffer.from(await pdf.save());
}

function pdfSafe(font: PDFFont, value: string) {
  let safe = "";
  for (const char of value) {
    try {
      font.encodeText(char);
      safe += char;
    } catch {
      safe += " ";
    }
  }
  return safe.replace(/\s+/g, " ").trim();
}

function drawFitted(page: PDFPage, font: PDFFont, text: string, pageWidth: number, y: number, color: ReturnType<typeof rgb>) {
  const maxWidth = Math.max(40, pageWidth - 48);
  let size = 8;
  while (size > 5 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.25;
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: Math.max(16, (pageWidth - textWidth) / 2),
    y,
    size,
    font,
    color,
  });
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&apos;";
  });
}

async function stampDocx(bytes: Buffer, statement: string) {
  const zip = await JSZip.loadAsync(bytes);
  const documentPath = "word/document.xml";
  const relsPath = "word/_rels/document.xml.rels";
  const typesPath = "[Content_Types].xml";
  const documentXml = await zip.file(documentPath)?.async("string");
  const rels = await zip.file(relsPath)?.async("string");
  const contentTypes = await zip.file(typesPath)?.async("string");
  if (!documentXml || !rels || !contentTypes) return bytes;

  const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:r>
      <w:rPr><w:sz w:val="14"/><w:szCs w:val="14"/><w:color w:val="555555"/></w:rPr>
      <w:t xml:space="preserve">${escapeXml(statement)}</w:t>
    </w:r>
  </w:p>
</w:ftr>`;
  zip.file(`word/${footerFile}`, footerXml);

  if (!rels.includes(footerRel)) {
    zip.file(relsPath, rels.replace("</Relationships>", `<Relationship Id="${footerRel}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="${footerFile}"/></Relationships>`));
  }
  if (!contentTypes.includes(footerFile)) {
    zip.file(typesPath, contentTypes.replace("</Types>", `<Override PartName="/word/${footerFile}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`));
  }
  if (!documentXml.includes(footerRel)) {
    const footerRef = `<w:footerReference w:type="default" r:id="${footerRel}"/>`;
    let next = documentXml;
    if (!next.includes("<w:sectPr")) {
      next = next.replace("</w:body>", `<w:sectPr>${footerRef}</w:sectPr></w:body>`);
    } else {
      next = next.replace(/<w:sectPr\b([^>]*?)\/>/g, `<w:sectPr$1>${footerRef}</w:sectPr>`);
      next = next.replace(/<w:sectPr\b([^>]*)>([\s\S]*?)<\/w:sectPr>/g, (match, attrs: string, inner: string) => {
        if (inner.includes(footerRel)) return match;
        return `<w:sectPr${attrs}>${footerRef}${inner}</w:sectPr>`;
      });
    }
    zip.file(documentPath, next);
  }
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

async function stampImage(bytes: Buffer, fileType: string, control: string, notice: string) {
  const meta = await sharp(bytes).metadata();
  const width = meta.width && meta.width > 0 ? meta.width : 800;
  const footerHeight = width < 480 ? 84 : 64;
  const fontSize = width < 480 ? 12 : 16;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${footerHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <line x1="24" y1="8" x2="${Math.max(32, width - 24)}" y2="8" stroke="#70807c" stroke-width="1"/>
  <text x="50%" y="${footerHeight < 80 ? 28 : 34}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#1c2b29">${escapeXml(control)}</text>
  <text x="50%" y="${footerHeight < 80 ? 48 : 56}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.max(10, fontSize - 2)}" fill="#555555">${escapeXml(notice)}</text>
</svg>`;
  const format = fileType === "image/jpeg" ? "jpeg" : fileType === "image/webp" ? "webp" : "png";
  return sharp(bytes)
    .extend({ bottom: footerHeight, background: "#ffffff" })
    .composite([{ input: Buffer.from(svg), gravity: "south" }])
    .toFormat(format)
    .toBuffer();
}
