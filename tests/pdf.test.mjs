import test from 'node:test';
import assert from 'node:assert/strict';
import { countText } from '../../math-class-hub/public/pdf-counter/count.mjs';
// Text extraction never uses geometry rendering. Minimal Node-only shim lets
// the same browser distribution initialize; browser layout remains unverified.
globalThis.DOMMatrix ??= class {};
const { getDocument, GlobalWorkerOptions } = await import('../../math-class-hub/public/pdf-counter/vendor/pdf.mjs');
GlobalWorkerOptions.workerSrc = new URL('../../math-class-hub/public/pdf-counter/vendor/pdf.worker.mjs', import.meta.url).href;
function fixture(text) {
  const content = text === null ? '' : `BT /F1 12 Tf 20 100 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ];
  let source = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, i) => { offsets.push(source.length); source += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const start = source.length;
  source += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return new TextEncoder().encode(source);
}
test('actual bundled PDF.js extracts synthetic PDF and detects empty page', async () => {
  for (const [text, expected] of [['Hello PDF', {withSpaces:9,withoutSpaces:8}], [null,{withSpaces:0,withoutSpaces:0}]]) {
    const task = getDocument({ data:fixture(text), isEvalSupported:false, verbosity:0, useSystemFonts:false, disableFontFace:true });
    try {
      const doc = await task.promise;
      assert.equal(doc.numPages,1);
      const page = await doc.getPage(1);
      const reader = page.streamTextContent().getReader();
      let extracted = '';
      while(true) { const chunk = await reader.read(); if(chunk.done) break; for(const item of chunk.value.items) if(typeof item.str === 'string') extracted += item.str; }
      assert.deepEqual(countText(extracted),expected);
      page.cleanup();
    } finally { await task.destroy(); }
  }
});
test('actual bundled PDF.js rejects malformed PDF', async () => {
  const task = getDocument({data:new TextEncoder().encode('%PDF-invalid'),verbosity:0});
  try { await assert.rejects(task.promise, {name:'InvalidPDFException'}); }
  finally { await task.destroy(); }
});
