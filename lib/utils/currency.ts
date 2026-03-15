export function formatCedis(amount: number): string {
  return `GHS ${amount.toFixed(2)}`;
}

export const formatNaira = formatCedis;

