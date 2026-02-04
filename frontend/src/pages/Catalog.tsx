import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import type { Product } from '../api';
import { ProductCard } from '../components/ProductCard';
import { ProductSkeleton } from '../components/ProductSkeleton';
import { useInView } from 'react-intersection-observer';

const ITEMS_PER_PAGE = 12;

export const Catalog = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: '1000px',
    });

    const fetchProducts = useCallback(async (currentOffset: number) => {
        try {
            const res = await api.get(`/products?limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`);
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

    // Initial Load
    useEffect(() => {
        fetchProducts(0);
    }, [fetchProducts]);

    // Load More when in view
    useEffect(() => {
        if (inView && hasMore && !loading && !loadingMore && products.length > 0) {
            setLoadingMore(true);
            const nextOffset = offset + ITEMS_PER_PAGE;
            setOffset(nextOffset);
            fetchProducts(nextOffset);
        }
    }, [inView, hasMore, loading, loadingMore, products.length, offset, fetchProducts]);

    if (loading && products.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">Nossos Produtos</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <ProductSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Nossos Produtos</h1>

            {products.length === 0 && !loading ? (
                <div className="text-center text-gray-500 py-12">
                    Nenhum produto encontrado. Adicione produtos no Django Admin.
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
