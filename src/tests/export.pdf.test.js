const zlib    = require('zlib');
const request = require('supertest');
const app = require('../app');
const { buildSheetPdf, fmtDate, fmtWeight, fmtMoney } = require('../services/export.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

async function login(email, password) {
  const res = await request(app).post('/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return res.body.token;
}

function makeSheet(rowCount, overrides = {}) {
  return {
    id: 1,
    visibleNumber: 'T-001',
    date: new Date('2025-06-15T17:00:00Z'), // 12:00 in America/Bogota (UTC-5)
    seller: { name: 'Vendedor Test' },
    buyer:  { name: 'Comprador Test' },
    liquidadorAliasSnapshot: 'LIQ',
    isPaid: false,
    pricePerHead: 800000,
    sellerId: 10,
    buyerId: 11,
    rows: Array.from({ length: rowCount }, (_, i) => ({
      rowOrder:     i + 1,
      type:         i % 2 === 0 ? 'NOVILLO' : 'VACA',
      sex:          i % 2 === 0 ? 'MACHO'   : 'HEMBRA',
      weight:       300 + (i % 100),
      cattleNumber: String(i + 1).padStart(3, '0'),
      letters:      null,
    })),
    ...overrides,
  };
}

// ── PDF analysis helpers ──────────────────────────────────────────────────────

/**
 * Extract all human-readable text from a PDFKit-generated PDF buffer.
 *
 * PDFKit always:
 *   1. Compresses content streams with FlateDecode (zlib deflate).
 *   2. Encodes text strings as hex literals `<hexbytes>` inside TJ operators.
 *
 * This helper decompresses every stream then decodes every `<hex>` token,
 * producing a plain string that can be searched for expected/unexpected labels.
 */
function pdfTextContent(buf) {
  // ── Step 1: decompress all FlateDecode streams ──────────────────────────────
  const latin1 = buf.toString('latin1');
  const parts   = [];
  let pos = 0;

  while (pos < latin1.length) {
    const i1 = latin1.indexOf('stream\r\n', pos);
    const i2 = latin1.indexOf('stream\n',  pos);
    if (i1 === -1 && i2 === -1) break;

    let dataStart;
    if (i1 !== -1 && (i2 === -1 || i1 <= i2)) {
      dataStart = i1 + 8;
    } else {
      dataStart = i2 + 7;
    }

    const endIdx = latin1.indexOf('\nendstream', dataStart);
    if (endIdx === -1) break;

    try {
      parts.push(zlib.inflateSync(buf.slice(dataStart, endIdx)).toString('latin1'));
    } catch (_) {
      // Not a deflate stream (e.g. embedded image); skip.
    }

    pos = endIdx + 10;
  }

  const decompressed = parts.join('');

  // ── Step 2: decode hex string tokens `<hexbytes>` ───────────────────────────
  // PDFKit emits text via TJ operators where each string is a hex literal, e.g.
  //   [<4c49515549444144> 0] TJ   →   "LIQUIDADO"
  // ASCII text (U+0020–U+007E) maps 1-to-1 in WinAnsiEncoding.
  return [...decompressed.matchAll(/<([0-9a-fA-F]+)>/g)]
    .map(([, hex]) => {
      let s = '';
      for (let i = 0; i + 1 < hex.length; i += 2) {
        s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
      }
      return s;
    })
    .join('');
}

/** Extract the PDF /Count N page-tree entry from a PDF buffer. */
function pageCount(buffer) {
  const structural = buffer.toString('latin1').replace(/stream[\r\n][\s\S]*?endstream/g, '');
  const matches = [...structural.matchAll(/\/Count\s+(\d+)/g)];
  if (matches.length === 0) return 0;
  return Math.max(...matches.map((m) => Number(m[1])));
}

// ── HTTP success-path ─────────────────────────────────────────────────────────
// All four header assertions run against a single HTTP response so only one
// PDF is generated and one DB round-trip is made.

describe('PDF export HTTP', () => {
  let visibleNumber;
  let pdfRes;

  beforeAll(async () => {
    const token = await login('liquidador@bascula.com', 'Liquidador123!');

    const personRes = await request(app)
      .post('/people')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `PDF Test ${Date.now()}`, phone: `310${Date.now().toString().slice(-7)}` });
    expect(personRes.status).toBe(201);

    const sheetRes = await request(app)
      .post('/sheets')
      .set('Authorization', `Bearer ${token}`)
      .send({ sellerId: personRes.body.id, buyerId: personRes.body.id });
    expect(sheetRes.status).toBe(201);

    visibleNumber = sheetRes.body.visibleNumber;

    // Fetch the PDF once; all tests below inspect this single response.
    pdfRes = await request(app)
      .get(`/exports/sheet/${sheetRes.body.id}/pdf`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
  });

  it('responds 200', () => {
    expect(pdfRes.status).toBe(200);
  });

  it('sets Content-Type to application/pdf', () => {
    expect(pdfRes.headers['content-type']).toMatch(/application\/pdf/);
  });

  it('sets Content-Disposition using visibleNumber', () => {
    expect(pdfRes.headers['content-disposition']).toBe(
      `attachment; filename="planilla-${visibleNumber}.pdf"`,
    );
  });

  it('returns a valid PDF (starts with %PDF-)', () => {
    expect(pdfRes.body.slice(0, 5).toString()).toBe('%PDF-');
  });
});

// ── PRECIO / CABEZA removal regression ───────────────────────────────────────
// PDFKit compresses content streams with FlateDecode (zlib deflate), so text
// strings are not readable in the raw PDF bytes.  pdfTextContent() decompresses
// all streams before asserting, giving reliable presence/absence checks.

describe('buildSheetPdf content regression', () => {
  let textContent;

  beforeAll(async () => {
    const buf = await buildSheetPdf(makeSheet(5));
    textContent = pdfTextContent(buf);
  });

  it('does not contain "PRECIO" anywhere in the PDF text', () => {
    expect(textContent).not.toMatch(/PRECIO/);
  });

  it('still contains "LIQUIDADOR" in the PDF text', () => {
    expect(textContent).toMatch(/LIQUIDADOR/);
  });
});

// ── buildSheetPdf: PAGADA pill (isPaid: true) ─────────────────────────────────

describe('buildSheetPdf isPaid paths', () => {
  it('generates a valid PDF for a PENDIENTE sheet', async () => {
    const buf = await buildSheetPdf(makeSheet(1, { isPaid: false }));
    expect(buf.slice(0, 5).toString()).toBe('%PDF-');
  });

  it('generates a valid PDF for a PAGADA sheet', async () => {
    const buf = await buildSheetPdf(makeSheet(1, { isPaid: true }));
    expect(buf.slice(0, 5).toString()).toBe('%PDF-');
  });
});

// ── Deterministic formatting ──────────────────────────────────────────────────

describe('fmtDate', () => {
  it('formats in Colombia time regardless of server timezone', () => {
    // 2025-06-15T17:00:00Z = 12:00 in America/Bogota (UTC-5, no DST)
    expect(fmtDate(new Date('2025-06-15T17:00:00Z'))).toBe('15/06/2025 12:00');
  });

  it('formats midnight UTC as prior-day 19:00 Bogota (UTC-5 rollback)', () => {
    // 2025-01-10T00:00:00Z = 2025-01-09T19:00 in Bogota
    expect(fmtDate(new Date('2025-01-10T00:00:00Z'))).toBe('09/01/2025 19:00');
  });
});

describe('fmtWeight', () => {
  it('formats with no decimals and period as thousands separator', () => {
    expect(fmtWeight(1234)).toBe('1.234');
  });

  it('formats whole numbers with no trailing decimal', () => {
    expect(fmtWeight(300)).toBe('300');
  });

  it('rounds fractional weights to the nearest integer', () => {
    expect(fmtWeight(510.4)).toBe('510');
    expect(fmtWeight(510.6)).toBe('511');
  });
});

describe('fmtMoney', () => {
  it('uses period as thousands separator with no decimals', () => {
    expect(fmtMoney(1500000)).toMatch(/1\.500\.000/);
  });

  it('formats zero as zero', () => {
    expect(fmtMoney(0)).toMatch(/0/);
  });
});

// ── Pagination regression ─────────────────────────────────────────────────────
// Regression for: drawFooter called doc.text() at y > contentBottom, causing
// PDFKit's auto-page-break to fire once per text call, adding phantom pages.
// A 1-page sheet was producing 3 pages; a 2-page sheet was producing 5.

describe('buildSheetPdf pagination', () => {
  it('short sheet (5 rows) fits on exactly 1 page', async () => {
    const buffer = await buildSheetPdf(makeSheet(5));
    expect(buffer.slice(0, 5).toString()).toBe('%PDF-');
    expect(pageCount(buffer)).toBe(1);
  });

  it('empty sheet (0 rows) fits on exactly 1 page', async () => {
    const buffer = await buildSheetPdf(makeSheet(0));
    expect(buffer.slice(0, 5).toString()).toBe('%PDF-');
    expect(pageCount(buffer)).toBe(1);
  });

  it('large sheet (100 rows) spans at least 2 pages', async () => {
    const buffer = await buildSheetPdf(makeSheet(100));
    expect(buffer.slice(0, 5).toString()).toBe('%PDF-');
    expect(pageCount(buffer)).toBeGreaterThanOrEqual(2);
  });

  it('produces the same bytes when called twice with identical input', async () => {
    // PDFKit embeds a creation timestamp; we check the content-bearing
    // portion rather than a full byte-for-byte comparison.
    const sheet = makeSheet(5);
    const [a, b] = await Promise.all([buildSheetPdf(sheet), buildSheetPdf(sheet)]);

    expect(a.slice(0, 5).toString()).toBe('%PDF-');
    expect(b.slice(0, 5).toString()).toBe('%PDF-');

    // Strip PDF timestamps by slicing to the first xref table.
    const xrefA = a.indexOf('xref');
    const xrefB = b.indexOf('xref');
    expect(xrefA).toBeGreaterThan(0);
    expect(a.slice(0, xrefA).toString('latin1')).toBe(b.slice(0, xrefB).toString('latin1'));
  });
});
