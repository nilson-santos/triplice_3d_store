import { X, Plus, Minus, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CheckoutModal } from './CheckoutModal';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CartDrawer = ({ isOpen, onClose }: CartDrawerProps) => {
    const { items, removeFromCart, addToCart, decreaseQuantity, total } = useCart();
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    // Entrar: Direita para Esquerda (x: 100% -> 0)
    // Sair: Esquerda para Direita (x: 0 -> 100%)
    // Curva logarítmica simulada por cubic-bezier (rápido início, fim suave)
    const drawerVariants = {
        hidden: { x: '100%' },
        visible: {
            x: 0,
            transition: {
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1] // Quintic/Logarithmic feel
            }
        },
        exit: {
            x: '100%',
            transition: {
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1]
            }
        }
    };

    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 }
    };

    return (
        <>
            {/* Backdrop */}
            <motion.div
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed inset-0 bg-black/30 z-40"
                onClick={onClose}
            ></motion.div>

            {/* Drawer */}
            <motion.div
                variants={drawerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-40 shadow-2xl flex flex-col"
            >
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="text-xl font-bold">Seu Carrinho</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {items.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">
                            Seu carrinho está vazio.
                        </div>
                    ) : (
                        items.map(item => (
                            <div key={item.id} className="flex gap-4 border-b pb-4">
                                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                    {item.image && (
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold">{item.name}</h3>
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <p className="text-gray-500 text-sm">R$ {item.price}</p>

                                    <div className="flex items-center gap-3 mt-2">
                                        <button
                                            className="w-8 h-8 flex items-center justify-center border rounded-full hover:bg-gray-50"
                                            onClick={() => decreaseQuantity(item.id)}
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <span className="font-medium">{item.quantity}</span>
                                        <button
                                            className="w-8 h-8 flex items-center justify-center border rounded-full hover:bg-gray-50"
                                            onClick={() => addToCart(item)}
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-600">Total</span>
                        <span className="text-2xl font-bold">R$ {total.toFixed(2)}</span>
                    </div>
                    <button
                        disabled={items.length === 0}
                        onClick={() => setIsCheckoutOpen(true)}
                        className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Finalizar Pedido
                    </button>
                </div>
            </motion.div>

            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => {
                    setIsCheckoutOpen(false);
                    onClose();
                }}
            />
        </>
    );
};
