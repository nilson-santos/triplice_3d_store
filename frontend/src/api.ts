import axios from 'axios';

export const api = axios.create({
    baseURL: 'http://localhost:8000/api',
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
    category: {
        id: number;
        name: string;
        slug: string;
    };
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
