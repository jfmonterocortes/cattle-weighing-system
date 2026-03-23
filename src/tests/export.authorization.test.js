const request = require('supertest');
const app = require('../app');

async function login(email, password) {
  const res = await request(app).post('/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return res.body.token;
}

// ── Sheet-level PDF access control ───────────────────────────────────────────
// A CLIENT may only export sheets where they appear as seller or buyer.
// A LIQUIDADOR is always allowed (no ownership check).
//
// The sheet used here is created fresh so the test is independent of seed data.

describe('export authorization', () => {
  let liquidadorToken;
  let clientToken;
  let sheetId;

  beforeAll(async () => {
    [liquidadorToken, clientToken] = await Promise.all([
      login('liquidador@bascula.com', 'Liquidador123!'),
      login('cliente@bascula.com',    'Cliente123!'),
    ]);

    // Create a seller/buyer that is NOT the client user, so the client has no
    // ownership claim on the sheet.
    const stamp = Date.now();
    const personRes = await request(app)
      .post('/people')
      .set('Authorization', `Bearer ${liquidadorToken}`)
      .send({ name: `Auth Test ${stamp}`, phone: `311${stamp.toString().slice(-7)}` });
    expect(personRes.status).toBe(201);

    const sheetRes = await request(app)
      .post('/sheets')
      .set('Authorization', `Bearer ${liquidadorToken}`)
      .send({ sellerId: personRes.body.id, buyerId: personRes.body.id });
    expect(sheetRes.status).toBe(201);

    sheetId = sheetRes.body.id;
  });

  it('allows LIQUIDADOR to export any sheet', async () => {
    const res = await request(app)
      .get(`/exports/sheet/${sheetId}/pdf`)
      .set('Authorization', `Bearer ${liquidadorToken}`);

    expect(res.status).toBe(200);
  });

  it('returns 403 when CLIENT is not seller or buyer of the sheet', async () => {
    const res = await request(app)
      .get(`/exports/sheet/${sheetId}/pdf`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 for unauthenticated requests', async () => {
    const res = await request(app)
      .get(`/exports/sheet/${sheetId}/pdf`);

    expect(res.status).toBe(401);
  });
});
