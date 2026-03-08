const request = require('supertest');
const app = require('../app');

describe('critical flows integration', () => {
  it('supports client link request, admin review, admin client user create, and liquidador operational creation', async () => {
    const login = async (email, password) => {
      const res = await request(app).post('/auth/login').send({ email, password });
      expect(res.status).toBe(200);
      return res.body.token;
    };

    const adminToken = await login('admin@bascula.com', 'Admin123!');
    const liqToken = await login('liquidador@bascula.com', 'Liquidador123!');
    const orphanToken = await login('nuevo@bascula.com', 'Cliente123!');

    const peopleSearch = await request(app)
      .get('/people/search')
      .set('Authorization', `Bearer ${orphanToken}`)
      .query({ q: 'Carlos' });

    expect(peopleSearch.status).toBe(200);
    expect(peopleSearch.body.length).toBeGreaterThan(0);

    const linkReq = await request(app)
      .post('/link-requests')
      .set('Authorization', `Bearer ${orphanToken}`)
      .send({ personId: peopleSearch.body[0].id, notes: 'integration test request' });

    expect([201, 409]).toContain(linkReq.status);

    const requests = await request(app).get('/link-requests').set('Authorization', `Bearer ${adminToken}`);
    expect(requests.status).toBe(200);

    const pending = requests.body.find((item) => item.status === 'PENDING');
    if (pending) {
      const review = await request(app)
        .patch(`/link-requests/${pending.id}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'REJECTED', notes: 'integration reviewed' });
      expect(review.status).toBe(200);
    }

    const person = await request(app)
      .post('/people')
      .set('Authorization', `Bearer ${liqToken}`)
      .send({ name: `Persona Test ${Date.now()}`, phone: `390${Date.now().toString().slice(-7)}` });
    expect(person.status).toBe(201);

    const sheet = await request(app)
      .post('/sheets')
      .set('Authorization', `Bearer ${liqToken}`)
      .send({ sellerId: person.body.id, buyerId: person.body.id });
    expect(sheet.status).toBe(201);

    const managedUser = await request(app)
      .post('/auth/register-managed')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `admin.client.${Date.now()}@mail.com`,
        password: 'Cliente123!',
        role: 'CLIENT',
      });

    expect(managedUser.status).toBe(201);

    const users = await request(app).get('/users').set('Authorization', `Bearer ${adminToken}`);
    expect(users.status).toBe(200);
  });
});
