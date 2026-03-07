const request = require('supertest');
const app = require('../app');

async function login(email, password) {
  const res = await request(app).post('/auth/login').send({ email, password });
  return res.body.token;
}

describe('sheet pagination contract', () => {
  it('accepts numeric-string page/pageSize and returns numeric pagination values', async () => {
    const token = await login('admin@bascula.com', 'Admin123!');

    const res = await request(app)
      .get('/sheets')
      .set('Authorization', `Bearer ${token}`)
      .query({ page: '1', pageSize: '100' });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(typeof res.body.page).toBe('number');
    expect(typeof res.body.pageSize).toBe('number');
    expect(res.body.pageSize).toBeLessThanOrEqual(100);
  });
});
