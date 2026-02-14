import { ShoppingCart, Search, X, Menu } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { CartDrawer } from './CartDrawer';
import { MenuDrawer } from './MenuDrawer';
import logo from '../assets/logo.png';
import { AnimatePresence, motion } from 'framer-motion';
import { getCategories } from '../api';
import type { Category } from '../api';

export const Header = () => {
    const { items } = useCart();
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [categories, setCategories] = useState<Category[]>([]);
    const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

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

    const handleHomeClick = (e: React.MouseEvent) => {
        if (location.pathname === '/') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (searchInput.trim()) {
                next.set('search', searchInput.trim());
            } else {
                next.delete('search');
            }
            return next;
        });
        setIsSearchOpen(false);
    }, [searchInput, setSearchParams]);

    const clearSearch = useCallback(() => {
        setSearchInput('');
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('search');
            return next;
        });
    }, [setSearchParams]);

    const handleCategorySelect = useCallback((categoryId: number | null) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (categoryId !== null) {
                next.set('category', String(categoryId));
            } else {
                next.delete('category');
            }
            return next;
        });
    }, [setSearchParams]);

    return (
        <>
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
                {/* Main bar */}
                <div className="max-w-7xl mx-auto px-4 h-14 sm:h-16 flex items-center gap-3 sm:gap-4">
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

                    {/* Desktop Navigation */}
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
                    <div className="flex items-center gap-1 ml-auto shrink-0">
                        {/* Mobile: search icon toggle */}
                        <button
                            onClick={() => setIsSearchOpen(!isSearchOpen)}
                            className="sm:hidden p-2 hover:bg-gray-100 rounded-full transition"
                            aria-label="Buscar"
                        >
                            <Search className="w-5 h-5" />
                        </button>

                        {/* Cart */}
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="relative p-2 hover:bg-gray-100 rounded-full transition"
                        >
                            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                            {items.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-black text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                                    {items.length}
                                </span>
                            )}
                        </button>
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
                <div className="border-t border-gray-50 bg-white/60 backdrop-blur-sm">
                    <div className="max-w-7xl mx-auto px-4 flex items-center gap-0 overflow-x-auto scrollbar-hide touch-pan-x">
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
                    <CartDrawer onClose={() => setIsCartOpen(false)} />
                )}
            </AnimatePresence>
        </>
    );
};
