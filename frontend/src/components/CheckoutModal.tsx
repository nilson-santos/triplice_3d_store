import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { api } from '../api';
import type { CreateOrderPayload } from '../api';
import { X, CheckCircle, Smartphone } from 'lucide-react';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CheckoutModal = ({ isOpen, onClose }: CheckoutModalProps) => {
    const { items, total, clearCart } = useCart();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [successData, setSuccessData] = useState<{ id: string; order_number: string; whatsapp_url: string } | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload: CreateOrderPayload = {
            customer_name: name,
            customer_phone: phone,
            items: items.map(item => ({
                product_id: item.id,
                quantity: item.quantity
            }))
        };

        try {
            const response = await api.post('/orders', payload);
            setSuccessData(response.data);
            clearCart();
        } catch (error) {
            console.error('Failed to create order', error);
            alert('Erro ao criar pedido. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (successData) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center shadow-2xl">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Pedido #{successData.order_number} Recebido!</h2>
                    <p className="text-gray-600 mb-6">
                        Seu pedido foi criado.
                        <br />Finalize enviando para nosso WhatsApp.
                    </p>

                    <a
                        href={successData.whatsapp_url}
                        className="flex items-center justify-center gap-2 w-full bg-green-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-green-600 transition-colors"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <Smartphone size={20} />
                        Confirmar no WhatsApp
                    </a>

                    <button
                        onClick={onClose}
                        className="mt-4 text-gray-400 hover:text-gray-600 underline text-sm"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-black"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold mb-6">Finalizar Pedido</h2>

                <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Total ({items.length} itens)</span>
                        <span className="font-bold text-black text-lg">R$ {total.toFixed(2)}</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Seu Nome</label>
                        <input
                            type="text"
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                            placeholder="Ex: Ana Maria"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp / Telefone</label>
                        <input
                            type="tel"
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                            placeholder="Ex: 11 99999-9999"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 mt-4"
                    >
                        {loading ? 'Enviando...' : 'Confirmar Pedido'}
                    </button>
                </form>
            </div>
        </div>
    );
};
