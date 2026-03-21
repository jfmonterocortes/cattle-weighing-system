const request = require('supertest');
const app = require('../app');
const { buildSheetPdf, fmtDate, fmtWeight, fmtMoney } = require('../services/export.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

async function login(email, password) {
  const res = await request(app).post('/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return res.body.token;
}

function makeSheet(rowCount) {
  return {
    id: 1,
    visibleNumber: 'T-001',
    date: new Date('2025-06-15T17:00:00Z'), // 12:00 in America/Bogota (UTC-5)
    seller: { name: 'Vendedor Test' },
    buyer: { name: 'Comprador Test' },
    liquidadorAliasSnapshot: 'LIQ',
    isPaid: false,
    pricePerHead: 800000,
    sellerId: 10,
    buyerId: 11,
    rows: Array.from({ length: rowCount }, (_, i) => ({
      rowOrder: i + 1,
      type: i % 2 === 0 ? 'NOVILLO' : 'VACA',
      sex: i % 2 === 0 ? 'MACHO' : 'HEMBRA',
      weight: 300 + (i % 100),
      cattleNumber: String(i + 1).padStart(3, '0'),
      letters: null,
    })),
  };
}

// ── HTTP: 200, Content-Disposition, PDF signature ─────────────────────────────

describe('PDF export HTTP', () => {
  let token;
  let sheetId;
  let visibleNumber;

  beforeAll(async () => {
    token = await login('liquidador@bascula.com', 'Liquidador123!');

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

    sheetId       = sheetRes.body.id;
    visibleNumber = sheetRes.body.visibleNumber;
  });

  it('responds 200', async () => {
    const res = await request(app)
      .get(`/exports/sheet/${sheetId}/pdf`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('sets Content-Disposition using visibleNumber', async () => {
    const res = await request(app)
      .get(`/exports/sheet/${sheetId}/pdf`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="planilla-${visibleNumber}.pdf"`
    );
  });

  it('returns a valid PDF (starts with %PDF-)', async () => {
    const res = await request(app)
      .get(`/exports/sheet/${sheetId}/pdf`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.body.slice(0, 5).toString()).toBe('%PDF-');
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
  it('formats with one decimal and period as thousands separator', () => {
    expect(fmtWeight(1234.5)).toBe('1.234,5');
  });

  it('always shows one decimal even for whole numbers', () => {
    expect(fmtWeight(300)).toBe('300,0');
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

// ── Multi-page sheet ──────────────────────────────────────────────────────────

describe('buildSheetPdf multi-page', () => {
  it('generates a valid PDF for a sheet with 100 rows (forces page break)', async () => {
    const sheet = makeSheet(100);
    const buffer = await buildSheetPdf(sheet);

    // Valid PDF signature
    expect(buffer.slice(0, 5).toString()).toBe('%PDF-');

    // Strip binary stream bodies so embedded PNG/font bytes don't give false
    // matches, then find the Pages tree "/Count N" entry.
    const structural = buffer.toString('latin1').replace(/stream[\r\n][\s\S]*?endstream/g, '');
    const countMatches = [...structural.matchAll(/\/Count\s+(\d+)/g)];
    expect(countMatches.length).toBeGreaterThan(0);
    const totalPages = Math.max(...countMatches.map((m) => Number(m[1])));
    expect(totalPages).toBeGreaterThanOrEqual(2);
  });

  it('produces the same bytes when called twice with identical input', async () => {
    // PDFKit embeds a creation timestamp; we check the content-bearing
    // portion rather than a full byte-for-byte comparison.
    const sheet = makeSheet(5);
    const [a, b] = await Promise.all([buildSheetPdf(sheet), buildSheetPdf(sheet)]);

    // Both must be valid PDFs
    expect(a.slice(0, 5).toString()).toBe('%PDF-');
    expect(b.slice(0, 5).toString()).toBe('%PDF-');

    // The formatted text content must be identical (strip PDF timestamps
    // which differ per invocation by slicing to the first xref table)
    const xrefA = a.indexOf('xref');
    const xrefB = b.indexOf('xref');
    expect(xrefA).toBeGreaterThan(0);
    expect(a.slice(0, xrefA).toString('latin1')).toBe(b.slice(0, xrefB).toString('latin1'));
  });
});
