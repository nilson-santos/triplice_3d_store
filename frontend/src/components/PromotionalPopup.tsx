import { useEffect, useState } from 'react';
import { getActivePromotion, type PromotionalPopup as PromoType } from '../api';
import { X, ExternalLink } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const STORAGE_KEY_PREFIX = 'promo_seen_';

export function PromotionalPopup() {
    const [promo, setPromo] = useState<PromoType | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const fetchPromo = async () => {
            const data = await getActivePromotion();
            if (!data) return;

            // Check frequency logic
            const shouldShow = checkShouldShow(data);
            if (shouldShow) {
                setPromo(data);
                // Small delay for better UX
                setTimeout(() => setIsVisible(true), 1000);
            }
        };

        fetchPromo();
    }, []);

    const checkShouldShow = (data: PromoType) => {
        const storageKey = `${STORAGE_KEY_PREFIX}${data.id}`;

        if (data.frequency === 'SESSION') {
            const seenSession = sessionStorage.getItem(storageKey);
            return !seenSession;
        }

        if (data.frequency === 'ONCE') {
            const seenOnce = localStorage.getItem(storageKey);
            return !seenOnce;
        }

        if (data.frequency === 'PERIOD') {
            const lastSeen = localStorage.getItem(storageKey);
            if (!lastSeen) return true;

            const days = data.period_days || 1;
            const lastDate = new Date(parseInt(lastSeen));
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return diffDays >= days;
        }

        return true;
    };

    const handleClose = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsVisible(false);
        if (!promo) return;

        const storageKey = `${STORAGE_KEY_PREFIX}${promo.id}`;
        const now = Date.now().toString();

        if (promo.frequency === 'SESSION') {
            sessionStorage.setItem(storageKey, 'true');
        } else {
            localStorage.setItem(storageKey, now);
        }
    };

    if (!promo) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative max-w-lg w-full overflow-hidden flex flex-col items-center justify-center p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={handleClose}
                            className="absolute top-2 right-2 p-2 bg-gray-500/50 rounded-full text-white transition-colors z-20 backdrop-blur-sm"
                            aria-label="Close"
                        >
                            <X size={32} />
                        </button>

                        {promo.image && (
                            <div className="relative group w-full">
                                {promo.link_url ? (
                                    <a href={promo.link_url} className="block relative">
                                        <img
                                            src={promo.image}
                                            alt={promo.title}
                                            className="w-full h-auto object-contain max-h-[85vh] rounded-lg"
                                        />
                                        <span className="sr-only">Go to promotion</span>
                                    </a>
                                ) : (
                                    <img
                                        src={promo.image}
                                        alt={promo.title}
                                        className="w-full h-auto object-contain max-h-[85vh] rounded-lg"
                                    />
                                )}
                            </div>
                        )}

                        {!promo.image && (
                            <div className="bg-white p-8 text-center rounded-lg shadow-2xl">
                                <h2 className="text-2xl font-bold mb-4">{promo.title}</h2>
                                {promo.link_url && (
                                    <a href={promo.link_url} className="inline-flex items-center text-blue-600 hover:underline">
                                        Check it out <ExternalLink size={16} className="ml-1" />
                                    </a>
                                )}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
