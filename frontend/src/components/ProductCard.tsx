import type { Product } from '../api';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Check } from 'lucide-react';

import { motion } from 'framer-motion';

export const ProductCard = ({ product }: { product: Product }) => {
    const { addToCart, items } = useCart();
    const isInCart = items.some(item => item.id === product.id);

    return (
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
            <div className="aspect-square bg-gray-100 relative overflow-hidden">
                {product.image ? (
                    <motion.img
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
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
