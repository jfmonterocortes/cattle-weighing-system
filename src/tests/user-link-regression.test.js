const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../app');
const prisma = require('../db/prisma');
const { toSafeLimit } = require('../services/user.service');

async function login(email, password) {
  const res = await request(app).post('/auth/login').send({ email, password });
  return res.body.token;
}

describe('user/link service regressions', () => {
  it('sanitizes and clamps users limit safely', () => {
    expect(toSafeLimit('100')).toBe(100);
    expect(toSafeLimit('250')).toBe(100);
    expect(toSafeLimit('-2')).toBe(20);
    expect(toSafeLimit('abc')).toBe(20);
    expect(toSafeLimit(undefined)).toBe(20);
  });

  it('prevents duplicate APPROVED status transitions for same user/person pair', async () => {
    const adminToken = await login('admin@bascula.com', 'Admin123!');

    const stamp = Date.now();
    const person = await prisma.person.create({
      data: {
        name: `Link Person ${stamp}`,
        nameKey: `link-person-${stamp}`,
      },
    });

    const passwordHash = await bcrypt.hash('Cliente123!', 12);
    const user = await prisma.user.create({
      data: {
        email: `link.user.${stamp}@mail.com`,
        passwordHash,
        role: 'CLIENT',
        personId: null,
      },
    });

    await prisma.personAccountLinkRequest.create({
      data: {
        userId: user.id,
        personId: person.id,
        status: 'APPROVED',
        notes: 'existing approved',
        reviewedAt: new Date(),
      },
    });

    const pending = await prisma.personAccountLinkRequest.create({
      data: {
        userId: user.id,
        personId: person.id,
        status: 'PENDING',
        notes: 'pending should fail to approve',
      },
    });

    const res = await request(app)
      .patch(`/link-requests/${pending.id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(409);
    expect(String(res.body.message || '')).toContain('already exists');
  });
});
