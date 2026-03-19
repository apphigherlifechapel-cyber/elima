import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, slug: true, title: true }
  })
  console.log("Found products:", products)
}
main().finally(() => prisma.$disconnect())
