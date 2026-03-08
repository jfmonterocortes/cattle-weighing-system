const request = require('supertest');
const app = require('../app');

async function login(email, password) {
  const res = await request(app).post('/auth/login').send({ email, password });
  return res.body.token;
}

describe('auth reset + client one-time link', () => {
  it('blocks second client link request with exact business message', async () => {
    const email = `cliente.one-time.${Date.now()}@bascula.com`;

    const register = await request(app).post('/auth/register').send({
      email,
      password: 'Cliente123!',
      role: 'CLIENT',
    });
    expect(register.statusCode).toBe(201);

    const adminToken = await login('admin@bascula.com', 'Admin123!');
    const personCreate = await request(app)
      .post('/people')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Persona Vinculacion ${Date.now()}`, phone: `390${Date.now().toString().slice(-7)}` });

    expect(personCreate.statusCode).toBe(201);

    const token = await login(email, 'Cliente123!');

    const first = await request(app)
      .post('/link-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ personId: personCreate.body.id, notes: 'primera solicitud test' });

    expect(first.statusCode).toBe(201);

    const second = await request(app)
      .post('/link-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ personId: personCreate.body.id, notes: 'segunda solicitud test' });

    expect(second.statusCode).toBe(409);
    expect(second.body.message).toBe(
      'Tu solicitud de vinculación ya fue utilizada. Si necesitas hacer una corrección, por favor comunícate con atención al cliente o con el administrador.'
    );
  });

  it('supports admin generated password reset link + token reset endpoint', async () => {
    const adminToken = await login('admin@bascula.com', 'Admin123!');

    const users = await request(app).get('/users').set('Authorization', `Bearer ${adminToken}`).query({ limit: 100 });
    expect(users.statusCode).toBe(200);

    const target = users.body.find((u) => u.email === 'cliente@bascula.com');
    expect(target).toBeTruthy();

    const generated = await request(app)
      .post(`/users/${target.id}/password-reset-link`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(generated.statusCode).toBe(200);
    expect(generated.body.resetToken).toBeTruthy();

    const reset = await request(app)
      .post('/auth/reset-password')
      .send({ token: generated.body.resetToken, newPassword: 'Cliente123!!' });

    expect(reset.statusCode).toBe(200);

    const relogin = await request(app).post('/auth/login').send({ email: 'cliente@bascula.com', password: 'Cliente123!!' });
    expect(relogin.statusCode).toBe(200);

    const rollback = await request(app)
      .patch(`/users/${target.id}/password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: 'Cliente123!' });

    expect(rollback.statusCode).toBe(200);
  });
});
