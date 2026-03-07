import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
    getCartDB,
    syncCartDB,
    addToCartDB,
    updateCartItemDB,
    removeFromCartDB,
    clearCartDB
} from '../api';
import type { Product } from '../api';
import { useAuth } from './AuthContext';

export interface CartItem extends Product {
    quantity: number;
    cartItemId?: number; // Added to store backend item ID
}

interface CartContextType {
    items: CartItem[];
    addToCart: (product: Product, quantity?: number) => Promise<void>;
    removeFromCart: (productId: number, cartItemId?: number) => Promise<void>;
    decreaseQuantity: (productId: number, cartItemId?: number) => Promise<void>;
    clearCart: () => Promise<void>;
    total: number;
    isSyncing: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [items, setItems] = useState<CartItem[]>(() => {
        if (localStorage.getItem('auth_token')) {
            return [];
        }
        const saved = localStorage.getItem('cart');
        return saved ? JSON.parse(saved) : [];
    });

    const loadDbCart = async () => {
        try {
            const data = await getCartDB();
            const mappedItems: CartItem[] = data.items.map(i => ({
                ...i.product,
                quantity: i.quantity,
                cartItemId: i.id
            }));
            setItems(mappedItems);
            // Once we have the DB cart, we clear the local storage one to avoid confusion.
            localStorage.removeItem('cart');
        } catch (error) {
            console.error("Failed to load DB cart", error);
        } finally {
            setIsSyncing(false);
        }
    };

    const clearCart = async () => {
        if (isAuthenticated) {
            try {
                await clearCartDB();
                setItems([]);
            } catch (e) {
                console.error("Failed to clear DB cart", e);
            }
        } else {
            setItems([]);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) {
            if (items.length > 0) {
                localStorage.setItem('cart', JSON.stringify(items));
            } else {
                localStorage.removeItem('cart');
            }
        }
    }, [items, isAuthenticated]);

    useEffect(() => {
        let isMounted = true;

        const hydrateCart = async () => {
            if (isAuthenticated) {
                if (isMounted) {
                    setIsSyncing(true);
                }
                const localSaved = localStorage.getItem('cart');

                if (localSaved) {
                    const localItems: CartItem[] = JSON.parse(localSaved);
                    if (localItems.length > 0) {
                        const payload = localItems.map(item => ({ product_id: item.id, quantity: item.quantity }));
                        try {
                            const data = await syncCartDB(payload);
                            if (isMounted) {
                                setItems(data.items.map(item => ({
                                    ...item.product,
                                    quantity: item.quantity,
                                    cartItemId: item.id
                                })));
                            }
                            localStorage.removeItem('cart');
                        } catch (error) {
                            console.error("Failed to sync cart", error);
                        } finally {
                            if (isMounted) {
                                setIsSyncing(false);
                            }
                        }
                        return;
                    }
                }

                await loadDbCart();
                if (isMounted) {
                    setIsSyncing(false);
                }
                return;
            }

            localStorage.removeItem('cart');
            if (isMounted) {
                setItems([]);
                setIsSyncing(false);
            }
        };

        void hydrateCart();

        return () => {
            isMounted = false;
        };
    }, [isAuthenticated]);


    const addToCart = async (product: Product, quantity: number = 1) => {
        if (isAuthenticated) {
            try {
                const data = await addToCartDB(product.id, quantity);
                setItems(data.items.map(i => ({
                    ...i.product,
                    quantity: i.quantity,
                    cartItemId: i.id
                })));
            } catch (error) {
                console.error("Failed to add to DB cart", error);
            }
        } else {
            setItems(prev => {
                const existing = prev.find(i => i.id === product.id);
                if (existing) {
                    return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i);
                }
                return [...prev, { ...product, quantity }];
            });
        }
    };

    const removeFromCart = async (productId: number, cartItemId?: number) => {
        if (isAuthenticated && cartItemId) {
            try {
                const data = await removeFromCartDB(cartItemId);
                setItems(data.items.map(i => ({
                    ...i.product,
                    quantity: i.quantity,
                    cartItemId: i.id
                })));
            } catch (error) {
                console.error("Failed to remove from DB cart", error);
            }
        } else {
            setItems(prev => prev.filter(i => i.id !== productId));
        }
    };

    const decreaseQuantity = async (productId: number, cartItemId?: number) => {
        if (isAuthenticated && cartItemId) {
            const existing = items.find(i => i.id === productId);
            if (existing) {
                try {
                    if (existing.quantity > 1) {
                        const data = await updateCartItemDB(cartItemId, existing.quantity - 1);
                        setItems(data.items.map(i => ({
                            ...i.product,
                            quantity: i.quantity,
                            cartItemId: i.id
                        })));
                    } else {
                        const data = await removeFromCartDB(cartItemId);
                        setItems(data.items.map(i => ({
                            ...i.product,
                            quantity: i.quantity,
                            cartItemId: i.id
                        })));
                    }
                } catch (e) {
                    console.error("Failed to decrease quantity DB", e);
                }
            }
        } else {
            setItems(prev => {
                const existing = prev.find(i => i.id === productId);
                if (existing && existing.quantity > 1) {
                    return prev.map(i => i.id === productId ? { ...i, quantity: i.quantity - 1 } : i);
                }
                return prev.filter(i => i.id !== productId);
            });
        }
    };


    const total = items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, decreaseQuantity, clearCart, total, isSyncing }}>
            {children}
        </CartContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
};
