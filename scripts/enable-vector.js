const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Enabling vector extension on Supabase...");
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');
  console.log("Extension 'vector' enabled successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
