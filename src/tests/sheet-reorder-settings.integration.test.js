const request = require('supertest');
const app = require('../app');

async function login(email, password) {
  const res = await request(app).post('/auth/login').send({ email, password });
  expect(res.statusCode).toBe(200);
  return res.body.token;
}

describe('sheet reorder + client settings profile/password', () => {
  it('reorders rows without unique collisions and persists sequential order', async () => {
    const liqToken = await login('liquidador@bascula.com', 'Liquidador123!');

    const stamp = Date.now();
    const seller = await request(app)
      .post('/people')
      .set('Authorization', `Bearer ${liqToken}`)
      .send({ name: `Seller Reorder ${stamp}`, phone: `390${String(stamp).slice(-7)}` });
    expect(seller.statusCode).toBe(201);

    const buyer = await request(app)
      .post('/people')
      .set('Authorization', `Bearer ${liqToken}`)
      .send({ name: `Buyer Reorder ${stamp}`, phone: `391${String(stamp).slice(-7)}` });
    expect(buyer.statusCode).toBe(201);

    const sheet = await request(app)
      .post('/sheets')
      .set('Authorization', `Bearer ${liqToken}`)
      .send({ sellerId: seller.body.id, buyerId: buyer.body.id });
    expect(sheet.statusCode).toBe(201);

    const rowA = await request(app)
      .post(`/sheets/${sheet.body.id}/rows`)
      .set('Authorization', `Bearer ${liqToken}`)
      .send({ type: 'TERNERO', sex: 'MACHO', weight: 330, cattleNumber: '1' });
    expect(rowA.statusCode).toBe(201);

    const rowB = await request(app)
      .post(`/sheets/${sheet.body.id}/rows`)
      .set('Authorization', `Bearer ${liqToken}`)
      .send({ type: 'NOVILLO', sex: 'MACHO', weight: 410, cattleNumber: '2' });
    expect(rowB.statusCode).toBe(201);

    const reorderedIds = [rowB.body.id, rowA.body.id];

    const reorderRes = await request(app)
      .post(`/sheets/${sheet.body.id}/rows/reorder`)
      .set('Authorization', `Bearer ${liqToken}`)
      .send({ orderedRowIds: reorderedIds });

    expect(reorderRes.statusCode).toBe(200);

    const after = await request(app)
      .get(`/sheets/${sheet.body.id}`)
      .set('Authorization', `Bearer ${liqToken}`);

    expect(after.statusCode).toBe(200);
    expect(after.body.rows.map((r) => r.id)).toEqual(reorderedIds);
    expect(after.body.rows.map((r) => r.rowOrder)).toEqual([1, 2]);
  });

  it('updates linked client profile and blocks unlinked client profile updates', async () => {
    const adminToken = await login('admin@bascula.com', 'Admin123!');
    const stamp = Date.now();

    const linkedPerson = await request(app)
      .post('/people')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Linked Person ${stamp}`, phone: `392${String(stamp).slice(-7)}` });
    expect(linkedPerson.statusCode).toBe(201);

    const linkedEmail = `linked.${stamp}@bascula.com`;
    const linkedCreate = await request(app)
      .post('/auth/register-managed')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: linkedEmail,
        password: 'Cliente123!',
        role: 'CLIENT',
      });
    expect(linkedCreate.statusCode).toBe(201);

    const linkUser = await request(app)
      .patch(`/users/${linkedCreate.body.id}/person-link`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ personId: linkedPerson.body.id });
    expect(linkUser.statusCode).toBe(200);

    const linkedToken = await login(linkedEmail, 'Cliente123!');
    const profileUpdate = await request(app)
      .patch('/settings/profile')
      .set('Authorization', `Bearer ${linkedToken}`)
      .send({ phone: '' });

    expect(profileUpdate.statusCode).toBe(200);
    expect(profileUpdate.body.person.phone).toBeNull();

    const unlinkedEmail = `unlinked.${stamp}@bascula.com`;
    const unlinkedCreate = await request(app)
      .post('/auth/register-managed')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: unlinkedEmail,
        password: 'Cliente123!',
        role: 'CLIENT',
      });
    expect(unlinkedCreate.statusCode).toBe(201);

    const unlinkedToken = await login(unlinkedEmail, 'Cliente123!');
    const blocked = await request(app)
      .patch('/settings/profile')
      .set('Authorization', `Bearer ${unlinkedToken}`)
      .send({ phone: '3111111111' });

    expect(blocked.statusCode).toBe(409);
    expect(blocked.body.message).toContain('Debes vincular tu cuenta a una persona');
  });

  it('changes own password with current password validation', async () => {
    const stamp = Date.now();
    const email = `pw.self.${stamp}@bascula.com`;

    const register = await request(app)
      .post('/auth/register')
      .send({ email, password: 'Cliente123!', role: 'CLIENT' });
    expect(register.statusCode).toBe(201);

    const token = await login(email, 'Cliente123!');

    const wrongCurrent = await request(app)
      .patch('/settings/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Incorrecta123!', newPassword: 'Cliente123!?' });
    expect(wrongCurrent.statusCode).toBe(400);

    const changed = await request(app)
      .patch('/settings/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Cliente123!', newPassword: 'Cliente123!?' });
    expect(changed.statusCode).toBe(200);

    const relogin = await request(app).post('/auth/login').send({ email, password: 'Cliente123!?' });
    expect(relogin.statusCode).toBe(200);
  });
});
