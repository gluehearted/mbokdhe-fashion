export interface CustomerOrderSummary {
  createdAt?: string;
  status: string;
  totalPrice?: number | null;
  shippingCost?: number | null;
  products?: { price?: number | null; discount?: number | null }[] | null;
}

export function customerStatistics(orders: readonly CustomerOrderSummary[] | null | undefined) {
  const settled = (orders || []).filter(order => ["Siap Kirim", "Siap_Kirim", "Siap Packing", "Dikirim", "Shipped"].includes(order.status));
  return {
    totalTransactions: settled.length,
    totalSpending: settled.reduce((sum, order) => sum + (order.products?.length
      ? order.products.reduce((net, product) => net + Math.max(0, (product.price || 0) - (product.discount || 0)), 0) + (order.shippingCost || 0)
      : order.totalPrice || 0), 0),
  };
}
