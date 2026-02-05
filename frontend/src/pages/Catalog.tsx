import { useEffect, useState, useCallback } from 'react';
import { api, getCategories } from '../api';
import type { Product, Category } from '../api';
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

    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: '1000px',
    });

    const fetchCategories = useCallback(async () => {
        try {
            const data = await getCategories();
            setCategories(data);
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    }, []);

    const fetchProducts = useCallback(async (currentOffset: number, categoryId: number | null) => {
        try {
            let url = `/products?limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`;
            if (categoryId) {
                url += `&category_id=${categoryId}`;
            }
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

    // Initial Load - Categories and Products
    useEffect(() => {
        fetchCategories();
        // Initial fetch with null category
        fetchProducts(0, null);
    }, [fetchCategories, fetchProducts]);

    // Handle Category Change
    const handleCategorySelect = (categoryId: number | null) => {
        if (selectedCategory === categoryId) return;

        setSelectedCategory(categoryId);
        setOffset(0);
        setProducts([]);
        setLoading(true);
        setHasMore(true);
        fetchProducts(0, categoryId);
    };

    // Load More when in view
    useEffect(() => {
        if (inView && hasMore && !loading && !loadingMore && products.length > 0) {
            setLoadingMore(true);
            const nextOffset = offset + ITEMS_PER_PAGE;
            setOffset(nextOffset);
            fetchProducts(nextOffset, selectedCategory);
        }
    }, [inView, hasMore, loading, loadingMore, products.length, offset, fetchProducts, selectedCategory]);

    if (loading && products.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">Nossos Produtos</h1>
                {/* Skeleton for categories could go here */}
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

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-8">
                <button
                    onClick={() => handleCategorySelect(null)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === null
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Todos
                </button>
                {categories.map(category => (
                    <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === category.id
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {category.name}
                    </button>
                ))}
            </div>

            {products.length === 0 && !loading ? (
                <div className="text-center text-gray-500 py-12">
                    Nenhum produto encontrado nesta categoria.
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

