import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

    // Auto-play
    useEffect(() => {
        if (banners.length <= 1) return;
        const timer = setInterval(next, 5000);
        return () => clearInterval(timer);
    }, [banners.length, next]);

    if (loading) {
        return (
            <div className="w-full aspect-[3/1] animate-pulse rounded-b-2xl bg-gray-100" />
        );
    }

    if (banners.length === 0) return null;

    const banner = banners[current];

    const content = (
        <div className="relative w-full aspect-[3/1] overflow-hidden rounded-b-2xl">
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

                </motion.div>
            </AnimatePresence>



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
            <a href={banner.link_url} target="_self" rel="noopener noreferrer" className="block">
                {content}
            </a>
        );
    }

    return content;
};
