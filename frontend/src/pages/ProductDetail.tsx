import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ShoppingCart, PaintBucket, Ruler, Heart, Share2 } from 'lucide-react';
import { api, getColors } from '../api';
import type { Product, Color } from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const ProductDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();

    // We will still track if it's in the cart. 
    // Ideally cart items would also track selected color, but for simplicity we keep the existing CartItem shape for now.
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [mainImage, setMainImage] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<number | null>(null);
    const [quantity, setQuantity] = useState(1);

    // Global colors
    const [globalColors, setGlobalColors] = useState<Color[]>([]);

    const { favoriteIds, toggleFav } = useAuth();
    const isFavorite = product ? favoriteIds.includes(product.id) : false;

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await api.get(`/products/${slug}`);
                setProduct(res.data);
                setMainImage(res.data.image);

                // Fetch colors if product requires colors
                if (res.data.has_colors) {
                    const colorsRes = await getColors();
                    setGlobalColors(colorsRes);
                    if (colorsRes.length > 0) {
                        setSelectedColor(colorsRes[0].id);
                    }
                }
            } catch (err) {
                console.error("Error fetching product", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [slug]);

    const handleAddToCart = () => {
        if (product) {
            addToCart(product, quantity);
        }
    };

    const handleQuantityChange = (delta: number) => {
        setQuantity(prev => {
            const next = prev + delta;
            return next > 0 ? next : 1;
        });
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/2 aspect-square bg-gray-200 rounded-2xl"></div>
                <div className="w-full md:w-1/2 space-y-4">
                    <div className="h-10 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-32 bg-gray-200 rounded w-full mt-8"></div>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-500">Produto não encontrado.</p>
                <button onClick={() => navigate('/')} className="mt-4 text-black underline">Voltar à loja</button>
            </div>
        );
    }

    // Build gallery logic: Main Image + array of secondary images
    // If no images from DB array, fallback to main image only
    const galleryItems = [];
    if (product.image) galleryItems.push(product.image);
    if (product.images) {
        product.images.sort((a, b) => a.order - b.order).forEach(img => {
            if (img.image_url) galleryItems.push(img.image_url);
        });
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-4 md:py-8 pb-20 md:pb-20">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center text-sm text-gray-500 hover:text-black mb-3 md:mb-6 transition-colors"
            >
                <ChevronLeft size={16} className="mr-1" /> Voltar
            </button>

            <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8 lg:gap-12">
                {/* Mobile Title (Hidden on md and up) */}
                <div className="md:hidden flex flex-col mb-1">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-snug">
                        {product.name}
                    </h1>
                </div>

                {/* Visual Section: Gallery */}
                <div className="w-full md:w-1/2 flex flex-col gap-4">
                    <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden relative group">
                        <AnimatePresence mode="wait">
                            <motion.img
                                key={mainImage || 'placeholder'}
                                initial={{ opacity: 0, scale: 1.05 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                src={mainImage || ''}
                                alt={product.name}
                                className="w-full h-full object-cover"
                            />
                        </AnimatePresence>
                        {!mainImage && (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                Sem imagem
                            </div>
                        )}
                    </div>

                    {/* Thumbnails */}
                    {galleryItems.length > 1 && (
                        <div className="flex gap-3 overflow-x-auto px-1 pt-1 pb-2 -mx-1 custom-scrollbar">
                            {galleryItems.map((url, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setMainImage(url)}
                                    className={`relative shrink-0 w-20 h-20 rounded-xl overflow-hidden transition-all ${mainImage === url ? 'ring-2 ring-black ring-offset-2' : 'opacity-70 hover:opacity-100'}`}
                                >
                                    <img src={url} alt="Thumbnail" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Details Section */}
                <div className="w-full md:w-1/2 flex flex-col md:aspect-square">
                    {/* Desktop Title (Hidden on mobile) */}
                    <div className="hidden md:flex flex-col">
                        <h1 className="text-3xl lg:text-3xl font-bold text-gray-900 tracking-tight leading-tight">
                            {product.name}
                        </h1>
                    </div>

                    <div className="mt-1 md:mt-2 border-b border-gray-100 pb-4 md:pb-4 flex justify-between items-center">
                        <span className="text-2xl md:text-2xl font-bold text-black">R$ {product.price}</span>
                        <div className="flex items-center gap-1 -mr-2">
                            <button
                                onClick={async () => {
                                    const shareData = {
                                        title: product.name,
                                        text: `Confira ${product.name} na Tríplice 3D!`,
                                        url: window.location.href
                                    };
                                    try {
                                        if (navigator.share) {
                                            await navigator.share(shareData);
                                        } else {
                                            await navigator.clipboard.writeText(window.location.href);
                                            alert("Link copiado para a área de transferência!");
                                        }
                                    } catch (err) {
                                        console.error("Erro ao compartilhar", err);
                                    }
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center text-gray-400 hover:text-gray-600"
                                aria-label="Compartilhar produto"
                                title="Compartilhar"
                            >
                                <Share2 size={24} />
                            </button>
                            <button
                                onClick={() => toggleFav(product.id)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
                                aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                            >
                                <Heart size={24} className={`transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-gray-600'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Product Size */}
                    {product.size && (
                        <div className="mt-3 md:mt-3 flex items-center gap-2 text-sm text-gray-600">
                            <Ruler size={16} className="text-gray-400" />
                            <span className="font-medium text-gray-900">Tamanho:</span>
                            <span>{product.size}</span>
                        </div>
                    )}

                    {/* Color Selector */}
                    {product.has_colors && globalColors.length > 0 && (
                        <div className="mt-6 md:mt-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3 md:mb-2 flex items-center gap-2">
                                <PaintBucket size={16} /> Cores / Texturas
                            </h3>
                            <div className="flex flex-wrap gap-3 md:gap-2">
                                {globalColors.map(color => (
                                    <button
                                        key={color.id}
                                        onClick={() => setSelectedColor(color.id)}
                                        className={`group relative w-8 h-8 md:w-8 md:h-8 rounded-full overflow-hidden transition-all duration-300 ${selectedColor === color.id
                                            ? 'ring-2 ring-black ring-offset-4 scale-110 md:ring-offset-2'
                                            : 'ring-1 ring-gray-200 hover:scale-110'
                                            }`}
                                        title={color.name}
                                    >
                                        <span className="sr-only">{color.name}</span>
                                        {color.image ? (
                                            <img src={color.image} alt={color.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200" />
                                        )}
                                        {/* Tooltip on hover */}
                                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-medium bg-black text-white px-2 py-1 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                                            {color.name}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-auto pt-8 md:pt-4 flex gap-3 md:gap-2 w-full">
                        <div className="flex items-center justify-between border border-gray-200 rounded-2xl md:rounded-xl px-2 sm:px-4 py-3 sm:py-0 md:py-2 w-[45%] sm:w-1/3 shrink-0">
                            <button
                                onClick={() => handleQuantityChange(-1)}
                                className="text-gray-500 hover:text-black font-semibold text-lg md:text-base px-2"
                            >
                                -
                            </button>
                            <span className="font-semibold text-lg md:text-base">{quantity}</span>
                            <button
                                onClick={() => handleQuantityChange(1)}
                                className="text-gray-500 hover:text-black font-semibold text-lg md:text-base px-2"
                            >
                                +
                            </button>
                        </div>
                        <button
                            onClick={handleAddToCart}
                            className="flex-1 py-3 sm:py-4 md:py-3 px-2 sm:px-6 md:px-4 rounded-2xl md:rounded-xl flex items-center justify-center gap-2 text-[13px] sm:text-lg md:text-sm font-semibold transition-all duration-300 bg-black text-white hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <>
                                <ShoppingCart size={20} className="sm:w-6 sm:h-6 md:w-5 md:h-5" /> Adicionar ao Carrinho
                            </>
                        </button>
                    </div>
                </div>
            </div>

            {/* Description Section (Full Width Below) */}
            <div className="mt-6 border-t border-gray-100 pt-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Descrição do Produto</h2>
                <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
                    <p>{product.description || "Este produto não possui descrição detalhada."}</p>
                </div>
            </div>
        </div>
    );
};
