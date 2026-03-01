import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ShoppingCart } from 'lucide-react';
import type { Product } from '../api';

export const ProductCard = ({ product }: { product: Product }) => {
    const navigate = useNavigate();
    const { ref, inView } = useInView({
        triggerOnce: true,
        rootMargin: '600px 0px',
    });
    const [imageLoaded, setImageLoaded] = useState(false);

    return (
        <div ref={ref} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
            <div
                className="aspect-square bg-gray-100 relative overflow-hidden cursor-pointer"
                onClick={() => navigate(`/produto/${product.slug}`)}
            >
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
            <div className="p-3">
                <h3
                    className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-1 cursor-pointer hover:underline"
                    onClick={() => navigate(`/produto/${product.slug}`)}
                >
                    {product.name}
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm mt-1 line-clamp-2">{product.description}</p>

                <div className="mt-3 sm:mt-4 flex items-center justify-between">
                    <span className="text-base sm:text-lg font-bold">R$ {product.price}</span>
                    <button
                        onClick={() => navigate(`/produto/${product.slug}`)}
                        className="p-1.5 sm:p-2 bg-black text-white hover:bg-gray-800 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
                        title="Ver Opções"
                    >
                        <ShoppingCart size={16} className="sm:w-5 sm:h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
