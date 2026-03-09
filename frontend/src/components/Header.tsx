import { ShoppingCart, Search, X, Menu, UserCircle, LogOut, Package, Heart, Shield } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { CartDrawer } from './CartDrawer';
import { CheckoutErrorBoundary } from './CheckoutErrorBoundary';
import { CheckoutModal } from './CheckoutModal';
import { MenuDrawer } from './MenuDrawer';
import logo from '../assets/logo.png';
import { AnimatePresence, motion } from 'framer-motion';
import { getCategories } from '../api';
import type { Category } from '../api';
import type { FlyToCartDetail } from '../utils/cartFlyToCart';

interface FlyingCartToken {
    id: number;
    image?: string | null;
    originX: number;
    originY: number;
    targetX: number;
    targetY: number;
}

export const Header = () => {
    const { items } = useCart();
    const { isAuthenticated, user, openAuthModal, logout } = useAuth();
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const cartButtonRef = useRef<HTMLButtonElement>(null);
    const pendingFlyFeedbackRef = useRef(false);
    const badgeSyncTimeoutRef = useRef<number | null>(null);

    const [categories, setCategories] = useState<Category[]>([]);
    const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
    const [showCartFeedback, setShowCartFeedback] = useState(false);
    const [flyingTokens, setFlyingTokens] = useState<FlyingCartToken[]>([]);
    const adminUrl = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000/api' : 'https://triplice3d.com.br/api')).replace(/\/api\/?$/, '/admin/');
    const totalItemsInCart = items.reduce((sum, item) => sum + item.quantity, 0);
    const distinctItemsInCart = items.length;
    const prevCartCountRef = useRef(totalItemsInCart);
    const prevDistinctItemsRef = useRef(distinctItemsInCart);
    const latestDistinctItemsRef = useRef(distinctItemsInCart);
    const [displayedDistinctItems, setDisplayedDistinctItems] = useState(distinctItemsInCart);

    const selectedCategory = searchParams.get('category');

    useEffect(() => {
        getCategories()
            .then(data => {
                setCategories(data);
                if (!searchParams.get('category')) {
                    const defaultCat = data.find(c => c.is_default);
                    if (defaultCat) {
                        setSearchParams(prev => {
                            const next = new URLSearchParams(prev);
                            next.set('category', String(defaultCat.id));
                            return next;
                        }, { replace: true });
                    }
                }
            })
            .catch(console.error);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

    useEffect(() => {
        const triggerCartFeedback = () => {
            setShowCartFeedback(true);
            window.setTimeout(() => setShowCartFeedback(false), 1200);
        };

        if (totalItemsInCart > prevCartCountRef.current) {
            if (!pendingFlyFeedbackRef.current) {
                triggerCartFeedback();
            }
            prevCartCountRef.current = totalItemsInCart;
            return;
        }
        prevCartCountRef.current = totalItemsInCart;
    }, [totalItemsInCart]);

    useEffect(() => {
        latestDistinctItemsRef.current = distinctItemsInCart;

        if (distinctItemsInCart < prevDistinctItemsRef.current) {
            if (badgeSyncTimeoutRef.current) {
                window.clearTimeout(badgeSyncTimeoutRef.current);
                badgeSyncTimeoutRef.current = null;
            }
            setDisplayedDistinctItems(distinctItemsInCart);
        } else if (distinctItemsInCart > prevDistinctItemsRef.current && !pendingFlyFeedbackRef.current) {
            setDisplayedDistinctItems(distinctItemsInCart);
        }

        prevDistinctItemsRef.current = distinctItemsInCart;
    }, [distinctItemsInCart]);

    useEffect(() => {
        const handleFlyToCart = (event: Event) => {
            if (!cartButtonRef.current) return;

            const customEvent = event as CustomEvent<FlyToCartDetail>;
            const cartRect = cartButtonRef.current.getBoundingClientRect();
            const tokenId = Date.now() + Math.floor(Math.random() * 1000);
            pendingFlyFeedbackRef.current = true;

            setFlyingTokens(prev => [
                ...prev,
                {
                    id: tokenId,
                    image: customEvent.detail.image,
                    originX: customEvent.detail.originX,
                    originY: customEvent.detail.originY,
                    targetX: cartRect.left + cartRect.width / 2,
                    targetY: cartRect.top + cartRect.height / 2,
                }
            ]);

            if (badgeSyncTimeoutRef.current) {
                window.clearTimeout(badgeSyncTimeoutRef.current);
            }

            badgeSyncTimeoutRef.current = window.setTimeout(() => {
                setDisplayedDistinctItems(latestDistinctItemsRef.current);
                setShowCartFeedback(true);
                window.setTimeout(() => setShowCartFeedback(false), 1200);
                pendingFlyFeedbackRef.current = false;
                badgeSyncTimeoutRef.current = null;
            }, 760);

            window.setTimeout(() => {
                setFlyingTokens(prev => prev.filter(token => token.id !== tokenId));
            }, 850);
        };

        window.addEventListener('triplice:fly-to-cart', handleFlyToCart as EventListener);
        return () => {
            window.removeEventListener('triplice:fly-to-cart', handleFlyToCart as EventListener);
            if (badgeSyncTimeoutRef.current) {
                window.clearTimeout(badgeSyncTimeoutRef.current);
            }
        };
    }, []);

    const handleHomeClick = (e: React.MouseEvent) => {
        if (location.pathname === '/') {
            e.preventDefault();
            setSearchInput('');
            setSearchParams({}, { replace: true });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault();

        // Se temos um termo, buscar globalmente em '/?search=...'
        // Se estamos APENAS limpando a busca e já estamos na home, mantemos a navegação normal.
        if (location.pathname !== '/') {
            const next = new URLSearchParams();
            if (searchInput.trim()) {
                next.set('search', searchInput.trim());
            }
            // Remove a categoria de qualquer forma forçando a busca global
            navigate(`/?${next.toString()}`);
            setIsSearchOpen(false);
            return;
        }

        // Se já estamos na home:
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (searchInput.trim()) {
                next.set('search', searchInput.trim());
            } else {
                next.delete('search');
            }
            // Sempre remove a categoria ao fazer uma nova busca para buscar em tudo
            next.delete('category');
            return next;
        });
        setIsSearchOpen(false);
    }, [searchInput, location.pathname, navigate, setSearchParams]);

    const clearSearch = useCallback(() => {
        setSearchInput('');
        if (location.pathname !== '/') {
            // Volta pra home sem busca e sem categoria se limpar a partir de outra pág
            navigate('/');
            return;
        }
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('search');
            return next;
        });
    }, [setSearchParams, location.pathname, navigate]);

    const handleCategorySelect = useCallback((categoryId: number | null) => {
        // Limpa a barra de busca visualmente
        setSearchInput('');
        setIsSearchOpen(false);

        if (location.pathname !== '/') {
            const next = new URLSearchParams();
            if (categoryId !== null) {
                next.set('category', String(categoryId));
            }
            // Navega pra home apenas com a categoria
            navigate(`/?${next.toString()}`);
            return;
        }

        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            // Sempre que clica em uma categoria, a busca por texto é desfeita
            next.delete('search');

            if (categoryId !== null) {
                next.set('category', String(categoryId));
            } else {
                next.delete('category');
            }
            return next;
        });
    }, [location.pathname, navigate, setSearchParams]);

    return (
        <>
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
                {/* Main bar */}
                <div className="relative z-40 max-w-7xl mx-auto px-4 h-14 sm:h-16 flex items-center gap-3 sm:gap-4">
                    {/* Mobile: hamburger LEFT of logo */}
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="sm:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full transition"
                        aria-label="Menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Logo */}
                    <Link
                        to="/"
                        onClick={handleHomeClick}
                        className="flex items-center gap-2 font-bold text-xl tracking-tight shrink-0"
                    >
                        <img src={logo} alt="Triplice 3D" className="h-8 sm:h-10 w-auto" />
                    </Link>

                    {/* Desktop: full search bar */}
                    <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-xl mx-auto">
                        <div className="flex items-center w-full bg-gray-50 border border-gray-200 rounded-full overflow-hidden focus-within:ring-2 focus-within:ring-black/5 focus-within:border-gray-300 transition-all">
                            <div className="pl-4 text-gray-400">
                                <Search size={18} />
                            </div>
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Buscar produtos..."
                                className="flex-1 px-3 py-2 text-sm bg-transparent outline-none placeholder-gray-400"
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="px-2 text-gray-400 hover:text-gray-600 transition"
                                >
                                    <X size={16} />
                                </button>
                            )}
                            <button
                                type="submit"
                                className="px-4 py-2 bg-black text-white text-sm font-medium rounded-r-full hover:bg-gray-800 transition"
                            >
                                Buscar
                            </button>
                        </div>
                    </form>

                    <nav className="hidden md:flex items-center gap-6 font-medium text-gray-600 ml-4">
                        <Link
                            to="/"
                            onClick={handleHomeClick}
                            className="hover:text-black transition"
                        >
                            Início
                        </Link>
                        <Link
                            to="/#contact"
                            className="hover:text-black transition"
                        >
                            Contato
                        </Link>
                    </nav>

                    {/* Right side icons */}
                    <div className="relative z-50 flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
                        {/* Mobile: search icon toggle */}
                        <button
                            onClick={() => setIsSearchOpen(!isSearchOpen)}
                            className="sm:hidden p-2 hover:bg-gray-100 rounded-full transition"
                            aria-label="Buscar"
                        >
                            <Search className="w-5 h-5" />
                        </button>

                        {/* User Account / Auth */}
                        {!isAuthenticated ? (
                            <div className="hidden sm:flex items-center gap-2 mr-2">
                                <button onClick={() => openAuthModal('login')} className="text-sm bg-black text-white px-5 py-1.5 rounded-full font-bold hover:bg-gray-800 transition flex items-center gap-1.5">
                                    <UserCircle size={16} /> Entrar
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition flex items-center gap-1.5"
                                    aria-label="Conta"
                                >
                                    <UserCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                                    <span className="hidden sm:block text-sm font-medium">{user?.name?.split(' ')[0]}</span>
                                </button>

                                {isUserMenuOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-2 flex flex-col z-50">
                                        <div className="px-4 py-2 border-b border-gray-100 mb-1">
                                            <p className="text-sm font-bold truncate">{user?.name}</p>
                                        </div>
                                        <button
                                            onClick={() => { setIsUserMenuOpen(false); navigate('/rastrear-pedido'); }}
                                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-left"
                                        >
                                            <Package size={16} />
                                            Meus Pedidos
                                        </button>
                                        <button
                                            onClick={() => { setIsUserMenuOpen(false); navigate('/favoritos'); }}
                                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-left"
                                        >
                                            <Heart size={16} />
                                            Favoritos
                                        </button>
                                        {user?.is_staff && (
                                            <>
                                                <button
                                                    onClick={() => { setIsUserMenuOpen(false); window.location.href = adminUrl; }}
                                                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-left"
                                                >
                                                    <Shield size={16} />
                                                    Administração
                                                </button>
                                                <button
                                                    onClick={() => { setIsUserMenuOpen(false); navigate('/admin/price-tags'); }}
                                                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-left"
                                                >
                                                    <Shield size={16} />
                                                    Etiquetas de Preço
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => { setIsUserMenuOpen(false); logout(); }}
                                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-left"
                                        >
                                            <LogOut size={16} />
                                            Sair
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mobile Auth Button (Icon Only) */}
                        {!isAuthenticated && (
                            <button
                                onClick={() => openAuthModal('login')}
                                className="sm:hidden p-2 hover:bg-gray-100 rounded-full transition"
                                aria-label="Login"
                            >
                                <UserCircle className="w-5 h-5" />
                            </button>
                        )}


                        {/* Cart */}
                        <motion.button
                            ref={cartButtonRef}
                            onClick={() => setIsCartOpen(true)}
                            className="relative p-2 hover:bg-gray-100 rounded-full transition"
                            animate={showCartFeedback ? { scale: [1, 1.18, 0.96, 1], rotate: [0, -8, 8, 0] } : { scale: 1, rotate: 0 }}
                            transition={{ duration: 0.55, ease: 'easeOut' }}
                        >
                            <ShoppingCart className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${showCartFeedback ? 'text-emerald-600' : ''}`} />
                            <AnimatePresence>
                                {showCartFeedback && (
                                    <>
                                        <motion.span
                                            initial={{ scale: 0.4, opacity: 0.35 }}
                                            animate={{ scale: 1.9, opacity: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.6, ease: 'easeOut' }}
                                            className="absolute inset-0 rounded-full border-2 border-emerald-400 pointer-events-none"
                                        />
                                        <motion.span
                                            initial={{ opacity: 0, y: 4, scale: 0.9 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -6, scale: 0.92 }}
                                            transition={{ duration: 0.22, ease: 'easeOut' }}
                                            className="absolute right-0 top-full mt-2 whitespace-nowrap rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg"
                                        >
                                            Adicionado
                                        </motion.span>
                                    </>
                                )}
                            </AnimatePresence>
                            {displayedDistinctItems > 0 && (
                                <motion.span
                                    key={displayedDistinctItems}
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                    className={`absolute -top-1 -right-1 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full ${showCartFeedback ? 'bg-emerald-600' : 'bg-black'}`}
                                >
                                    {displayedDistinctItems}
                                </motion.span>
                            )}
                        </motion.button>
                    </div>
                </div>

                {/* Mobile: expandable search overlay */}
                <AnimatePresence>
                    {isSearchOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="sm:hidden overflow-hidden border-t border-gray-100"
                        >
                            <form onSubmit={handleSearch} className="px-4 py-3">
                                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full overflow-hidden focus-within:ring-2 focus-within:ring-black/5 focus-within:border-gray-300 transition-all">
                                    <div className="pl-4 text-gray-400">
                                        <Search size={18} />
                                    </div>
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        placeholder="Buscar produtos..."
                                        className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none placeholder-gray-400"
                                    />
                                    {searchInput && (
                                        <button
                                            type="button"
                                            onClick={clearSearch}
                                            className="px-2 text-gray-400 hover:text-gray-600 transition"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="px-4 py-2.5 bg-black text-white text-sm font-medium rounded-r-full hover:bg-gray-800 transition"
                                    >
                                        Buscar
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Categories sub-bar — flat text tabs, horizontally scrollable */}
                <div className="relative z-10 border-t border-gray-50 bg-white/60 backdrop-blur-sm">
                    <div className="max-w-7xl mx-auto px-4 flex items-center gap-0 overflow-x-auto sm:overflow-x-visible scrollbar-hide touch-pan-x sm:justify-center">
                        <button
                            onClick={() => handleCategorySelect(null)}
                            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${!selectedCategory
                                ? 'text-black border-black'
                                : 'text-gray-500 border-transparent hover:text-gray-800'
                                }`}
                        >
                            Todos
                        </button>
                        {categories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => handleCategorySelect(category.id)}
                                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${selectedCategory === String(category.id)
                                    ? 'text-black border-black'
                                    : 'text-gray-500 border-transparent hover:text-gray-800'
                                    }`}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Drawers */}
            <AnimatePresence>
                {isMenuOpen && (
                    <MenuDrawer onClose={() => setIsMenuOpen(false)} />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCartOpen && (
                    <CartDrawer
                        onClose={() => setIsCartOpen(false)}
                        onCheckout={() => setIsCheckoutOpen(true)}
                    />
                )}
            </AnimatePresence>

            <CheckoutErrorBoundary>
                <CheckoutModal
                    isOpen={isCheckoutOpen}
                    onClose={() => setIsCheckoutOpen(false)}
                />
            </CheckoutErrorBoundary>

            <AnimatePresence>
                {flyingTokens.map(token => (
                    <motion.div
                        key={token.id}
                        initial={{
                            x: token.originX - 28,
                            y: token.originY - 28,
                            scale: 1,
                            opacity: 1,
                        }}
                        animate={{
                            x: [token.originX - 28, token.originX - 10, token.targetX - 10],
                            y: [token.originY - 28, token.originY - 92, token.targetY - 10],
                            scale: [1, 0.92, 0.38],
                            opacity: [1, 1, 0.2],
                            rotate: [0, 10, -12, 0],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
                        className="pointer-events-none fixed left-0 top-0 z-[140] h-14 w-14 overflow-hidden rounded-full border-2 border-white bg-white shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
                    >
                        {token.image ? (
                            <img src={token.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-black text-white">
                                <ShoppingCart size={22} />
                            </div>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </>
    );
};
