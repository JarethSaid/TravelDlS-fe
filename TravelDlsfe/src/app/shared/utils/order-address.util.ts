type OrderAddressSource = {
  details?: Array<{ deliveryAddress?: string | null }> | null;
  client?: { address?: string | null } | null;
};

export function resolveOrderDeliveryAddress(order: OrderAddressSource | null | undefined): string {
  const deliveryAddress = order?.details?.[0]?.deliveryAddress?.trim();
  if (deliveryAddress) return deliveryAddress;

  const clientAddress = order?.client?.address?.trim();
  if (clientAddress) return clientAddress;

  return 'Sin dirección';
}
