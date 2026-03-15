export type Warehouse = {
  id: string;
  name: string;
  city: string;
  coverage: string[];
};

const warehouses: Warehouse[] = [
  { id: "wh_accra", name: "Accra Fulfillment Hub", city: "Accra", coverage: ["Greater Accra", "Eastern", "Central"] },
  { id: "wh_kumasi", name: "Kumasi Fulfillment Hub", city: "Kumasi", coverage: ["Ashanti", "Bono", "Ahafo"] },
  { id: "wh_takoradi", name: "Takoradi Fulfillment Hub", city: "Takoradi", coverage: ["Western", "Western North"] },
];

export function chooseWarehouse(shippingState: string) {
  const normalized = shippingState.trim().toLowerCase();
  const match = warehouses.find((warehouse) => warehouse.coverage.some((region) => region.toLowerCase() === normalized));
  return match || warehouses[0];
}

export function listWarehouses() {
  return warehouses;
}
