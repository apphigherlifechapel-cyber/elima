export type SearchProduct = {
  id: string;
  title: string;
  description: string;
  brandName?: string | null;
  categoryName?: string | null;
  retailPrice: number;
  stockTotal: number;
  isWholesale: boolean;
  createdAt: Date;
};

const synonymMap: Record<string, string[]> = {
  tshirt: ["t-shirt", "tee", "shirt"],
  makeup: ["beauty", "cosmetic", "cosmetics"],
  bag: ["bags", "handbag", "tote"],
  watch: ["watches", "timepiece"],
  wholesale: ["bulk", "reseller", "b2b"],
};

function tokenize(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function expandTerms(tokens: string[]) {
  const terms = new Set(tokens);
  for (const token of tokens) {
    const synonyms = synonymMap[token] || [];
    for (const synonym of synonyms) terms.add(synonym);
  }
  return Array.from(terms);
}

function score(product: SearchProduct, terms: string[]) {
  const haystack = `${product.title} ${product.description} ${product.brandName || ""} ${product.categoryName || ""}`.toLowerCase();
  let points = 0;

  for (const term of terms) {
    if (product.title.toLowerCase().includes(term)) points += 8;
    if ((product.brandName || "").toLowerCase().includes(term)) points += 4;
    if ((product.categoryName || "").toLowerCase().includes(term)) points += 3;
    if (haystack.includes(term)) points += 2;
  }

  if (product.stockTotal > 0) points += 2;
  if (product.isWholesale) points += 1;
  if (product.createdAt > new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)) points += 1;

  return points;
}

export function runSmartSearch(query: string, products: SearchProduct[]) {
  const tokens = tokenize(query);
  const terms = expandTerms(tokens);
  if (terms.length === 0) return products;

  return products
    .map((product) => ({ product, score: score(product, terms) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);
}
