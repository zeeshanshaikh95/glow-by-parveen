import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { trackEvent } from '@/lib/analytics';
import type { CartItem, Product } from '@/types';

const CART_KEY = 'gbp_cart_v1';

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number | null;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, opts?: { variantName?: string | null; quantity?: number }) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed.filter((i) => i && i.productId && i.quantity > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      // Storage full/unavailable — cart simply won't persist.
    }
  }, [items]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback(
    (product: Product, opts: { variantName?: string | null; quantity?: number } = {}) => {
      const variantName = opts.variantName ?? null;
      const quantity = Math.max(1, opts.quantity ?? 1);

      let unitPrice = product.price;
      if (variantName) {
        const variant = product.variants.find((v) => v.name === variantName);
        if (variant) unitPrice = variant.price ?? product.price;
      }

      const key = `${product._id}|${variantName ?? 'default'}`;
      const maxQuantity = 99;

      setItems((prev) => {
        const existing = prev.find((i) => i.key === key);
        if (existing) {
          return prev.map((i) =>
            i.key === key ? { ...i, quantity: Math.min(maxQuantity, i.quantity + quantity) } : i
          );
        }
        const item: CartItem = {
          key,
          productId: product._id,
          slug: product.slug,
          name: product.name,
          image: product.images[0] ?? '',
          unitPrice,
          variantName,
          quantity: Math.min(maxQuantity, quantity),
          maxQuantity,
        };
        return [...prev, item];
      });

      trackEvent({ type: 'cart_add', productSlug: product.slug });
      setIsOpen(true);
    },
    []
  );

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(99, quantity) } : i))
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const count = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const subtotal = useMemo(() => {
    const priced = items.filter((i) => i.unitPrice !== null);
    if (priced.length !== items.length) return null; // some item needs price confirmation
    return priced.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.quantity, 0);
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      count,
      subtotal,
      isOpen,
      openCart,
      closeCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [items, count, subtotal, isOpen, openCart, closeCart, addItem, updateQuantity, removeItem, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
