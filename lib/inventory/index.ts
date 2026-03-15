export function reserveStock(current: number, reserved: number, quantity: number) {
  const available = current - reserved;
  if (quantity > available) throw new Error("Insufficient stock");
  return {
    stockTotal: current,
    stockReserved: reserved + quantity,
    stockAvailable: available - quantity,
  };
}

export function releaseStock(current: number, reserved: number, quantity: number) {
  return {
    stockTotal: current,
    stockReserved: Math.max(0, reserved - quantity),
    stockAvailable: current - Math.max(0, reserved - quantity),
  };
}
