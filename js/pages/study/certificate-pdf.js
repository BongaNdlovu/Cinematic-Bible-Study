(function () {
  const PAGE_W = 842;
  const PAGE_H = 595;
  const CANVAS_W = 1684;
  const CANVAS_H = 1190;

  function asciiBytes(text) {
    const out = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i) & 0xff;
    return out;
  }
  function concatBytes(parts) {
    let total = 0;
    for (let i = 0; i < parts.length; i += 1) total += parts[i].length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (let i = 0; i < parts.length; i += 1) {
      out.set(parts[i], offset);
      offset += parts[i].length;
    }
    return out;
  }
  function jpegBytesFromCanvas(canvas) {
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const comma = dataUrl.indexOf(",");
    const binary = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  function buildPdf(jpeg) {
    const objects = [];
    objects[1] = asciiBytes("<< /Type /Catalog /Pages 2 0 R >>\n");
    objects[2] = asciiBytes("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n");
    objects[3] = asciiBytes(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " +
        PAGE_W +
        " " +
        PAGE_H +
        "] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\n"
    );
    const imgDict =
      "<< /Type /XObject /Subtype /Image /Width " +
      CANVAS_W +
      " /Height " +
      CANVAS_H +
      " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " +
      jpeg.length +
      " >>\nstream\n";
    objects[4] = concatBytes([asciiBytes(imgDict), jpeg, asciiBytes("\nendstream\n")]);
    const content = "q\n" + PAGE_W + " 0 0 " + PAGE_H + " 0 0 cm\n/Im0 Do\nQ\n";
    objects[5] = asciiBytes("<< /Length " + content.length + " >>\nstream\n" + content + "endstream\n");

    const chunks = [asciiBytes("%PDF-1.4\n")];
    const offsets = [0];
    let pos = chunks[0].length;
    for (let num = 1; num <= 5; num += 1) {
      offsets[num] = pos;
      const head = asciiBytes(num + " 0 obj\n");
      const tail = asciiBytes("endobj\n");
      chunks.push(head, objects[num], tail);
      pos += head.length + objects[num].length + tail.length;
    }
    const xrefPos = pos;
    let xref = "xref\n0 6\n0000000000 65535 f \n";
    for (let num = 1; num <= 5; num += 1) {
      xref += String(offsets[num]).padStart(10, "0") + " 00000 n \n";
    }
    xref += "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF\n";
    chunks.push(asciiBytes(xref));
    return concatBytes(chunks);
  }

  window.CertificatePdf = Object.freeze({ CANVAS_W, CANVAS_H, asciiBytes, concatBytes, jpegBytesFromCanvas, buildPdf });
})();
