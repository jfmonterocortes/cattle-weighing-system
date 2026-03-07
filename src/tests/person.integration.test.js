const request = require('supertest');
const app = require('../app');

async function login(email, password) {
  const res = await request(app).post('/auth/login').send({ email, password });
  return res.body.token;
}

describe('person integration contracts', () => {
  it('search supports numeric-string limit without Prisma type error', async () => {
    const token = await login('admin@bascula.com', 'Admin123!');

    const res = await request(app)
      .get('/people/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ q: 'Carlos', limit: '8' });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('prevents duplicate phone with clear already-registered error', async () => {
    const token = await login('admin@bascula.com', 'Admin123!');
    const phone = `31377${Date.now().toString().slice(-5)}`;

    const first = await request(app)
      .post('/people')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Persona ${Date.now()}`, phone });

    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/people')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Otra ${Date.now()}`, phone });

    expect(second.status).toBe(409);
    expect(String(second.body.message || '').toLowerCase()).toContain('telefono');
  });

  it('newly created person appears in search immediately', async () => {
    const token = await login('admin@bascula.com', 'Admin123!');
    const name = `Busqueda Inmediata ${Date.now()}`;

    const created = await request(app)
      .post('/people')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, phone: `31266${Date.now().toString().slice(-5)}` });

    expect(created.status).toBe(201);

    const search = await request(app)
      .get('/people/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ q: name.split(' ')[0], limit: 10 });

    expect(search.status).toBe(200);
    expect(search.body.some((p) => p.id === created.body.id)).toBe(true);
  });
});
