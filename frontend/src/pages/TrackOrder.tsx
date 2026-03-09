import { useState, useEffect, useCallback } from 'react';
import { getMyOrders, regenerateOrderPix } from '../api';
import type { TrackedOrder, OrderPixResponse } from '../api';
import { Package, ChevronDown, ChevronUp, QrCode, Copy, CheckCircle, X, Clock, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export const TrackOrder = () => {
    const { isAuthenticated } = useAuth();

    const [orders, setOrders] = useState<TrackedOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [pixData, setPixData] = useState<OrderPixResponse | null>(null);
    const [pixLoadingOrderId, setPixLoadingOrderId] = useState<string | null>(null);
    const [copiedPix, setCopiedPix] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

    const qrImageSrc = pixData?.qr_code_base64
        ? (pixData.qr_code_base64.startsWith('data:image')
            ? pixData.qr_code_base64
            : `data:image/png;base64,${pixData.qr_code_base64}`)
        : null;

    const fetchOrders = useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const data = await getMyOrders();
            setOrders(data);
            setSearched(true);
        } catch (err) {
            console.error('Failed to load my orders', err);
        } finally {
            if (isInitial) setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchOrders(true);
        }
    }, [isAuthenticated, fetchOrders]);

    // Polling logic: refresh if there are pending orders
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        const hasPending = orders.some(o => o.status === 'PENDING' || o.payment_status === 'pending');

        if (isAuthenticated && hasPending) {
            interval = setInterval(() => {
                fetchOrders(false);
            }, 10000); // 10 seconds
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isAuthenticated, orders, fetchOrders]);

    // Timer Effect for modal
    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | undefined;
        if (pixData && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [pixData, timeLeft]);

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const handleRegeneratePix = async (orderId: string) => {
        setPixLoadingOrderId(orderId);
        try {
            const data = await regenerateOrderPix(orderId);
            setPixData(data);
            setTimeLeft(300); // Reset to 5 minutes
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

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const StatusBadge = ({ status, paymentStatus }: { status: string, paymentStatus?: string | null }) => {
        const isApproved = paymentStatus === 'approved' || status === 'CONFIRMED' || status === 'COMPLETED';

        const statusConfig: Record<string, { bg: string, text: string, label: string, icon: React.ComponentType<{ size?: number | string }> }> = {
            'PENDING': {
                bg: isApproved ? 'bg-green-100' : 'bg-amber-100',
                text: isApproved ? 'text-green-700' : 'text-amber-700',
                label: isApproved ? 'Pagamento Confirmado' : 'Aguardando Pagamento',
                icon: isApproved ? CheckCircle : Clock
            },
            'CONFIRMED': { bg: 'bg-green-100', text: 'text-green-700', label: 'Pagamento Confirmado', icon: CheckCircle },
            'SHIPPED': { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Em Transporte', icon: Package },
            'COMPLETED': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Entregue', icon: CheckCircle },
            'CANCELLED': { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Cancelado', icon: X },
        };

        const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status, icon: Package };
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${config.bg} ${config.text}`}>
                <Icon size={12} />
                {config.label}
            </span>
        );
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 pt-16 min-h-screen bg-gray-50/30">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <h1 className="text-4xl font-extrabold mb-3 tracking-tight text-gray-900">
                    Meus Pedidos
                </h1>
                <p className="text-gray-500 max-w-xl mx-auto text-lg leading-relaxed">
                    Acompanhe o status das suas encomendas em tempo real.
                </p>
            </motion.div>

            {(searched || isAuthenticated) && (
                <div className="space-y-6 max-w-3xl mx-auto">
                    {orders.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                            {loading ? (
                                <>
                                    <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-gray-400 font-medium tracking-wide">Buscando seus pedidos...</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Package className="w-10 h-10 text-gray-300" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Nenhum pedido ainda</h3>
                                    <p className="text-gray-500 mb-8">Parece que você ainda não realizou nenhuma compra.</p>
                                    <button
                                        onClick={() => window.location.href = '/'}
                                        className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                                    >
                                        Começar a Comprar
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-5">
                            {orders.map((order, index) => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`bg-white border ${expandedOrder === order.order_number ? 'border-black ring-1 ring-black/5 shadow-xl' : 'border-gray-100 shadow-sm'} rounded-3xl overflow-hidden transition-all duration-300`}
                                >
                                    <div
                                        className="p-6 sm:p-8 cursor-pointer group"
                                        onClick={() => setExpandedOrder(expandedOrder === order.order_number ? null : order.order_number)}
                                    >
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pedido</span>
                                                    <h3 className="font-black text-xl text-gray-900 group-hover:text-black transition-colors leading-none">
                                                        N° {order.order_number}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        <StatusBadge status={order.status} paymentStatus={order.payment_status} />
                                                        {order.payment_method && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 border border-gray-200">
                                                                {order.payment_method === 'pix' ? 'Pix' :
                                                                    order.payment_method === 'credit_card' || order.payment_method === 'master' || order.payment_method === 'visa' || order.payment_method === 'amex' ? 'Crédito' :
                                                                        order.payment_method === 'debit_card' || order.payment_method === 'maestro' ? 'Débito' :
                                                                            order.payment_method}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-400 font-medium">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={14} />
                                                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                                                    </span>
                                                    <span className="w-1 h-1 bg-gray-200 rounded-full" />
                                                    <span>{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between w-full sm:w-auto gap-8">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Geral</p>
                                                    <p className="font-black text-2xl text-black">R$ {order.total.toFixed(2).replace('.', ',')}</p>
                                                </div>
                                                <div className={`p-2 rounded-full transition-colors ${expandedOrder === order.order_number ? 'bg-black text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'}`}>
                                                    {expandedOrder === order.order_number ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {expandedOrder === order.order_number && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-gray-50 bg-gray-50/40"
                                            >
                                                <div className="p-6 sm:p-8 space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                                            <Package size={14} />
                                                            Itens do Pedido
                                                        </h4>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-4">
                                                        {order.items.map((item, idx) => (
                                                            <div key={idx} className="flex items-center gap-5 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm group/item hover:border-black transition-colors">
                                                                {item.image ? (
                                                                    <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-xl shadow-sm" />
                                                                ) : (
                                                                    <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center">
                                                                        <Package size={32} className="text-gray-200" />
                                                                    </div>
                                                                )}
                                                                <div className="flex-1">
                                                                    <p className="font-bold text-gray-900 group-hover/item:text-black">{item.name}</p>
                                                                    <div className="flex items-center gap-3 mt-2">
                                                                        <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md">Qtd: {item.quantity}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="pt-8 mt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-4">
                                                        {order.status === 'PENDING' && order.payment_status !== 'approved' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRegeneratePix(order.id);
                                                                }}
                                                                disabled={pixLoadingOrderId === order.id}
                                                                className="flex-1 bg-black text-white font-black py-4 px-6 rounded-2xl hover:bg-gray-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-black/10 active:scale-95 disabled:opacity-50"
                                                            >
                                                                <QrCode size={20} />
                                                                {pixLoadingOrderId === order.id ? 'Gerando QR Code...' : 'Pagar via PIX Agora'}
                                                            </button>
                                                        )}

                                                        <button
                                                            className="flex-1 bg-white text-gray-900 font-bold py-4 px-6 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const phone = import.meta.env.VITE_STORE_WHATSAPP_NUMBER || '5545999252323';
                                                                window.open(`https://api.whatsapp.com/send?phone=${phone}&text=Olá, gostaria de informações sobre meu pedido N° ${order.order_number}`, '_blank');
                                                            }}
                                                        >
                                                            <ExternalLink size={18} />
                                                            Suporte via WhatsApp
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {pixData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative border border-gray-100"
                        >
                            <button
                                onClick={() => setPixData(null)}
                                className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50"
                                aria-label="Fechar"
                            >
                                <X size={24} />
                            </button>

                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
                                </div>
                                <h3 className="text-2xl font-black mb-1">Pagamento PIX</h3>
                                <p className="text-gray-400 font-medium">Pedido N° {pixData.order_number}</p>
                                <div className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-amber-50 text-amber-700 rounded-full text-2xl font-black tracking-tighter border border-amber-100 shadow-sm">
                                    <Clock size={20} /> {formatTime(timeLeft)}
                                </div>
                            </div>

                            {qrImageSrc ? (
                                <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-gray-100 mb-8 flex justify-center w-full shadow-inner group">
                                    <img
                                        src={qrImageSrc}
                                        alt="QR Code PIX"
                                        className="w-56 h-56 mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                            ) : (
                                <div className="w-full mb-8 p-4 rounded-2xl border border-amber-100 bg-amber-50 text-amber-800 text-sm font-medium italic text-center">
                                    QR Code ainda não disponível. Tente gerar novamente.
                                </div>
                            )}

                            {pixData.qr_code_copia_e_cola && (
                                <div className="space-y-3 mb-8">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Código Copia e Cola</p>
                                    <div className="flex bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden p-1.5 shadow-inner">
                                        <input
                                            type="text"
                                            readOnly
                                            value={pixData.qr_code_copia_e_cola}
                                            className="flex-1 bg-transparent px-4 py-3 outline-none text-sm text-gray-500 font-mono truncate"
                                        />
                                        <button
                                            onClick={handleCopyPix}
                                            className="bg-black text-white px-5 rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md"
                                        >
                                            {copiedPix ? <CheckCircle size={20} /> : <Copy size={20} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <p className="text-[10px] text-gray-300 font-medium text-center flex items-center justify-center gap-1 opacity-80">
                                <ShieldCheck size={12} /> Pagamento 100% seguro via Mercado Pago
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ShieldCheck = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);
