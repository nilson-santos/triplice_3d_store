import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://triplice3d.com.br/api'),
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface Product {
    id: number;
    name: string;
    slug: string;
    description: string;
    price: string;
    image: string | null;
    categories: Array<{
        id: number;
        name: string;
        slug: string;
    }>;
    has_colors: boolean;
    size: string;
    images: Array<{
        id: number;
        image_url: string;
        order: number;
    }>;
}

export interface Category {
    id: number;
    name: string;
    slug: string;
    is_default: boolean;
}

export interface OrderItem {
    product_id: number;
    quantity: number;
}

export interface CreateOrderPayload {
    customer_name: string;
    customer_phone: string;
    items: OrderItem[];
}

export interface CreateOrderPixPayload {
    customer_cpf: string;
    shipping_type?: 'PICKUP_STORE' | 'FREE_DELIVERY_FOZ';
    shipping_address_zipcode?: string;
    shipping_address_street?: string;
    shipping_address_number?: string;
    shipping_address_complement?: string;
    shipping_address_neighborhood?: string;
    shipping_address_city?: string;
    shipping_address_state?: string;
    items: OrderItem[];
}

export interface OrderPixResponse {
    id: string;
    order_number: string;
    qr_code_base64: string | null;
    qr_code_copia_e_cola: string | null;
    payment_status: string | null;
    payment_status_detail?: string | null;
}

export interface OrderStatusResponse {
    status: string;
    payment_status: string | null;
}

export interface TrackedProduct {
    name: string;
    quantity: number;
    image: string | null;
}

export interface TrackedOrder {
    id: string;
    order_number: string;
    status: string;
    payment_status: string | null;
    payment_method?: string | null;
    created_at: string;
    items: TrackedProduct[];
    total: number;
}

export interface ProfileAddressStatus {
    has_registration_address: boolean;
    registration_address_zipcode: string | null;
    registration_address_street: string | null;
    registration_address_number: string | null;
    registration_address_complement: string | null;
    registration_address_neighborhood: string | null;
    registration_address_city: string | null;
    registration_address_state: string | null;
}

interface ViaCepResponse {
    cep?: string;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    erro?: boolean;
}

export interface ZipcodeLookupResult {
    zipcode: string;
    street: string;
    neighborhood: string;
    city: string;
    state: string;
}

export const getCategories = async () => {
    const res = await api.get<Category[]>('/categories');
    return res.data;
};

export const getMyOrders = async (): Promise<TrackedOrder[]> => {
    const res = await api.get<TrackedOrder[]>('/orders/my');
    return res.data;
};

export const regenerateOrderPix = async (orderId: string): Promise<OrderPixResponse> => {
    const res = await api.post<OrderPixResponse>(`/checkout/pix/${orderId}/regenerate`);
    return res.data;
};

export const getProfileAddressStatus = async (): Promise<ProfileAddressStatus> => {
    const res = await api.get<ProfileAddressStatus>('/auth/profile/address-status');
    return res.data;
};

export const lookupZipcode = async (zipcode: string, signal?: AbortSignal): Promise<ZipcodeLookupResult | null> => {
    const digits = zipcode.replace(/\D/g, '').slice(0, 8);

    if (digits.length !== 8) {
        return null;
    }

    const res = await axios.get<ViaCepResponse>(`https://viacep.com.br/ws/${digits}/json/`, {
        signal,
        timeout: 5000,
    });

    if (res.data.erro) {
        return null;
    }

    return {
        zipcode: res.data.cep ?? digits,
        street: res.data.logradouro?.trim() ?? '',
        neighborhood: res.data.bairro?.trim() ?? '',
        city: res.data.localidade?.trim() ?? '',
        state: res.data.uf?.trim().toUpperCase() ?? '',
    };
};

export const getOrderStatus = async (orderId: string): Promise<OrderStatusResponse> => {
    const res = await api.get<OrderStatusResponse>(`/orders/${orderId}/status`);
    return res.data;
};

export interface Color {
    id: number;
    name: string;
    image: string | null;
}

export const getColors = async () => {
    const res = await api.get<Color[]>('/colors');
    return res.data;
};

export interface PromotionalPopup {
    id: number;
    title: string;
    image: string | null;
    link_url: string | null;
    frequency: 'SESSION' | 'ONCE' | 'PERIOD';
    period_days: number | null;
}

export const getActivePromotion = async () => {
    try {
        const res = await api.get<PromotionalPopup>('/promotions/active');
        return res.data;
    } catch {
        return null; // Return null if 404
    }
};

export interface Banner {
    id: number;
    title: string;
    image: string | null;
    link_url: string | null;
}

export const getBanners = async (): Promise<Banner[]> => {
    const res = await api.get<Banner[]>('/banners');
    return res.data;
};

export interface DailyUniqueVisitsResponse {
    date: string;
    count: number;
}

export const getDailyUniqueVisits = async (): Promise<DailyUniqueVisitsResponse> => {
    const res = await api.get<DailyUniqueVisitsResponse>('/admin/daily-unique-visits');
    return res.data;
};

export const fetchFavorites = async (): Promise<number[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await api.get<any[]>('/auth/favorites');
    return res.data.map(f => f.product_id);
};

export const toggleFavoriteAPI = async (productId: number) => {
    await api.post('/auth/favorites/toggle', { product_id: productId });
};

export interface CartItemResponse {
    id: number;
    product: Product;
    quantity: number;
}

export interface CartResponse {
    id: number;
    items: CartItemResponse[];
    total: number;
}

export const getCartDB = async (): Promise<CartResponse> => {
    const res = await api.get<CartResponse>('/cart');
    return res.data;
};

export const syncCartDB = async (items: Array<{ product_id: number; quantity: number }>): Promise<CartResponse> => {
    const res = await api.post<CartResponse>('/cart/sync', { items });
    return res.data;
};

export const addToCartDB = async (productId: number, quantity: number = 1): Promise<CartResponse> => {
    const res = await api.post<CartResponse>('/cart/items', { product_id: productId, quantity });
    return res.data;
};

export const updateCartItemDB = async (itemId: number, quantity: number): Promise<CartResponse> => {
    const res = await api.put<CartResponse>(`/cart/items/${itemId}`, { quantity });
    return res.data;
};

export const removeFromCartDB = async (itemId: number): Promise<CartResponse> => {
    const res = await api.delete<CartResponse>(`/cart/items/${itemId}`);
    return res.data;
};

export const clearCartDB = async (): Promise<CartResponse> => {
    const res = await api.delete<CartResponse>('/cart');
    return res.data;
};
