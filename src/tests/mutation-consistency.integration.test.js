const request = require('supertest');
const app = require('../app');
const prisma = require('../db/prisma');

async function login(email, password) {
  const res = await request(app).post('/auth/login').send({ email, password });
  expect(res.statusCode).toBe(200);
  return res.body.token;
}

function uniqueName(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

async function withFailTrigger({ name, table, event, body }, run) {
  const functionName = `${name}_fn`;

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION ${functionName}() RETURNS trigger AS $$
    BEGIN
      ${body}
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER ${name}
    BEFORE ${event} ON ${table}
    FOR EACH ROW
    EXECUTE FUNCTION ${functionName}();
  `);

  try {
    return await run();
  } finally {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${name} ON ${table};`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${functionName}();`);
  }
}

async function createPerson(token, labelPrefix) {
  const stamp = Date.now();
  const res = await request(app)
    .post('/people')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `${labelPrefix} ${stamp}`,
      phone: `39${String(stamp).slice(-8)}`,
    });

  expect(res.statusCode).toBe(201);
  return res.body;
}

async function createSheet(token, sellerId, buyerId) {
  const res = await request(app)
    .post('/sheets')
    .set('Authorization', `Bearer ${token}`)
    .send({ sellerId, buyerId });

  expect(res.statusCode).toBe(201);
  return res.body;
}

describe('mutation consistency', () => {
  it('rolls back row creation when sheet total recalculation fails', async () => {
    const liqToken = await login('liquidador@bascula.com', 'Liquidador123!');
    const seller = await createPerson(liqToken, 'Row Rollback Seller');
    const buyer = await createPerson(liqToken, 'Row Rollback Buyer');
    const sheet = await createSheet(liqToken, seller.id, buyer.id);

    const triggerName = uniqueName('fail_sheet_recalc');

    const addRowRes = await withFailTrigger(
      {
        name: triggerName,
        table: '"WeighingSheet"',
        event: 'UPDATE',
        body: `
          IF NEW.id = ${sheet.id} THEN
            RAISE EXCEPTION 'forced sheet recalculation failure';
          END IF;
          RETURN NEW;
        `,
      },
      async () =>
        request(app)
          .post(`/sheets/${sheet.id}/rows`)
          .set('Authorization', `Bearer ${liqToken}`)
          .send({ type: 'TERNERO', sex: 'MACHO', weight: 330, cattleNumber: '1' })
    );

    expect(addRowRes.statusCode).toBe(500);
    expect(addRowRes.body.message).toContain('forced sheet recalculation failure');

    const rows = await prisma.cattleRow.findMany({
      where: { weighingSheetId: sheet.id },
    });
    const refreshedSheet = await prisma.weighingSheet.findUnique({
      where: { id: sheet.id },
      select: { headCount: true, totalWeight: true },
    });

    expect(rows).toHaveLength(0);
    expect(refreshedSheet.headCount).toBe(0);
    expect(refreshedSheet.totalWeight).toBe(0);
  });

  it('keeps row creation successful when the row audit write fails', async () => {
    const liqToken = await login('liquidador@bascula.com', 'Liquidador123!');
    const seller = await createPerson(liqToken, 'Audit Seller');
    const buyer = await createPerson(liqToken, 'Audit Buyer');
    const sheet = await createSheet(liqToken, seller.id, buyer.id);

    const initialAuditCount = await prisma.sheetAuditLog.count({
      where: { weighingSheetId: sheet.id },
    });

    const triggerName = uniqueName('fail_row_audit');

    const addRowRes = await withFailTrigger(
      {
        name: triggerName,
        table: '"SheetAuditLog"',
        event: 'INSERT',
        body: `
          IF NEW."weighingSheetId" = ${sheet.id} AND NEW.action = 'ROW_ADDED' THEN
            RAISE EXCEPTION 'forced row audit failure';
          END IF;
          RETURN NEW;
        `,
      },
      async () =>
        request(app)
          .post(`/sheets/${sheet.id}/rows`)
          .set('Authorization', `Bearer ${liqToken}`)
          .send({ type: 'TERNERO', sex: 'MACHO', weight: 305, cattleNumber: '1' })
    );

    expect(addRowRes.statusCode).toBe(201);

    const rows = await prisma.cattleRow.findMany({
      where: { weighingSheetId: sheet.id },
    });
    const auditCount = await prisma.sheetAuditLog.count({
      where: { weighingSheetId: sheet.id },
    });

    expect(rows).toHaveLength(1);
    expect(auditCount).toBe(initialAuditCount);
  });

  it('rolls back payment status when payment log creation fails', async () => {
    const liqToken = await login('liquidador@bascula.com', 'Liquidador123!');
    const seller = await createPerson(liqToken, 'Payment Seller');
    const buyer = await createPerson(liqToken, 'Payment Buyer');
    const sheet = await createSheet(liqToken, seller.id, buyer.id);

    const triggerName = uniqueName('fail_payment_log');

    const paymentRes = await withFailTrigger(
      {
        name: triggerName,
        table: '"PaymentLog"',
        event: 'INSERT',
        body: `
          IF NEW."weighingSheetId" = ${sheet.id} THEN
            RAISE EXCEPTION 'forced payment log failure';
          END IF;
          RETURN NEW;
        `,
      },
      async () =>
        request(app)
          .post(`/sheets/${sheet.id}/payment-status`)
          .set('Authorization', `Bearer ${liqToken}`)
          .send({ isPaid: true, notes: 'forced failure test' })
    );

    expect(paymentRes.statusCode).toBe(500);
    expect(paymentRes.body.message).toContain('forced payment log failure');

    const refreshedSheet = await prisma.weighingSheet.findUnique({
      where: { id: sheet.id },
      select: { isPaid: true, paidAt: true, paidById: true },
    });
    const paymentLogs = await prisma.paymentLog.findMany({
      where: { weighingSheetId: sheet.id },
    });

    expect(refreshedSheet.isPaid).toBe(false);
    expect(refreshedSheet.paidAt).toBeNull();
    expect(refreshedSheet.paidById).toBeNull();
    expect(paymentLogs).toHaveLength(0);
  });

  it('rolls back link review when the user link update fails', async () => {
    const adminToken = await login('admin@bascula.com', 'Admin123!');
    const person = await createPerson(adminToken, 'Link Review Person');
    const stamp = Date.now();
    const email = `review.rollback.${stamp}@bascula.com`;

    const userRes = await request(app)
      .post('/auth/register-managed')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email,
        password: 'Cliente123!',
        role: 'CLIENT',
      });
    expect(userRes.statusCode).toBe(201);

    const clientToken = await login(email, 'Cliente123!');
    const linkReq = await request(app)
      .post('/link-requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ personId: person.id, notes: 'rollback review test' });
    expect(linkReq.statusCode).toBe(201);

    const triggerName = uniqueName('fail_user_link');

    const reviewRes = await withFailTrigger(
      {
        name: triggerName,
        table: '"User"',
        event: 'UPDATE',
        body: `
          IF NEW.id = ${userRes.body.id} THEN
            RAISE EXCEPTION 'forced user link failure';
          END IF;
          RETURN NEW;
        `,
      },
      async () =>
        request(app)
          .patch(`/link-requests/${linkReq.body.id}/review`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'APPROVED', notes: 'should rollback' })
    );

    expect(reviewRes.statusCode).toBe(500);
    expect(reviewRes.body.message).toContain('forced user link failure');

    const refreshedRequest = await prisma.personAccountLinkRequest.findUnique({
      where: { id: linkReq.body.id },
      select: { status: true, reviewedById: true, reviewedAt: true },
    });
    const refreshedUser = await prisma.user.findUnique({
      where: { id: userRes.body.id },
      select: { personId: true },
    });

    expect(refreshedRequest.status).toBe('PENDING');
    expect(refreshedRequest.reviewedById).toBeNull();
    expect(refreshedRequest.reviewedAt).toBeNull();
    expect(refreshedUser.personId).toBeNull();
  });

  it('keeps link review successful when linked sheet audits fail', async () => {
    const adminToken = await login('admin@bascula.com', 'Admin123!');
    const person = await createPerson(adminToken, 'Audit Link Person');
    const buyer = await createPerson(adminToken, 'Audit Link Buyer');
    const sheet = await createSheet(adminToken, person.id, buyer.id);

    const stamp = Date.now();
    const email = `review.audit.${stamp}@bascula.com`;

    const userRes = await request(app)
      .post('/auth/register-managed')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email,
        password: 'Cliente123!',
        role: 'CLIENT',
      });
    expect(userRes.statusCode).toBe(201);

    const clientToken = await login(email, 'Cliente123!');
    const linkReq = await request(app)
      .post('/link-requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ personId: person.id, notes: 'audit failure review test' });
    expect(linkReq.statusCode).toBe(201);

    const initialAuditCount = await prisma.sheetAuditLog.count({
      where: {
        weighingSheetId: sheet.id,
        action: 'LINK_REQUEST_APPROVED',
      },
    });

    const triggerName = uniqueName('fail_link_audit');

    const reviewRes = await withFailTrigger(
      {
        name: triggerName,
        table: '"SheetAuditLog"',
        event: 'INSERT',
        body: `
          IF NEW."weighingSheetId" = ${sheet.id} AND NEW.action = 'LINK_REQUEST_APPROVED' THEN
            RAISE EXCEPTION 'forced link audit failure';
          END IF;
          RETURN NEW;
        `,
      },
      async () =>
        request(app)
          .patch(`/link-requests/${linkReq.body.id}/review`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'APPROVED', notes: 'audit should be best effort' })
    );

    expect(reviewRes.statusCode).toBe(200);

    const refreshedRequest = await prisma.personAccountLinkRequest.findUnique({
      where: { id: linkReq.body.id },
      select: { status: true, reviewedById: true },
    });
    const refreshedUser = await prisma.user.findUnique({
      where: { id: userRes.body.id },
      select: { personId: true },
    });
    const auditCount = await prisma.sheetAuditLog.count({
      where: {
        weighingSheetId: sheet.id,
        action: 'LINK_REQUEST_APPROVED',
      },
    });

    expect(refreshedRequest.status).toBe('APPROVED');
    expect(refreshedRequest.reviewedById).toBeTruthy();
    expect(refreshedUser.personId).toBe(person.id);
    expect(auditCount).toBe(initialAuditCount);
  });
});
