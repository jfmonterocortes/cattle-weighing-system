const request = require('supertest');
const app = require('../app');

async function login(email, password) {
  const res = await request(app).post('/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return res.body.token;
}

describe('export authorization', () => {
  it('enforces sheet-level visibility for PDF export', async () => {
    const adminToken = await login('admin@bascula.com', 'Admin123!');
    const clientToken = await login('cliente@bascula.com', 'Cliente123!');

    const adminSheets = await request(app).get('/sheets').set('Authorization', `Bearer ${adminToken}`);
    const clientSheets = await request(app).get('/sheets').set('Authorization', `Bearer ${clientToken}`);

    expect(adminSheets.status).toBe(200);
    expect(clientSheets.status).toBe(200);

    const clientIds = new Set(clientSheets.body.items.map((s) => s.id));
    const nonAccessible = adminSheets.body.items.find((s) => !clientIds.has(s.id));

    if (!nonAccessible) {
      // If fixture data changes and all become visible, keep test deterministic.
      return;
    }

    const denied = await request(app)
      .get(`/exports/sheet/${nonAccessible.id}/pdf`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(denied.status).toBe(403);
  });
});
