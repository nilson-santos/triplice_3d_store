import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Heart, ShoppingCart, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../api';

interface FavoriteProduct {
    product_id: number;
    product_name: string;
    product_slug: string;
    product_price: number;
    product_image: string | null;
}

export const Favorites = () => {
    const { isAuthenticated, toggleFav } = useAuth();
    const { addToCart } = useCart();
    const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [recentlyAddedId, setRecentlyAddedId] = useState<number | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            api.get<FavoriteProduct[]>('/auth/favorites')
                .then(res => setFavorites(res.data))
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) return <Navigate to="/" replace />;

    const handleRemove = async (productId: number) => {
        await toggleFav(productId);
        setFavorites(prev => prev.filter(f => f.product_id !== productId));
    };

    const handleAddToCart = async (favorite: FavoriteProduct) => {
        await addToCart({
            id: favorite.product_id,
            name: favorite.product_name,
            price: String(favorite.product_price),
            image: favorite.product_image,
            slug: favorite.product_slug,
            has_colors: false,
            description: '',
            categories: [],
            size: '',
            images: []
        });
        setRecentlyAddedId(favorite.product_id);
        window.setTimeout(() => {
            setRecentlyAddedId(current => current === favorite.product_id ? null : current);
        }, 1200);
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-12 pt-24 min-h-screen">
            <div className="mb-10">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Heart size={28} className="text-black" />
                    Meus Favoritos
                </h1>
                <p className="text-gray-500 mt-1 text-sm">
                    Produtos que você marcou como favoritos.
                </p>
            </div>

            {loading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-gray-100 rounded-2xl h-64 animate-pulse" />
                    ))}
                </div>
            )}

            {!loading && favorites.length === 0 && (
                <div className="text-center py-24">
                    <Heart size={48} className="mx-auto text-gray-200 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-400">Nenhum favorito ainda</h2>
                    <p className="text-gray-400 text-sm mt-2 mb-6">Explore os produtos e marque os que você mais curtiu!</p>
                    <Link to="/" className="inline-block bg-black text-white px-6 py-2.5 rounded-full font-bold hover:bg-gray-800 transition">
                        Ver Produtos
                    </Link>
                </div>
            )}

            {!loading && favorites.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {favorites.map(fav => (
                        <div key={fav.product_id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                            <Link to={`/produto/${fav.product_slug}`} className="block">
                                <div className="relative aspect-square bg-gray-50 overflow-hidden">
                                    {fav.product_image ? (
                                        <img src={fav.product_image} alt={fav.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-200 text-5xl">🔲</div>
                                    )}
                                </div>
                            </Link>
                            <div className="p-3 flex flex-col gap-2 flex-1">
                                <Link to={`/produto/${fav.product_slug}`} className="text-sm font-medium leading-tight line-clamp-2 hover:underline">
                                    {fav.product_name}
                                </Link>
                                <p className="text-sm font-bold">
                                    R$ {fav.product_price.toFixed(2).replace('.', ',')}
                                </p>
                                <div className="flex gap-2 mt-auto pt-1">
                                    <button
                                        onClick={() => handleAddToCart(fav)}
                                        className={`flex-1 text-xs font-bold py-2 rounded-lg transition flex items-center justify-center gap-1 ${recentlyAddedId === fav.product_id ? 'bg-emerald-600 text-white' : 'bg-black text-white hover:bg-gray-800'}`}
                                    >
                                        {recentlyAddedId === fav.product_id ? <Check size={14} /> : <ShoppingCart size={14} />}
                                        {recentlyAddedId === fav.product_id ? 'Adicionado' : 'Adicionar'}
                                    </button>
                                    <button
                                        onClick={() => handleRemove(fav.product_id)}
                                        className="p-2 rounded-lg border border-gray-200 hover:border-red-300 hover:text-red-500 transition"
                                        title="Remover dos favoritos"
                                    >
                                        <Heart size={14} className="fill-current" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
