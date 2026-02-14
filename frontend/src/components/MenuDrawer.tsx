import { X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

interface MenuDrawerProps {
    onClose: () => void;
}

export const MenuDrawer = ({ onClose }: MenuDrawerProps) => {
    const location = useLocation();

    const drawerVariants: Variants = {
        hidden: { x: '-100%' },
        visible: {
            x: 0,
            transition: {
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1]
            }
        },
        exit: {
            x: '-100%',
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

    const handleHomeClick = (e: React.MouseEvent) => {
        if (location.pathname === '/') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        onClose();
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
            />

            {/* Drawer */}
            <motion.div
                variants={drawerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed top-0 left-0 h-full w-full max-w-xs bg-white z-40 shadow-2xl flex flex-col"
            >
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="text-lg font-bold">Menu</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                {/* Links */}
                <nav className="flex-1 p-4 space-y-1">
                    <Link
                        to="/"
                        onClick={handleHomeClick}
                        className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition"
                    >
                        Início
                    </Link>
                    <Link
                        to="/#contact"
                        onClick={onClose}
                        className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition"
                    >
                        Contato
                    </Link>
                </nav>
            </motion.div>
        </>
    );
};
