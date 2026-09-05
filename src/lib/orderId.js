// Generates short, readable order IDs like GRO-A3F9-K2
export function generateOrderId() {
  const ts   = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `GRO-${ts}-${rand}`;
}
