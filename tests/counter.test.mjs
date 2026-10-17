import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { countText, validateFile, hasPdfHeader, MAX_BYTES } from '../../math-class-hub/public/pdf-counter/count.mjs';
import { server } from '../server.mjs';
test('Korean, decomposed characters, emoji, whitespace and page line breaks', () => {
  assert.deepEqual(countText('한글 A\r\nB\t가👩‍👩‍👧‍👦'), { withSpaces: 8, withoutSpaces: 6 });
  assert.deepEqual(countText(' \n\t'), { withSpaces: 2, withoutSpaces: 0 });
  assert.deepEqual(countText(''), { withSpaces: 0, withoutSpaces: 0 });
});
test('PDF file limits and signature validation', () => {
  for (const file of [{name:'x.txt',size:20},{name:'x.pdf',size:0},{name:'x.pdf',size:MAX_BYTES+1}]) assert.throws(() => validateFile(file));
  assert.doesNotThrow(() => validateFile({name:'SYNTHETIC.PDF',size:100}));
  assert.equal(hasPdfHeader(new TextEncoder().encode('%PDF-1.7')), true);
  assert.equal(hasPdfHeader(new TextEncoder().encode('<html>')), false);
});
test('loopback static server blocks uploads and traversal, serves local worker and CMaps', async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const file of ['/pdf-counter/', '/app.mjs', '/vendor/pdf.worker.mjs', '/vendor/cmaps/Adobe-Korea1-UCS2.bcmap']) {
      const res = await fetch(base + file);
      assert.equal(res.status, 200, file);
      assert.match(res.headers.get('content-security-policy'), /form-action 'none'/);
      assert.equal(res.headers.get('access-control-allow-origin'), null);
    }
    assert.equal((await fetch(base + '/app.mjs', { method:'POST', body:'SYNTHETIC' })).status, 405);
    assert.equal((await fetch(base + '/%2e%2e%5cpackage.json')).status, 403);
    assert.equal((await fetch(base + '/missing.pdf')).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('app contains no persistence, remote URL, dynamic markup, or upload APIs', async () => {
  const source = await readFile(new URL('../../math-class-hub/public/pdf-counter/app.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest|innerHTML|https?:\/\//);
  assert.match(source, /data: bytes/);
  assert.match(source, /task\.destroy\(\)/);
});
