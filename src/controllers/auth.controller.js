const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../db/prisma');

const createToken = (user) => {
  return jwt.sign(
    { userId: user.id, role: user.role, personId: user.personId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    return res.json({ token: createToken(user) });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

const registerClient = async (req, res) => {
  try {
    const { cedula, name, phone, email, password } = req.body;

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) return res.status(409).json({ message: 'Email already exists' });

    const person = await prisma.person.upsert({
      where: { cedula },
      update: { name, phone },
      create: { cedula, name, phone },
    });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        role: 'CLIENT',
        personId: person.id,
      },
    });

    return res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { login, registerClient };
