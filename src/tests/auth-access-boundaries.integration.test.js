const request = require('supertest');
const app = require('../app');

async function login(email, password) {
  const res = await request(app).post('/auth/login').send({ email, password });
  expect(res.statusCode).toBe(200);
  return res.body.token;
}

describe('auth and people access boundaries', () => {
  it('rejects operator-role self-registration on the public signup route', async () => {
    const res = await request(app).post('/auth/register').send({
      email: `self.operator.${Date.now()}@bascula.com`,
      password: 'Liquidador123!',
      role: 'LIQUIDADOR',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('keeps managed operator creation admin-only', async () => {
    const adminToken = await login('admin@bascula.com', 'Admin123!');
    const res = await request(app)
      .post('/auth/register-managed')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `managed.operator.${Date.now()}@bascula.com`,
        password: 'Liquidador123!',
        role: 'LIQUIDADOR',
        liquidadorAlias: 'LQ1',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.role).toBe('LIQUIDADOR');
  });

  it('blocks clients from the operator people directory', async () => {
    const clientToken = await login('cliente@bascula.com', 'Cliente123!');
    const res = await request(app)
      .get('/people')
      .set('Authorization', `Bearer ${clientToken}`)
      .query({ q: 'Carlos', page: 1, pageSize: 20 });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Forbidden');
  });

  it('returns a minimal person payload to clients during linking search', async () => {
    const clientToken = await login('cliente@bascula.com', 'Cliente123!');
    const res = await request(app)
      .get('/people/search')
      .set('Authorization', `Bearer ${clientToken}`)
      .query({ q: 'Rosa', limit: 10 });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((person) => !Object.prototype.hasOwnProperty.call(person, 'user'))).toBe(true);
  });

  it('keeps operator-grade metadata available to admins on people search', async () => {
    const adminToken = await login('admin@bascula.com', 'Admin123!');
    const res = await request(app)
      .get('/people/search')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ q: 'Rosa', limit: 10 });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const linked = res.body.find((person) => person.user?.email === 'cliente@bascula.com');
    expect(linked).toBeTruthy();
  });

  it('preserves the client linking flow with the tightened search contract', async () => {
    const email = `phase1.client.${Date.now()}@bascula.com`;
    const register = await request(app).post('/auth/register').send({
      email,
      password: 'Cliente123!',
    });
    expect(register.statusCode).toBe(201);
    expect(register.body.role).toBe('CLIENT');

    const adminToken = await login('admin@bascula.com', 'Admin123!');
    const personCreate = await request(app)
      .post('/people')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Phase1 Link Person ${Date.now()}`,
        phone: `395${Date.now().toString().slice(-7)}`,
      });
    expect(personCreate.statusCode).toBe(201);

    const clientToken = await login(email, 'Cliente123!');
    const search = await request(app)
      .get('/people/search')
      .set('Authorization', `Bearer ${clientToken}`)
      .query({ q: personCreate.body.name, limit: 10 });

    expect(search.statusCode).toBe(200);
    const matched = search.body.find((person) => person.id === personCreate.body.id);
    expect(matched).toBeTruthy();
    expect(Object.prototype.hasOwnProperty.call(matched, 'user')).toBe(false);

    const linkRequest = await request(app)
      .post('/link-requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ personId: personCreate.body.id, notes: 'phase1 linking contract test' });

    expect(linkRequest.statusCode).toBe(201);
  });
});
