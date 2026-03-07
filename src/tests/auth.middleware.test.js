describe('authMiddleware', () => {
  async function runMiddleware(req) {
    const { authMiddleware } = await import('../middlewares/auth.middleware.js');

    return new Promise((resolve) => {
      const res = {
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          resolve({ statusCode: this.statusCode, payload });
        },
      };

      authMiddleware(req, res, () => resolve({ next: true, user: req.user }));
    });
  }

  it('rejects missing headers', async () => {
    const result = await runMiddleware({ headers: {} });
    expect(result.statusCode).toBe(401);
  });

  it('accepts valid token', async () => {
    const jwt = await import('jsonwebtoken');
    process.env.JWT_SECRET = 'test-secret';
    const token = jwt.default.sign({ userId: 1, role: 'ADMIN' }, process.env.JWT_SECRET);

    const result = await runMiddleware({ headers: { authorization: `Bearer ${token}` } });
    expect(result.next).toBe(true);
    expect(result.user.userId).toBe(1);
  });
});
