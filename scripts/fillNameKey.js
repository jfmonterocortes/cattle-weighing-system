require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL no está definido en .env");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const makeKey = (s) =>
  String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

async function main() {
  const persons = await prisma.person.findMany({
    select: { id: true, name: true, nameKey: true },
  });

  for (const p of persons) {
    await prisma.person.update({
      where: { id: p.id },
      data: { nameKey: makeKey(p.name) },
    });
  }

  console.log("OK: nameKey filled for", persons.length, "persons");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
