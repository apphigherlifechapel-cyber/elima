/* eslint-disable @typescript-eslint/no-explicit-any */
import PrismaPackage from "@prisma/client";
import bcrypt from "bcryptjs";

const { PrismaClient } = PrismaPackage as any;
type PrismaClientType = any;
const prisma: PrismaClientType = new PrismaClient();

type SeedProduct = {
  title: string;
  slug: string;
  categorySlug: string;
  brandSlug: string;
  description: string;
  retailPrice: number;
  wholesalePrice: number;
  moq: number;
  stockTotal: number;
  packSize: number;
  image: string;
  color: string;
  sizes: string[];
  isWholesale?: boolean;
};

const categorySeeds = [
  { name: "Clothing", slug: "clothing" },
  { name: "Ladies Wear", slug: "ladies-wear" },
  { name: "Mens Wear", slug: "mens-wear" },
  { name: "Bags", slug: "bags" },
  { name: "Watches", slug: "watches" },
  { name: "Beauty & Makeup", slug: "beauty-makeup" },
  { name: "Accessories", slug: "accessories" },
  { name: "General Goods", slug: "general-goods" },
  { name: "Wholesale Deals", slug: "wholesale-deals" },
];

const brandSeeds = [
  { name: "Elima Studio", slug: "elima-studio" },
  { name: "Sahara Line", slug: "sahara-line" },
  { name: "Verve Atelier", slug: "verve-atelier" },
  { name: "Nexa Time", slug: "nexa-time" },
  { name: "Aura Beauty", slug: "aura-beauty" },
  { name: "Urban Thread", slug: "urban-thread" },
  { name: "Monarch Carry", slug: "monarch-carry" },
  { name: "Crest Essentials", slug: "crest-essentials" },
];

const products: SeedProduct[] = [
  {
    title: "Silk Blend Statement Blazer",
    slug: "silk-blend-statement-blazer",
    categorySlug: "ladies-wear",
    brandSlug: "verve-atelier",
    description: "Tailored premium blazer with structured shoulders and satin-lined finish.",
    retailPrice: 185000,
    wholesalePrice: 132000,
    moq: 6,
    stockTotal: 60,
    packSize: 1,
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1400&q=90",
    color: "Ivory",
    sizes: ["S", "M", "L"],
    isWholesale: true,
  },
  {
    title: "Executive Cotton Shirt",
    slug: "executive-cotton-shirt",
    categorySlug: "mens-wear",
    brandSlug: "urban-thread",
    description: "Premium long-sleeve shirt for office and occasion wear.",
    retailPrice: 82000,
    wholesalePrice: 59000,
    moq: 8,
    stockTotal: 120,
    packSize: 1,
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1400&q=90",
    color: "Sky Blue",
    sizes: ["M", "L", "XL"],
    isWholesale: true,
  },
  {
    title: "Minimalist Midi Dress",
    slug: "minimalist-midi-dress",
    categorySlug: "ladies-wear",
    brandSlug: "elima-studio",
    description: "Soft-flowing midi dress designed for premium casual styling.",
    retailPrice: 126000,
    wholesalePrice: 92000,
    moq: 6,
    stockTotal: 90,
    packSize: 1,
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=90",
    color: "Champagne",
    sizes: ["S", "M", "L"],
    isWholesale: true,
  },
  {
    title: "Premium Denim Jacket",
    slug: "premium-denim-jacket",
    categorySlug: "clothing",
    brandSlug: "urban-thread",
    description: "Heavyweight denim with a refined wash and durable finish.",
    retailPrice: 99000,
    wholesalePrice: 74000,
    moq: 8,
    stockTotal: 110,
    packSize: 1,
    image: "https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=1400&q=90",
    color: "Indigo",
    sizes: ["M", "L", "XL"],
    isWholesale: true,
  },
  {
    title: "Leather Tote Luxe",
    slug: "leather-tote-luxe",
    categorySlug: "bags",
    brandSlug: "monarch-carry",
    description: "Structured leather tote with premium lining and magnetic closure.",
    retailPrice: 164000,
    wholesalePrice: 118000,
    moq: 5,
    stockTotal: 75,
    packSize: 1,
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1400&q=90",
    color: "Tan",
    sizes: ["One Size"],
    isWholesale: true,
  },
  {
    title: "Crossbody Metro Bag",
    slug: "crossbody-metro-bag",
    categorySlug: "bags",
    brandSlug: "monarch-carry",
    description: "Compact crossbody bag with adjustable strap and zip-secured compartments.",
    retailPrice: 89000,
    wholesalePrice: 64000,
    moq: 8,
    stockTotal: 130,
    packSize: 1,
    image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1400&q=90",
    color: "Black",
    sizes: ["One Size"],
    isWholesale: true,
  },
  {
    title: "Chrono Gold Watch",
    slug: "chrono-gold-watch",
    categorySlug: "watches",
    brandSlug: "nexa-time",
    description: "Luxury-inspired chronograph watch with stainless steel frame.",
    retailPrice: 210000,
    wholesalePrice: 155000,
    moq: 4,
    stockTotal: 40,
    packSize: 1,
    image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1400&q=90",
    color: "Gold",
    sizes: ["One Size"],
    isWholesale: true,
  },
  {
    title: "Classic Silver Watch",
    slug: "classic-silver-watch",
    categorySlug: "watches",
    brandSlug: "nexa-time",
    description: "Elegant everyday watch with brushed silver strap.",
    retailPrice: 168000,
    wholesalePrice: 122000,
    moq: 4,
    stockTotal: 55,
    packSize: 1,
    image: "https://images.unsplash.com/photo-1539874754764-5a96559165b0?auto=format&fit=crop&w=1400&q=90",
    color: "Silver",
    sizes: ["One Size"],
    isWholesale: true,
  },
  {
    title: "Radiance Makeup Kit",
    slug: "radiance-makeup-kit",
    categorySlug: "beauty-makeup",
    brandSlug: "aura-beauty",
    description: "Complete pro beauty kit with foundation, blush, and eye palette.",
    retailPrice: 74000,
    wholesalePrice: 51000,
    moq: 12,
    stockTotal: 200,
    packSize: 6,
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1400&q=90",
    color: "Multi",
    sizes: ["Kit"],
    isWholesale: true,
  },
  {
    title: "Velvet Matte Lip Collection",
    slug: "velvet-matte-lip-collection",
    categorySlug: "beauty-makeup",
    brandSlug: "aura-beauty",
    description: "Set of 6 premium matte lip shades with long-wear finish.",
    retailPrice: 52000,
    wholesalePrice: 35000,
    moq: 12,
    stockTotal: 260,
    packSize: 6,
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1400&q=90",
    color: "Multi",
    sizes: ["Set"],
    isWholesale: true,
  },
  {
    title: "Pearl Accent Earrings",
    slug: "pearl-accent-earrings",
    categorySlug: "accessories",
    brandSlug: "sahara-line",
    description: "Elegant pearl drop earrings for formal and casual styling.",
    retailPrice: 36000,
    wholesalePrice: 24000,
    moq: 10,
    stockTotal: 170,
    packSize: 2,
    image: "https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&w=1400&q=90",
    color: "Pearl White",
    sizes: ["One Size"],
    isWholesale: true,
  },
  {
    title: "Signature Sunglasses",
    slug: "signature-sunglasses",
    categorySlug: "accessories",
    brandSlug: "sahara-line",
    description: "UV-protected luxury sunglasses with lightweight frame.",
    retailPrice: 48000,
    wholesalePrice: 33000,
    moq: 10,
    stockTotal: 150,
    packSize: 2,
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1400&q=90",
    color: "Black",
    sizes: ["One Size"],
    isWholesale: true,
  },
  {
    title: "Premium Travel Organizer",
    slug: "premium-travel-organizer",
    categorySlug: "general-goods",
    brandSlug: "crest-essentials",
    description: "Compartmentalized organizer for cosmetics, gadgets, and accessories.",
    retailPrice: 42000,
    wholesalePrice: 30000,
    moq: 15,
    stockTotal: 180,
    packSize: 4,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1400&q=90",
    color: "Sand",
    sizes: ["One Size"],
    isWholesale: true,
  },
  {
    title: "Luxury Home Fragrance Set",
    slug: "luxury-home-fragrance-set",
    categorySlug: "general-goods",
    brandSlug: "crest-essentials",
    description: "Premium candle and diffuser bundle for modern interiors.",
    retailPrice: 68000,
    wholesalePrice: 47000,
    moq: 10,
    stockTotal: 100,
    packSize: 4,
    image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1400&q=90",
    color: "Amber",
    sizes: ["Set"],
    isWholesale: true,
  },
  {
    title: "Athleisure Co-ord Set",
    slug: "athleisure-coord-set",
    categorySlug: "clothing",
    brandSlug: "sahara-line",
    description: "Comfort-focused two-piece set with premium stretch fabric.",
    retailPrice: 94000,
    wholesalePrice: 68000,
    moq: 8,
    stockTotal: 135,
    packSize: 1,
    image: "https://images.unsplash.com/photo-1503341733017-1901578f9f1e?auto=format&fit=crop&w=1400&q=90",
    color: "Olive",
    sizes: ["S", "M", "L"],
    isWholesale: true,
  },
  {
    title: "Monochrome Formal Trousers",
    slug: "monochrome-formal-trousers",
    categorySlug: "mens-wear",
    brandSlug: "urban-thread",
    description: "Tailored formal trousers for business and occasion wear.",
    retailPrice: 76000,
    wholesalePrice: 54000,
    moq: 8,
    stockTotal: 120,
    packSize: 1,
    image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=1400&q=90",
    color: "Charcoal",
    sizes: ["M", "L", "XL"],
    isWholesale: true,
  },
  {
    title: "Weekend Linen Shirt",
    slug: "weekend-linen-shirt",
    categorySlug: "mens-wear",
    brandSlug: "elima-studio",
    description: "Breathable linen shirt with relaxed premium finish.",
    retailPrice: 69000,
    wholesalePrice: 49000,
    moq: 8,
    stockTotal: 140,
    packSize: 1,
    image: "https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?auto=format&fit=crop&w=1400&q=90",
    color: "Off White",
    sizes: ["M", "L", "XL"],
    isWholesale: true,
  },
  {
    title: "Structured Mini Handbag",
    slug: "structured-mini-handbag",
    categorySlug: "bags",
    brandSlug: "monarch-carry",
    description: "Compact structured mini bag with metal clasp closure.",
    retailPrice: 102000,
    wholesalePrice: 73000,
    moq: 6,
    stockTotal: 90,
    packSize: 1,
    image: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1400&q=90",
    color: "Berry",
    sizes: ["One Size"],
    isWholesale: true,
  },
  {
    title: "Precision Grooming Kit",
    slug: "precision-grooming-kit",
    categorySlug: "general-goods",
    brandSlug: "crest-essentials",
    description: "High-quality grooming tools in a portable premium case.",
    retailPrice: 57000,
    wholesalePrice: 39000,
    moq: 10,
    stockTotal: 160,
    packSize: 5,
    image: "https://images.unsplash.com/photo-1490111718993-d98654ce6cf7?auto=format&fit=crop&w=1400&q=90",
    color: "Black",
    sizes: ["Kit"],
    isWholesale: true,
  },
  {
    title: "Wholesale Starter Bundle",
    slug: "wholesale-starter-bundle",
    categorySlug: "wholesale-deals",
    brandSlug: "elima-studio",
    description: "Mixed fast-moving catalog bundle for new wholesale resellers.",
    retailPrice: 450000,
    wholesalePrice: 320000,
    moq: 1,
    stockTotal: 35,
    packSize: 12,
    image: "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?auto=format&fit=crop&w=1400&q=90",
    color: "Mixed",
    sizes: ["Bundle"],
    isWholesale: true,
  },
];

const WHOLESALE_ENABLED_SLUGS = new Set<string>([
  "silk-blend-statement-blazer",
  "executive-cotton-shirt",
  "leather-tote-luxe",
  "chrono-gold-watch",
  "radiance-makeup-kit",
  "velvet-matte-lip-collection",
  "premium-travel-organizer",
  "wholesale-starter-bundle",
]);

const SEEDED_PRODUCT_SLUGS = new Set<string>(products.map((p) => p.slug));
SEEDED_PRODUCT_SLUGS.add("classic-white-tshirt");

async function ensureCatalog() {
  const categoryBySlug: Record<string, { id: string }> = {};
  for (const category of categorySeeds) {
    const created = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
    categoryBySlug[category.slug] = { id: created.id };
  }

  const brandBySlug: Record<string, { id: string }> = {};
  for (const brand of brandSeeds) {
    const created = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: { name: brand.name },
      create: brand,
    });
    brandBySlug[brand.slug] = { id: created.id };
  }

  for (const item of products) {
    const categoryId = categoryBySlug[item.categorySlug]?.id;
    const brandId = brandBySlug[item.brandSlug]?.id;
    if (!categoryId || !brandId) continue;
    const isWholesaleEnabled = WHOLESALE_ENABLED_SLUGS.has(item.slug);

    await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        description: item.description,
        categoryId,
        brandId,
        isRetail: true,
        isWholesale: isWholesaleEnabled,
        retailPrice: item.retailPrice,
        wholesalePrice: item.wholesalePrice,
        moq: item.moq,
        stockTotal: item.stockTotal,
        stockReserved: 0,
        packSize: item.packSize,
        isAvailable: true,
        seoTitle: item.title,
        seoDescription: item.description,
        metaKeywords: `${item.categorySlug},${item.brandSlug},elima-store`,
      },
      create: {
        title: item.title,
        slug: item.slug,
        description: item.description,
        categoryId,
        brandId,
        isRetail: true,
        isWholesale: isWholesaleEnabled,
        retailPrice: item.retailPrice,
        wholesalePrice: item.wholesalePrice,
        moq: item.moq,
        stockTotal: item.stockTotal,
        stockReserved: 0,
        packSize: item.packSize,
        isAvailable: true,
        seoTitle: item.title,
        seoDescription: item.description,
        metaKeywords: `${item.categorySlug},${item.brandSlug},elima-store`,
      },
    });

    const product = await prisma.product.findUnique({ where: { slug: item.slug }, select: { id: true } });
    if (!product) continue;

    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: item.image,
        altText: item.title,
        sortOrder: 0,
      },
    });

    await prisma.priceTier.deleteMany({ where: { productId: product.id } });
    await prisma.priceTier.createMany({
      data: [
        { productId: product.id, minQty: 1, maxQty: Math.max(item.moq - 1, 1), price: item.retailPrice, type: "RETAIL" },
        { productId: product.id, minQty: item.moq, maxQty: item.moq * 2 - 1, price: Math.round((item.wholesalePrice * 1.06) * 100) / 100, type: "WHOLESALE" },
        { productId: product.id, minQty: item.moq * 2, maxQty: item.moq * 4, price: item.wholesalePrice, type: "WHOLESALE" },
      ],
    });

    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
    await prisma.productVariant.createMany({
      data: item.sizes.map((size, idx) => ({
        productId: product.id,
        sku: `${item.slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 14)}-${size.replace(/\s+/g, "").toUpperCase()}-${idx + 1}`,
        size,
        color: item.color,
        stock: Math.max(Math.floor(item.stockTotal / item.sizes.length), 5),
        stockReserved: 0,
        retailPrice: item.retailPrice,
        wholesalePrice: item.wholesalePrice,
        moq: item.moq,
        isAvailable: true,
      })),
    });
  }

  // Enforce retail-first catalog: only explicit wholesale slugs stay wholesale.
  await prisma.product.updateMany({
    where: { slug: { in: Array.from(SEEDED_PRODUCT_SLUGS) } },
    data: { isWholesale: false },
  });
  await prisma.product.updateMany({
    where: { slug: { in: Array.from(WHOLESALE_ENABLED_SLUGS) } },
    data: { isWholesale: true },
  });

  // Repair legacy seed product image so storefront never shows a broken placeholder URL.
  const legacyProduct = await prisma.product.findUnique({
    where: { slug: "classic-white-tshirt" },
    select: { id: true },
  });
  if (legacyProduct) {
    await prisma.productImage.deleteMany({ where: { productId: legacyProduct.id } });
    await prisma.productImage.create({
      data: {
        productId: legacyProduct.id,
        url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1400&q=90",
        altText: "Classic White T-Shirt",
        sortOrder: 0,
      },
    });
  }
}

async function ensureUsersAndOrderSample() {
  const adminPassword = await bcrypt.hash("Admin123!", 10);
  await prisma.user.upsert({
    where: { email: "admin@elima.com" },
    update: {
      name: "Elima Admin",
      password: adminPassword,
      role: "ADMIN",
      accountType: "HYBRID",
      wholesaleStatus: "APPROVED",
    },
    create: {
      name: "Elima Admin",
      email: "admin@elima.com",
      password: adminPassword,
      role: "ADMIN",
      accountType: "HYBRID",
      wholesaleStatus: "APPROVED",
    },
  });

  const staffPassword = await bcrypt.hash("Staff123!", 10);
  const staff = await prisma.user.upsert({
    where: { email: "staff@elima.com" },
    update: {
      name: "Elima Staff",
      password: staffPassword,
      role: "STAFF",
      accountType: "RETAIL",
      wholesaleStatus: "PENDING",
    },
    create: {
      name: "Elima Staff",
      email: "staff@elima.com",
      password: staffPassword,
      role: "STAFF",
      accountType: "RETAIL",
      wholesaleStatus: "PENDING",
    },
  });

  const reviewerPassword = await bcrypt.hash("Reviewer123!", 10);
  const reviewer = await prisma.user.upsert({
    where: { email: "reviewer@elima.com" },
    update: {
      name: "Elima Reviewer",
      password: reviewerPassword,
      role: "CUSTOMER",
      accountType: "RETAIL",
      wholesaleStatus: "PENDING",
    },
    create: {
      name: "Elima Reviewer",
      email: "reviewer@elima.com",
      password: reviewerPassword,
      role: "CUSTOMER",
      accountType: "RETAIL",
      wholesaleStatus: "PENDING",
    },
  });

  const sampleProduct = await prisma.product.findFirst({
    where: { isAvailable: true },
    orderBy: { createdAt: "desc" },
  });
  if (!sampleProduct) return;

  const ensurePaidOrder = async (userId: string) => {
    const existing = await prisma.order.findFirst({
      where: {
        userId,
        status: "PAID",
        items: { some: { productId: sampleProduct.id } },
      },
    });

    if (existing) return;

    const order = await prisma.order.create({
      data: {
        userId,
        type: "RETAIL",
        status: "PAID",
        fulfillmentStatus: "DELIVERED",
        subtotal: Number(sampleProduct.retailPrice),
        tax: 0,
        shipping: 0,
        total: Number(sampleProduct.retailPrice),
        items: {
          create: [
            {
              productId: sampleProduct.id,
              quantity: 1,
              unitPrice: Number(sampleProduct.retailPrice),
              totalPrice: Number(sampleProduct.retailPrice),
            },
          ],
        },
      },
    });

    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: {},
      create: {
        orderId: order.id,
        provider: "MANUAL",
        providerId: `manual-seed-${order.id}`,
        status: "COMPLETED",
        amount: Number(sampleProduct.retailPrice),
        currency: "GHS",
      },
    });
  };

  await ensurePaidOrder(reviewer.id);
  await ensurePaidOrder(staff.id);
}

async function main() {
  await ensureCatalog();
  await ensureUsersAndOrderSample();

  console.log("Seed data created successfully.");
  console.log("Catalog products:", products.length);
  console.log("Admin login: admin@elima.com / Admin123!");
  console.log("Staff login: staff@elima.com / Staff123!");
  console.log("Reviewer login: reviewer@elima.com / Reviewer123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


