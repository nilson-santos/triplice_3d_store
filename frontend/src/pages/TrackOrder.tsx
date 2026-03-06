import { useState, useEffect } from 'react';
import { getMyOrders, regenerateOrderPix } from '../api';
import type { TrackedOrder, OrderPixResponse } from '../api';
import { Package, MapPin, ChevronDown, ChevronUp, QrCode, Copy, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export const TrackOrder = () => {
    const { isAuthenticated } = useAuth();

    const [orders, setOrders] = useState<TrackedOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [pixData, setPixData] = useState<OrderPixResponse | null>(null);
    const [pixLoadingOrderId, setPixLoadingOrderId] = useState<string | null>(null);
    const [copiedPix, setCopiedPix] = useState(false);

    const qrImageSrc = pixData?.qr_code_base64
        ? (pixData.qr_code_base64.startsWith('data:image')
            ? pixData.qr_code_base64
            : `data:image/png;base64,${pixData.qr_code_base64}`)
        : null;

    useEffect(() => {
        if (isAuthenticated) {
            setLoading(true);
            getMyOrders().then(data => {
                setOrders(data);
                setSearched(true);
            }).catch(err => {
                console.error('Failed to load my orders', err);
            }).finally(() => {
                setLoading(false);
            });
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const handleRegeneratePix = async (orderId: string) => {
        setPixLoadingOrderId(orderId);
        try {
            const data = await regenerateOrderPix(orderId);
            setPixData(data);
        } catch (error) {
            console.error('Failed to regenerate PIX from track page', error);
            alert('Não foi possível gerar o QR Code agora. Tente novamente em instantes.');
        } finally {
            setPixLoadingOrderId(null);
        }
    };

    const handleCopyPix = async () => {
        if (!pixData?.qr_code_copia_e_cola) return;
        await navigator.clipboard.writeText(pixData.qr_code_copia_e_cola);
        setCopiedPix(true);
        setTimeout(() => setCopiedPix(false), 2000);
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const statusConfig: Record<string, { bg: string, text: string, label: string }> = {
            'PENDING': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Aguardando Pagamento' },
            'CONFIRMED': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pagamento Confirmado' },
            'SHIPPED': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Enviado' },
            'COMPLETED': { bg: 'bg-green-100', text: 'text-green-800', label: 'Entregue' },
            'CANCELLED': { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelado' },
        };

        const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

        return (
            <span className={`px - 3 py - 1 rounded - full text - xs font - medium ${config.bg} ${config.text} `}>
                {config.label}
            </span>
        );
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-12 pt-24 min-h-screen">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold mb-4">
                    Meus Pedidos
                </h1>
                <p className="text-gray-600 max-w-xl mx-auto">
                    Confira abaixo o histórico e o status de todas as suas compras.
                </p>
            </div>

            {(searched || isAuthenticated) && (
                <div className="space-y-6 max-w-3xl mx-auto">
                    {orders.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl">
                            {loading ? (
                                <>
                                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-gray-500">Carregando pedidos...</p>
                                </>
                            ) : (
                                <>
                                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhum pedido encontrado</h3>
                                    <p className="text-gray-500">Não encontramos pedidos para sua conta ou e-mail.</p>
                                </>
                            )}
                        </div>
                    ) : (
                        orders.map((order) => (
                            <div key={order.order_number} className="bg-white border border-gray-200 rounded-2xl overflow-hidden transition-all hover:shadow-md">
                                <div
                                    className="p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                    onClick={() => setExpandedOrder(expandedOrder === order.order_number ? null : order.order_number)}
                                >
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-bold text-lg">Pedido #{order.order_number}</h3>
                                            <StatusBadge status={order.status} />
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            Realizado em {new Date(order.created_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-6 min-w-[200px]">
                                        <div className="text-right">
                                            <p className="text-sm text-gray-500">Total</p>
                                            <p className="font-bold text-lg">R$ {order.total.toFixed(2)}</p>
                                        </div>
                                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
                                            {expandedOrder === order.order_number ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                        </button>
                                    </div>
                                </div>

                                {expandedOrder === order.order_number && (
                                    <div className="border-t border-gray-100 p-6 bg-gray-50/50">
                                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                                            <Package size={18} className="text-gray-500" />
                                            Produtos do Pedido
                                        </h4>
                                        <div className="space-y-4">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                    {item.image ? (
                                                        <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
                                                    ) : (
                                                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                                            <Package size={24} className="text-gray-400" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium line-clamp-2">{item.name}</p>
                                                        <p className="text-sm text-gray-500 mt-1">Qtd: {item.quantity}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-8 pt-6 border-t border-gray-200">
                                            {order.status === 'PENDING' && order.payment_status !== 'approved' && (
                                                <button
                                                    onClick={() => handleRegeneratePix(order.id)}
                                                    disabled={pixLoadingOrderId === order.id}
                                                    className="w-full mb-4 bg-black text-white font-bold py-3 px-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    <QrCode size={18} />
                                                    {pixLoadingOrderId === order.id ? 'Gerando QR Code...' : 'Gerar QR Code Novamente'}
                                                </button>
                                            )}
                                            <div className="flex items-start gap-3 text-sm text-gray-600 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                                <MapPin size={24} className="text-blue-500 flex-shrink-0" />
                                                <p>Por questões de privacidade (LGPD), os detalhes do seu endereço de entrega e documentos estão protegidos e não são exibidos nesta tela pública.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {pixData && (
                <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                        <button
                            onClick={() => setPixData(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-black"
                            aria-label="Fechar"
                        >
                            <X size={20} />
                        </button>
                        <h3 className="text-xl font-bold mb-2">Pedido #{pixData.order_number}</h3>
                        <p className="text-sm text-gray-600 mb-4">Escaneie o QR Code ou use o código copia e cola.</p>

                        {qrImageSrc ? (
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4 flex justify-center w-full">
                                <img
                                    src={qrImageSrc}
                                    alt="QR Code PIX"
                                    className="w-52 h-52 mix-blend-multiply"
                                />
                            </div>
                        ) : (
                            <div className="w-full mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                                QR Code ainda não disponível nesta tentativa. Tente gerar novamente.
                            </div>
                        )}

                        {pixData.qr_code_copia_e_cola && (
                            <div className="flex bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                <input
                                    type="text"
                                    readOnly
                                    value={pixData.qr_code_copia_e_cola}
                                    className="flex-1 bg-transparent p-3 outline-none text-sm text-gray-600 font-mono"
                                />
                                <button
                                    onClick={handleCopyPix}
                                    className="bg-black text-white px-4 hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    {copiedPix ? <CheckCircle size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
