import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import type { Product } from '../api';
import { ProductCard } from '../components/ProductCard';
import { ProductSkeleton } from '../components/ProductSkeleton';
import { BannerCarousel } from '../components/BannerCarousel';
import { useInView } from 'react-intersection-observer';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';

const ITEMS_PER_PAGE = 12;

type OrderingOption = {
    value: string;
    label: string;
};

const ORDERING_OPTIONS: OrderingOption[] = [
    { value: '', label: 'Padrão' },
    { value: 'newest', label: 'Mais recentes' },
    { value: 'price_asc', label: 'Menor preço' },
    { value: 'price_desc', label: 'Maior preço' },
    { value: 'name_asc', label: 'A - Z' },
    { value: 'name_desc', label: 'Z - A' },
];

export const Home = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [ordering, setOrdering] = useState('');

    // Read from URL params (set by Header)
    const searchQuery = searchParams.get('search') || '';
    const categoryParam = searchParams.get('category');
    const selectedCategory = categoryParam ? Number(categoryParam) : null;

    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: '1000px',
    });

    const fetchProducts = useCallback(async (
        currentOffset: number,
        categoryId: number | null,
        search: string,
        sort: string
    ) => {
        try {
            let url = `/products?limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`;
            if (categoryId) url += `&category_id=${categoryId}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (sort) url += `&ordering=${sort}`;

            const res = await api.get(url);
            const data = res.data;
            const newProducts = Array.isArray(data) ? data : data.items;

            if (Array.isArray(newProducts)) {
                setProducts(prev => currentOffset === 0 ? newProducts : [...prev, ...newProducts]);
                setHasMore(newProducts.length === ITEMS_PER_PAGE);
            }
        } catch (err) {
            console.error('Error fetching products:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    // React to URL param changes (from Header)
    useEffect(() => {
        setOffset(0);
        setProducts([]);
        setLoading(true);
        setHasMore(true);
        fetchProducts(0, selectedCategory, searchQuery, ordering);
    }, [selectedCategory, searchQuery, fetchProducts, ordering]);

    const handleOrderingChange = (value: string) => {
        setOrdering(value);
    };

    const clearSearch = () => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('search');
            return next;
        });
    };

    // Load more on scroll
    useEffect(() => {
        if (inView && hasMore && !loading && !loadingMore && products.length > 0) {
            setLoadingMore(true);
            const nextOffset = offset + ITEMS_PER_PAGE;
            setOffset(nextOffset);
            fetchProducts(nextOffset, selectedCategory, searchQuery, ordering);
        }
    }, [inView, hasMore, loading, loadingMore, products.length, offset, fetchProducts, selectedCategory, searchQuery, ordering]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Banner Carousel */}
            <section className="mb-8">
                <BannerCarousel />
            </section>

            {/* Ordering + Search indicator */}
            <section className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* Search active indicator */}
                {searchQuery ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Resultados para "<strong className="text-gray-800">{searchQuery}</strong>"</span>
                        <button onClick={clearSearch} className="text-gray-400 hover:text-gray-600 underline text-xs">
                            Limpar
                        </button>
                    </div>
                ) : (
                    <div />
                )}

                {/* Ordering Select */}
                <div className="flex items-center gap-2 shrink-0">
                    <SlidersHorizontal size={16} className="text-gray-500" />
                    <select
                        value={ordering}
                        onChange={(e) => handleOrderingChange(e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition cursor-pointer"
                    >
                        {ORDERING_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </section>

            {/* Products Grid */}
            {loading && products.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <ProductSkeleton key={i} />
                    ))}
                </div>
            ) : products.length === 0 ? (
                <div className="text-center text-gray-500 py-16">
                    <p className="text-lg">Nenhum produto encontrado.</p>
                    {searchQuery && (
                        <button onClick={clearSearch} className="mt-3 text-black underline text-sm">
                            Limpar busca
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {products.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                        {(loadingMore || loading) && [...Array(4)].map((_, i) => (
                            <ProductSkeleton key={`skeleton-${i}`} />
                        ))}
                    </div>
                    {/* Intersection Trigger */}
                    <div ref={ref} className="h-20 w-full flex items-center justify-center mt-8">
                        {hasMore && !loadingMore && !loading && (
                            <div className="text-gray-400 text-sm">Carregando mais...</div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
