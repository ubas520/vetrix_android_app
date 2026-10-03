export const money = (value) => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const orderStatus = (order) => ({ placed: 'Order placed', ready: 'Ready for pickup', completed: 'Collected', cancelled: 'Cancelled' }[order.status] || order.status);
export const paymentStatus = (order) => ({ paid: 'Paid', under_review: 'Awaiting verification', rejected: 'Proof needs attention', pending: order.payment_method === 'clinic' ? 'Pay on pickup' : 'Awaiting payment proof' }[order.payment_status] || order.payment_status);
export const canBuy = (product) => product && product.price > 0 && product.stockQty > 0 && ['available', 'low_stock'].includes(product.status);
export const checkoutRequestKey = () => `mobile_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
