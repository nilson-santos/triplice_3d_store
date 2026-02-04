export const ProductSkeleton = () => {
    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
            {/* Image Skeleton with Shimmer */}
            <div className="aspect-square bg-gray-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
            </div>

            {/* Content Skeleton */}
            <div className="p-4 space-y-3">
                {/* Title */}
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>

                {/* Description */}
                <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>

                {/* Price and Button */}
                <div className="mt-4 flex items-center justify-between pt-2">
                    <div className="h-7 bg-gray-200 rounded w-20"></div>
                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                </div>
            </div>
        </div>
    );
};

// Add shimmer animation to Global CSS or as a Tailwind utility
// This skeleton uses a basic pulse + a custom shimmer animation if defined.
// I'll add the shimmer utility to index.css in the next step.
