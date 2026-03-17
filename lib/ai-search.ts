import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db/prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

export async function generateProductEmbedding(text: string): Promise<number[]> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not found. Skipping embedding generation.");
    return [];
  }
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function semanticSearch(query: string, limit = 10) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("AI Search is currently disabled (missing credentials).");
  }

  const queryEmbedding = await generateProductEmbedding(query);
  if (queryEmbedding.length === 0) return [];

  // Use raw SQL to perform vector similarity search
  // pgvector uses <=> for cosine distance
  const products = await prisma.$queryRawUnsafe(`
    SELECT 
      p.id, p.title, p.description, p.slug, p."retailPrice",
      1 - (p.embedding <=> '[${queryEmbedding.join(",")}]'::vector) as similarity
    FROM "Product" p
    WHERE p.embedding IS NOT NULL AND p."isAvailable" = true
    ORDER BY similarity DESC
    LIMIT ${limit};
  `);

  return products;
}

export async function updateAllProductEmbeddings() {
  const products = await prisma.product.findMany();
  
  for (const product of products) {
    const textToEmbed = `${product.title} ${product.description}`;
    const embedding = await generateProductEmbedding(textToEmbed);
    
    if (embedding.length > 0) {
      await prisma.$executeRawUnsafe(
        'UPDATE "Product" SET embedding = $1::vector WHERE id = $2',
        `[${embedding.join(",")}]`,
        product.id
      );
    }
  }
}
