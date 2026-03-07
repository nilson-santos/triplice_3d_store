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
    syncCartWithServer: () => Promise<void>;
    setIsAuthenticated: (val: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // We start by loading the local cart.
    const [items, setItems] = useState<CartItem[]>(() => {
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
        }
    };

    const syncCartWithServer = async () => {
        // Called explicitly right after login logic completes
        // Takes local cart, pushes to DB, updates state.
        const localSaved = localStorage.getItem('cart');
        if (localSaved) {
            const localItems: CartItem[] = JSON.parse(localSaved);
            if (localItems.length > 0) {
                const payload = localItems.map(i => ({ product_id: i.id, quantity: i.quantity }));
                try {
                    const data = await syncCartDB(payload);
                    const mappedItems: CartItem[] = data.items.map(i => ({
                        ...i.product,
                        quantity: i.quantity,
                        cartItemId: i.id
                    }));
                    setItems(mappedItems);
                } catch (error) {
                    console.error("Failed to sync cart", error);
                }
            } else {
                await loadDbCart(); // If local was empty, just fetch the existing db cart.
            }
        } else {
            await loadDbCart();
        }
        localStorage.removeItem('cart');
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

    // Update local storage only if NOT authenticated.
    // When authenticated, the source of truth is the backend.
    useEffect(() => {
        if (!isAuthenticated) {
            localStorage.setItem('cart', JSON.stringify(items));
        }
    }, [items, isAuthenticated]);

    // Fetch the DB cart when authentication state changes to True
    useEffect(() => {
        if (isAuthenticated) {
            loadDbCart();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const handleLogin = () => {
            setIsAuthenticated(true);
            syncCartWithServer();
        };

        const handleLogout = () => {
            setIsAuthenticated(false);
            clearCart();
        };

        window.addEventListener('auth_login', handleLogin);
        window.addEventListener('auth_logout', handleLogout);

        return () => {
            window.removeEventListener('auth_login', handleLogin);
            window.removeEventListener('auth_logout', handleLogout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


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
        <CartContext.Provider value={{ items, addToCart, removeFromCart, decreaseQuantity, clearCart, total, syncCartWithServer, setIsAuthenticated }}>
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
