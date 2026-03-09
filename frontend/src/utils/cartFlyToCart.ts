export interface FlyToCartDetail {
    image?: string | null;
    originX: number;
    originY: number;
}

export const dispatchFlyToCart = (element: HTMLElement, image?: string | null) => {
    const rect = element.getBoundingClientRect();
    const detail: FlyToCartDetail = {
        image: image || null,
        originX: rect.left + rect.width / 2,
        originY: rect.top + rect.height / 2,
    };

    window.dispatchEvent(new CustomEvent<FlyToCartDetail>('triplice:fly-to-cart', { detail }));
};
