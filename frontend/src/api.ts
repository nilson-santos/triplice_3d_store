import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://api.triplice3d.com.br/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface Product {
    id: number;
    name: string;
    description: string;
    price: string;
    image: string | null;
    categories: Array<{
        id: number;
        name: string;
        slug: string;
    }>;
}

export interface Category {
    id: number;
    name: string;
    slug: string;
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

export interface OrderResponse {
    id: string;
    order_number: string;
    whatsapp_url: string;
}

export const getCategories = async () => {
    const res = await api.get<Category[]>('/categories');
    return res.data;
};
