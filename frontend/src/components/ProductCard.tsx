import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ShoppingCart, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import type { Product } from '../api';

export const ProductCard = ({ product }: { product: Product }) => {
    const { addToCart, items } = useCart();
    const isInCart = items.some(item => item.id === product.id);
    const { ref, inView } = useInView({
        triggerOnce: true,
        rootMargin: '600px 0px',
    });
    const [imageLoaded, setImageLoaded] = useState(false);

    return (
        <div ref={ref} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
            <div className="aspect-square bg-gray-100 relative overflow-hidden">
                {product.image && (
                    <>
                        <AnimatePresence>
                            {!imageLoaded && inView && (
                                <motion.div
                                    initial={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.4 }}
                                    className="absolute inset-0 bg-gray-200 z-10"
                                >
                                    {/* Linear Progress Bar (Instagram style) */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gray-300 overflow-hidden">
                                        <motion.div
                                            initial={{ x: '-100%' }}
                                            animate={{ x: '300%' }}
                                            transition={{
                                                repeat: Infinity,
                                                duration: 1.5,
                                                ease: "linear"
                                            }}
                                            className="h-full w-1/3 bg-black/20"
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {inView ? (
                            <motion.img
                                initial={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
                                animate={{
                                    opacity: imageLoaded ? 1 : 0.5,
                                    scale: imageLoaded ? 1 : 1.1,
                                    filter: imageLoaded ? 'blur(0px)' : 'blur(20px)'
                                }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                src={product.image}
                                alt={product.name}
                                loading="lazy"
                                onLoad={() => setImageLoaded(true)}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-200" />
                        )}
                    </>
                )}
                {!product.image && (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                        No Image
                    </div>
                )}
            </div>
            <div className="p-4">
                <h3 className="font-semibold text-lg text-gray-900">{product.name}</h3>
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">{product.description}</p>
                <div className="mt-4 flex items-center justify-between">
                    <span className="text-xl font-bold">R$ {product.price}</span>
                    <button
                        onClick={() => !isInCart && addToCart(product)}
                        disabled={isInCart}
                        className={`p-2 rounded-full transition-all duration-300 ${isInCart
                            ? 'bg-green-500 text-white cursor-default scale-110'
                            : 'bg-black text-white hover:bg-gray-800'
                            }`}
                    >
                        {isInCart ? <Check size={20} /> : <ShoppingCart size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
};
