import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { AuthModal } from '../components/AuthModal';
import { fetchFavorites, toggleFavoriteAPI } from '../api';

export interface User {
    name: string;
    email: string;
    email_verified: boolean;
    is_staff: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string, name: string, email: string, verified: boolean, isStaff: boolean) => void;
    logout: () => void;
    openAuthModal: (view?: 'login' | 'register') => void;
    closeAuthModal: () => void;
    favoriteIds: number[];
    toggleFav: (productId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem('auth_user');
        if (storedUser) {
            try {
                return JSON.parse(storedUser);
            } catch {
                localStorage.removeItem('auth_user');
            }
        }
        return null;
    });
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
    const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

    // Modal state
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [authView, setAuthView] = useState<'login' | 'register'>('login');

    const loadFavorites = async () => {
        try {
            const ids = await fetchFavorites();
            setFavoriteIds(ids);
        } catch (_error) {
            console.error('Failed to load favorites', _error);
        }
    };

    useEffect(() => {
        if (token) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            loadFavorites();
        } else {
            setFavoriteIds([]);
        }
    }, [token]);

    const toggleFav = async (productId: number) => {
        if (!token) {
            openAuthModal('login');
            return;
        }

        // Optimistic update
        setFavoriteIds(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );

        try {
            await toggleFavoriteAPI(productId);
        } catch (error) {
            console.error('Failed to toggle favorite', error);
            // Revert optimistic update
            setFavoriteIds(prev =>
                prev.includes(productId)
                    ? prev.filter(id => id !== productId)
                    : [...prev, productId]
            );
        }
    };

    const login = (newToken: string, name: string, email: string, verified: boolean, isStaff: boolean) => {
        const newUser: User = { name, email, email_verified: verified, is_staff: isStaff };

        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('auth_user', JSON.stringify(newUser));

        setToken(newToken);
        setUser(newUser);

        // Dispatch custom event to let CartContext know about the login sync without cyclical dependencies
        window.dispatchEvent(new Event('auth_login'));
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');

        setToken(null);
        setUser(null);

        // Dispatch custom event for logout
        window.dispatchEvent(new Event('auth_logout'));
        // Optionally redirect or clear other states
    };

    const openAuthModal = (view: 'login' | 'register' = 'login') => {
        setAuthView(view);
        setIsAuthOpen(true);
    };

    const closeAuthModal = () => {
        setIsAuthOpen(false);
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isAuthenticated: !!token,
            login,
            logout,
            openAuthModal,
            closeAuthModal,
            favoriteIds,
            toggleFav
        }}>
            {children}
            <AuthModal isOpen={isAuthOpen} onClose={closeAuthModal} initialView={authView} />
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
