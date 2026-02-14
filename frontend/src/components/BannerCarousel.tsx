import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Banner } from '../api';
import { getBanners } from '../api';

export const BannerCarousel = () => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [current, setCurrent] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getBanners()
            .then(data => setBanners(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const next = useCallback(() => {
        setCurrent(prev => (prev + 1) % banners.length);
    }, [banners.length]);

    const prev = useCallback(() => {
        setCurrent(prev => (prev - 1 + banners.length) % banners.length);
    }, [banners.length]);

    // Auto-play
    useEffect(() => {
        if (banners.length <= 1) return;
        const timer = setInterval(next, 5000);
        return () => clearInterval(timer);
    }, [banners.length, next]);

    if (loading) {
        return (
            <div className="w-full aspect-[21/9] sm:aspect-[21/7] bg-gray-100 animate-pulse rounded-2xl" />
        );
    }

    if (banners.length === 0) return null;

    const banner = banners[current];

    const content = (
        <div className="relative w-full aspect-[21/9] sm:aspect-[21/7] overflow-hidden rounded-2xl bg-gray-100">
            <AnimatePresence mode="wait">
                <motion.div
                    key={banner.id}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    className="absolute inset-0"
                >
                    {banner.image && (
                        <img
                            src={banner.image}
                            alt={banner.title}
                            className="w-full h-full object-cover"
                        />
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
                        <h2 className="text-white text-lg sm:text-2xl font-bold drop-shadow-lg">
                            {banner.title}
                        </h2>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation arrows */}
            {banners.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); prev(); }}
                        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm hover:bg-white/40 rounded-full flex items-center justify-center transition-all"
                        aria-label="Banner anterior"
                    >
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); next(); }}
                        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm hover:bg-white/40 rounded-full flex items-center justify-center transition-all"
                        aria-label="Próximo banner"
                    >
                        <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                </>
            )}

            {/* Dot indicators */}
            {banners.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                    {banners.map((_, i) => (
                        <button
                            key={i}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrent(i); }}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${i === current
                                    ? 'bg-white w-6'
                                    : 'bg-white/50 hover:bg-white/75'
                                }`}
                            aria-label={`Ir para banner ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );

    if (banner.link_url) {
        return (
            <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="block">
                {content}
            </a>
        );
    }

    return content;
};
