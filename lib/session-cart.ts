const CART_KEY = 'unstash_cart_session';

export interface SessionCartItem {
  listing_id: string;
  added_at: number;
}

export function getSessionCart(): SessionCartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToSessionCart(listing_id: string): void {
  const cart = getSessionCart();
  if (cart.some(item => item.listing_id === listing_id)) {
    return;
  }
  cart.push({ listing_id, added_at: Date.now() });
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function removeFromSessionCart(listing_id: string): void {
  const cart = getSessionCart();
  const updated = cart.filter(item => item.listing_id !== listing_id);
  localStorage.setItem(CART_KEY, JSON.stringify(updated));
}

export function clearSessionCart(): void {
  localStorage.removeItem(CART_KEY);
}

export function getSessionCartCount(): number {
  return getSessionCart().length;
}
