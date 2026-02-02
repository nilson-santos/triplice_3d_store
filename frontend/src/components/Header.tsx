import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { CartDrawer } from './CartDrawer';
import logo from '../assets/logo.png';

export const Header = () => {
    const { items } = useCart();
    const [isCartOpen, setIsCartOpen] = useState(false);

    return (
        <>
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
                        <img src={logo} alt="Triplice 3D" className="h-10 w-auto" />
                    </Link>

                    <nav className="hidden md:flex items-center gap-8 font-medium text-gray-600">
                        <Link to="/" className="hover:text-black transition">Início</Link>
                        <Link to="/catalog" className="hover:text-black transition">Catálogo</Link>
                    </nav>

                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="relative p-2 hover:bg-gray-100 rounded-full transition"
                    >
                        <ShoppingCart className="w-6 h-6" />
                        {items.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-black text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                                {items.length}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </>
    );
};
