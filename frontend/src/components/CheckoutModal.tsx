import { useCallback, useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { api, getProfileAddressStatus } from '../api';
import type { CreateOrderPayload, CreateOrderPixPayload, OrderPixResponse } from '../api';
import { X, CheckCircle, Smartphone, QrCode, Copy, ShieldCheck, Clock, Truck, MapPin, Fingerprint } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthForm } from './AuthForm';
import { CardPaymentForm } from './CardPaymentForm';

declare global {
    interface Window {
        MercadoPago: any;
    }
}

const parseUseMercadoPago = () => {
    const rawFlag = import.meta.env.VITE_USE_MERCADOPAGO;
    if (typeof rawFlag !== 'string' || rawFlag.trim() === '') {
        return true;
    }
    return rawFlag.trim().toLowerCase() === 'true';
};

const USE_MERCADOPAGO = parseUseMercadoPago();

const validateCPF = (cpf: string) => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(digits.charAt(i)) * (10 - i);
    }
    let rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(digits.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(digits.charAt(i)) * (11 - i);
    }
    rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(digits.charAt(10))) return false;

    return true;
};

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CheckoutModal = ({ isOpen, onClose }: CheckoutModalProps) => {
    const { items, total, clearCart, isSyncing } = useCart();
    const { isAuthenticated, user } = useAuth();
    const [cpf, setCpf] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [checkingAddressStatus, setCheckingAddressStatus] = useState(false);
    const [pixStage, setPixStage] = useState<'SHIPPING' | 'ADDRESS' | 'PAYMENT_METHOD' | 'PIX' | 'CARD'>('SHIPPING');
    const [shippingType, setShippingType] = useState<'PICKUP_STORE' | 'FREE_DELIVERY_FOZ'>('PICKUP_STORE');
    const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD'>('PIX');
    const [registrationZipcode, setRegistrationZipcode] = useState('');
    const [registrationStreet, setRegistrationStreet] = useState('');
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [registrationComplement, setRegistrationComplement] = useState('');
    const [registrationNeighborhood, setRegistrationNeighborhood] = useState('');
    const [registrationCity, setRegistrationCity] = useState('');
    const [registrationState, setRegistrationState] = useState('');

    const [loading, setLoading] = useState(false);
    const [successData, setSuccessData] = useState<OrderPixResponse | null>(null);
    const [manualSuccessData, setManualSuccessData] = useState<{ id: string; order_number: string; whatsapp_url: string } | null>(null);
    const [orderTotal, setOrderTotal] = useState<number | null>(null);

    const [copied, setCopied] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [isConfirmed, setIsConfirmed] = useState(false);

    const cpfDigits = cpf.replace(/\D/g, '');
    const zipcodeDigits = registrationZipcode.replace(/\D/g, '');

    const qrImageSrc = successData?.qr_code_base64
        ? (successData.qr_code_base64.startsWith('data:image')
            ? successData.qr_code_base64
            : `data:image/png;base64,${successData.qr_code_base64}`)
        : null;

    const normalizeCity = (value: string) =>
        value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();

    // Timer Effect
    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | undefined;
        if (successData && !isConfirmed && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        }
    }, [successData, isConfirmed, timeLeft]);

    // Polling Effect
    useEffect(() => {
        let pollInterval: ReturnType<typeof setInterval> | undefined;
        if (successData && !isConfirmed) {
            pollInterval = setInterval(async () => {
                try {
                    const response = await api.get(`/orders/${successData.id}/status`);
                    if (response.data.status === 'CONFIRMED' || response.data.payment_status === 'approved') {
                        setIsConfirmed(true);
                        if (pollInterval) clearInterval(pollInterval);
                    }
                } catch (err) {
                    console.error('Polling error', err);
                }
            }, 5000);
        }
        return () => {
            if (pollInterval) clearInterval(pollInterval);
        }
    }, [successData, isConfirmed]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const requiredRegistrationAddressFilled =
        zipcodeDigits.length === 8 &&
        registrationStreet.trim().length > 0 &&
        registrationNumber.trim().length > 0 &&
        registrationNeighborhood.trim().length > 0 &&
        registrationCity.trim().length > 0 &&
        registrationState.trim().length > 0;

    useEffect(() => {
        if (!isOpen || !USE_MERCADOPAGO || !isAuthenticated) {
            return;
        }

        let cancelled = false;
        const loadAddressStatus = async () => {
            setCheckingAddressStatus(true);
            try {
                const status = await getProfileAddressStatus();
                if (cancelled) return;

                setRegistrationZipcode(status.registration_address_zipcode ?? '');
                setRegistrationStreet(status.registration_address_street ?? '');
                setRegistrationNumber(status.registration_address_number ?? '');
                setRegistrationComplement(status.registration_address_complement ?? '');
                setRegistrationNeighborhood(status.registration_address_neighborhood ?? '');
                setRegistrationCity(status.registration_address_city ?? '');
                setRegistrationState(status.registration_address_state ?? '');
            } catch (err) {
                // Ignore error, fallback to empty fields
                console.error('Address status error', err);
            } finally {
                if (!cancelled) {
                    setCheckingAddressStatus(false);
                }
            }
        };

        loadAddressStatus();

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, isOpen]);

    useEffect(() => {
        if (isOpen) {
            setPixStage('SHIPPING');
            setSuccessData(null);
            setOrderTotal(null);
            setIsConfirmed(false);
            setTimeLeft(300);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    if (isSyncing) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center shadow-2xl">
                    <h2 className="text-2xl font-bold mb-2">Sincronizando carrinho</h2>
                    <p className="text-gray-600">
                        Aguarde um instante enquanto carregamos os itens mais recentes da sua conta.
                    </p>
                </div>
            </div>
        );
    }

    const handleCopyPix = () => {
        if (successData?.qr_code_copia_e_cola) {
            navigator.clipboard.writeText(successData.qr_code_copia_e_cola);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleSubmitManual = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSyncing) {
            alert('Aguarde a sincronização do carrinho terminar.');
            return;
        }
        if (items.length === 0) {
            alert('Seu carrinho está vazio.');
            return;
        }
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
            const currentTotal = total;
            const response = await api.post('/orders', payload);
            setOrderTotal(currentTotal);
            setManualSuccessData(response.data);
            await clearCart();
        } catch (err) {
            console.error('Failed to create order', err);
            alert('Erro ao criar pedido. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitPix = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSyncing) {
            alert('Aguarde a sincronização do carrinho terminar.');
            return;
        }
        if (items.length === 0) {
            alert('Seu carrinho está vazio.');
            return;
        }
        if (shippingType === 'FREE_DELIVERY_FOZ' && !requiredRegistrationAddressFilled) {
            alert('Preencha o endereço de cadastro completo para continuar.');
            return;
        }

        if (!validateCPF(cpfDigits)) {
            alert('CPF inválido. Por favor, verifique os números digitados.');
            return;
        }
        if (shippingType === 'FREE_DELIVERY_FOZ') {
            if (normalizeCity(registrationCity) !== 'foz do iguacu') {
                alert('Entrega grátis disponível apenas para Foz do Iguaçu. Selecione retirada na loja.');
                return;
            }
        }

        setLoading(true);

        const payload: CreateOrderPixPayload = {
            customer_cpf: cpfDigits,
            shipping_type: shippingType,
            items: items.map(item => ({
                product_id: item.id,
                quantity: item.quantity
            }))
        };

        if (shippingType === 'FREE_DELIVERY_FOZ') {
            payload.shipping_address_zipcode = registrationZipcode.trim();
            payload.shipping_address_street = registrationStreet.trim();
            payload.shipping_address_number = registrationNumber.trim();
            payload.shipping_address_complement = registrationComplement.trim() || undefined;
            payload.shipping_address_neighborhood = registrationNeighborhood.trim();
            payload.shipping_address_city = registrationCity.trim();
            payload.shipping_address_state = registrationState.trim();
        }

        try {
            const currentTotal = total;
            const response = await api.post('/checkout/pix', payload);
            setOrderTotal(currentTotal);
            setSuccessData(response.data);
            await clearCart();
        } catch (error: unknown) {
            console.error('Failed to process PIX order', error);
            const err = error as { response?: { status?: number, data?: { error?: string } } };
            if (err.response?.status === 401) {
                alert('Sessão expirada. Faça login novamente.');
            } else if (err.response?.status === 400) {
                alert(err.response?.data?.error || 'Não foi possível gerar o PIX agora.');
            } else {
                alert('Erro ao gerar código PIX. Verifique seu CPF e tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleNextFromShipping = () => {
        if (shippingType === 'FREE_DELIVERY_FOZ') {
            setPixStage('ADDRESS');
            return;
        }
        setPixStage('PAYMENT_METHOD');
    };

    const handleNextFromAddress = () => {
        if (!requiredRegistrationAddressFilled) {
            alert('Preencha o endereço de cadastro completo para continuar.');
            return;
        }
        if (normalizeCity(registrationCity) !== 'foz do iguacu') {
            alert('Entrega grátis disponível apenas para Foz do Iguaçu. Selecione retirada na loja.');
            return;
        }
        setPixStage('PAYMENT_METHOD');
    };

    const handleNextFromPaymentMethod = useCallback(() => {
        if (paymentMethod === 'PIX') {
            setPixStage('PIX');
        } else {
            setPixStage('CARD');
        }
    }, [paymentMethod]);

    const handleCancelCard = useCallback(() => {
        setPixStage('PAYMENT_METHOD');
    }, []);

    const handleSubmitCard = useCallback(async (cardData: { token: string; paymentMethodId: string; issuerId: string; installments: number; cpf: string }) => {
        if (isSyncing) {
            alert('Aguarde a sincronização do carrinho terminar.');
            return;
        }
        if (items.length === 0) {
            alert('Seu carrinho está vazio.');
            return;
        }

        const cpfFinal = cardData.cpf.replace(/\D/g, '') || cpfDigits;
        if (!validateCPF(cpfFinal)) {
            alert('CPF inválido. Por favor, verifique os números digitados.');
            return;
        }

        setLoading(true);

        const payload: any = {
            customer_cpf: cpfFinal,
            token: cardData.token,
            payment_method_id: cardData.paymentMethodId,
            issuer_id: cardData.issuerId || undefined,
            installments: cardData.installments,
            shipping_type: shippingType,
            items: items.map(item => ({
                product_id: item.id,
                quantity: item.quantity
            }))
        };

        if (shippingType === 'FREE_DELIVERY_FOZ') {
            payload.shipping_address_zipcode = registrationZipcode.trim();
            payload.shipping_address_street = registrationStreet.trim();
            payload.shipping_address_number = registrationNumber.trim();
            payload.shipping_address_complement = registrationComplement.trim() || undefined;
            payload.shipping_address_neighborhood = registrationNeighborhood.trim();
            payload.shipping_address_city = registrationCity.trim();
            payload.shipping_address_state = registrationState.trim();
        }

        try {
            const currentTotal = total;
            const response = await api.post('/checkout/card', payload);
            setOrderTotal(currentTotal);
            setSuccessData(response.data);
            setIsConfirmed(response.data.payment_status === 'approved');
            await clearCart();
        } catch (error: unknown) {
            console.error('Failed to process card order', error);
            const err = error as { response?: { status?: number, data?: { error?: string } } };
            if (err.response?.status === 401) {
                alert('Sessão expirada. Faça login novamente.');
            } else if (err.response?.status === 400 || err.response?.status === 502) {
                alert(err.response?.data?.error || 'Não foi possível processar o pagamento do cartão.');
            } else {
                alert('Erro ao processar o pagamento. Verifique os dados e tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    }, [isSyncing, items, cpfDigits, shippingType, registrationZipcode, registrationStreet, registrationNumber, registrationComplement, registrationNeighborhood, registrationCity, registrationState, total, clearCart]);

    const handleRegeneratePix = async () => {
        if (!successData?.id) return;
        setLoading(true);
        try {
            const response = await api.post(`/checkout/pix/${successData.id}/regenerate`);
            setSuccessData(response.data);
            setTimeLeft(300); // 5 minutes
        } catch (err) {
            console.error('Failed to regenerate PIX QR code', err);
            alert('Não foi possível gerar o QR Code novamente agora. Tente em instantes.');
        } finally {
            setLoading(false);
        }
    };

    if (manualSuccessData) {
        const phone = import.meta.env.VITE_STORE_WHATSAPP_NUMBER || '5545999252323';
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=Olá, gostaria de confirmar meu pedido N° ${manualSuccessData.order_number}`;

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center shadow-2xl">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Pedido Nº {manualSuccessData.order_number} Recebido!</h2>
                    <p className="text-gray-600 mb-6">
                        Seu pedido foi criado.
                        <br />Finalize enviando para nosso WhatsApp.
                    </p>

                    <a
                        href={whatsappUrl}
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

    if (successData) {
        if (isConfirmed || successData.payment_status === 'approved') {
            return (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center shadow-2xl flex flex-col items-center">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle className="w-16 h-16 text-green-500" />
                        </div>
                        <h2 className="text-3xl font-bold mb-2 text-green-600">Pagamento Confirmado!</h2>
                        <p className="text-gray-600 mb-8">
                            Recebemos seu pagamento com sucesso. Seu pedido <strong>N° {successData.order_number}</strong> está sendo processado.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full bg-black text-white font-bold py-4 px-6 rounded-xl hover:bg-gray-800 transition-all transform hover:scale-[1.02]"
                        >
                            Acompanhar Pedido
                        </button>
                    </div>
                </div>
            );
        }

        if (successData.payment_status === 'rejected' || successData.payment_status === 'cancelled') {
            return (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center shadow-2xl flex flex-col items-center relative">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
                            aria-label="Fechar"
                        >
                            <X size={20} />
                        </button>
                        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <X className="w-16 h-16 text-red-500" />
                        </div>
                        <h2 className="text-3xl font-bold mb-2 text-red-600">Pagamento Recusado</h2>
                        <p className="text-gray-600 mb-8">
                            Infelizmente seu pagamento não foi aprovado pelo emissor do cartão.
                            Por favor, tente novamente com outro cartão ou via Pix.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full bg-black text-white font-bold py-4 px-6 rounded-xl hover:bg-gray-800 transition-all"
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            );
        }

        if (paymentMethod !== 'PIX' && successData.payment_status === 'in_process') {
            return (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center shadow-2xl flex flex-col items-center relative">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
                            aria-label="Fechar"
                        >
                            <X size={20} />
                        </button>
                        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                            <Clock className="w-16 h-16 text-amber-500 animate-pulse" />
                        </div>
                        <h2 className="text-3xl font-bold mb-2 text-amber-600">Em Processamento</h2>
                        <p className="text-gray-600 mb-8">
                            Seu pagamento via cartão de crédito está em <strong>análise de segurança</strong>.
                            <br /><br />
                            Você pode acompanhar o status pela página <span className="font-bold">Meus Pedidos</span>, o status será atualizado automaticamente em alguns minutos.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full bg-black text-white font-bold py-4 px-6 rounded-xl hover:bg-gray-800 transition-all"
                        >
                            Acompanhar Pedido
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl flex flex-col items-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
                        <div
                            className="h-full bg-amber-500 transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                            style={{ width: `${(timeLeft / 300) * 100}%` }}
                        />
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
                        aria-label="Fechar"
                    >
                        <X size={20} />
                    </button>

                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                        <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
                    </div>

                    <h2 className="text-2xl font-bold mb-1 text-center">Aguardando Pagamento</h2>
                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-2xl font-mono font-black text-amber-600 bg-amber-50 px-6 py-2.5 rounded-full border border-amber-100 shadow-sm flex items-center gap-2">
                            <Clock size={20} /> {formatTime(timeLeft)}
                        </span>
                    </div>

                    <p className="text-gray-600 mb-6 text-center text-sm">
                        Pedido <strong>N° {successData.order_number}</strong>. Escaneie o QR Code abaixo para pagar via PIX.
                    </p>

                    {orderTotal !== null && (
                        <div className="w-full mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                            <span className="text-sm text-gray-600 font-medium">Total a pagar:</span>
                            <span className="text-xl font-bold text-black">R$ {orderTotal.toFixed(2)}</span>
                        </div>
                    )}

                    {qrImageSrc && (
                        <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-gray-200 mb-6 flex justify-center w-full shadow-inner">
                            <img
                                src={qrImageSrc}
                                alt="QR Code PIX"
                                className="w-48 h-48 mix-blend-multiply"
                            />
                        </div>
                    )}

                    {!qrImageSrc && (
                        <div className="w-full mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm italic text-center">
                            Gerando QR Code...
                        </div>
                    )}

                    {successData.qr_code_copia_e_cola && (
                        <div className="w-full mb-8">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">Pix Copia e Cola</p>
                            <div className="flex bg-gray-50 rounded-xl border border-gray-200 overflow-hidden p-1">
                                <input
                                    type="text"
                                    readOnly
                                    value={successData.qr_code_copia_e_cola}
                                    className="flex-1 bg-transparent px-3 py-2 outline-none text-xs text-gray-500 font-mono truncate"
                                />
                                <button
                                    onClick={handleCopyPix}
                                    className="bg-black text-white p-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center min-w-[44px]"
                                >
                                    {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="w-full space-y-3">
                        <p className="text-[10px] text-gray-400 text-center mb-2 flex items-center justify-center gap-1">
                            <ShieldCheck size={12} /> Confirmamos seu pagamento automaticamente
                        </p>

                        {timeLeft === 0 && (
                            <button
                                onClick={handleRegeneratePix}
                                disabled={loading}
                                className="w-full bg-amber-500 text-white font-bold py-4 px-6 rounded-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-200"
                            >
                                <QrCode size={20} />
                                {loading ? 'Gerando...' : 'Gerar Novo QR Code'}
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full bg-gray-50 text-gray-400 font-semibold py-3 px-6 rounded-xl hover:bg-gray-100 transition-colors text-xs"
                        >
                            Fechar e Acompanhar Depois
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-2xl max-h-[95vh] overflow-y-auto custom-scrollbar flex flex-col">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-black"
                >
                    <X size={24} />
                </button>

                <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-2xl font-bold flex-1">
                        Finalizar Pedido
                    </h2>
                </div>

                {USE_MERCADOPAGO ? (
                    !isAuthenticated ? (
                        <div className="py-2">
                            <AuthForm />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {checkingAddressStatus && (
                                <p className="text-xs text-gray-500">Carregando dados de endereço...</p>
                            )}

                            {pixStage === 'SHIPPING' && (
                                <>
                                    <div className="flex flex-col items-center mb-4 mt-2">
                                        <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-3">
                                            <Truck className="w-8 h-8 text-black" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800">Escolha o tipo de entrega</p>
                                    </div>
                                    <div>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer transition-colors hover:bg-gray-50">
                                                <input
                                                    type="radio"
                                                    name="shippingType"
                                                    value="PICKUP_STORE"
                                                    checked={shippingType === 'PICKUP_STORE'}
                                                    onChange={() => setShippingType('PICKUP_STORE')}
                                                />
                                                <span className="text-sm text-gray-800 font-medium">Retirada na loja (grátis)</span>
                                            </label>
                                            <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer transition-colors hover:bg-gray-50">
                                                <input
                                                    type="radio"
                                                    name="shippingType"
                                                    value="FREE_DELIVERY_FOZ"
                                                    checked={shippingType === 'FREE_DELIVERY_FOZ'}
                                                    onChange={() => setShippingType('FREE_DELIVERY_FOZ')}
                                                />
                                                <span className="text-sm text-gray-800 font-medium">Entrega em Foz do Iguaçu (grátis)</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="pt-4 mt-8">
                                        <button
                                            type="button"
                                            onClick={handleNextFromShipping}
                                            disabled={checkingAddressStatus}
                                            className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50 active:scale-95"
                                        >
                                            Continuar
                                        </button>
                                    </div>
                                </>
                            )}

                            {pixStage === 'ADDRESS' && (
                                <>
                                    <div className="flex flex-col items-center mb-4 mt-2">
                                        <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-3">
                                            <MapPin className="w-8 h-8 text-black" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800">Endereço de Entrega</p>
                                    </div>
                                    <div className="space-y-4 px-1">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                                            <input
                                                type="text"
                                                required
                                                maxLength={9}
                                                inputMode="numeric"
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                                                placeholder="00000-000"
                                                value={registrationZipcode}
                                                onChange={(e) => {
                                                    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                                                    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
                                                    setRegistrationZipcode(formatted);
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Rua</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                                                placeholder="Ex: Rua das Flores"
                                                value={registrationStreet}
                                                onChange={(e) => setRegistrationStreet(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                                                    placeholder="123"
                                                    value={registrationNumber}
                                                    onChange={(e) => setRegistrationNumber(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Complemento (Opcional)</label>
                                                <input
                                                    type="text"
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                                                    placeholder="Apto, bloco, etc."
                                                    value={registrationComplement}
                                                    onChange={(e) => setRegistrationComplement(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                                                placeholder="Ex: Centro"
                                                value={registrationNeighborhood}
                                                onChange={(e) => setRegistrationNeighborhood(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                                                    placeholder="Ex: Foz do Iguaçu"
                                                    value={registrationCity}
                                                    onChange={(e) => setRegistrationCity(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Estado (UF)</label>
                                                <input
                                                    type="text"
                                                    required
                                                    maxLength={2}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition uppercase"
                                                    placeholder="PR"
                                                    value={registrationState}
                                                    onChange={(e) => setRegistrationState(e.target.value.toUpperCase())}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-4 mt-8">
                                        <button
                                            type="button"
                                            onClick={() => setPixStage('SHIPPING')}
                                            className="w-full bg-gray-100 text-gray-800 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors"
                                        >
                                            Voltar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleNextFromAddress}
                                            className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors"
                                        >
                                            Continuar
                                        </button>
                                    </div>
                                </>
                            )}

                            {pixStage === 'PAYMENT_METHOD' && (
                                <>
                                    <div className="flex flex-col items-center mb-4 mt-2">
                                        <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-3">
                                            <ShieldCheck className="w-8 h-8 text-black" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800">Meio de Pagamento</p>
                                    </div>
                                    <div>
                                        <div className="space-y-3">
                                            <label className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors ${paymentMethod === 'PIX' ? 'border-black bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value="PIX"
                                                        checked={paymentMethod === 'PIX'}
                                                        onChange={() => setPaymentMethod('PIX')}
                                                        className="w-4 h-4 text-black accent-black"
                                                    />
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" className="w-5 h-5 fill-current text-green-500">
                                                        <path d="M 25 0.0390625 C 22.84 0.0390625 20.799531 0.88015625 19.269531 2.4101562 L 9.6796875 12 L 12.929688 12 C 14.529687 12 16.039922 12.619766 17.169922 13.759766 L 23.939453 20.529297 C 24.519453 21.109297 25.480547 21.109531 26.060547 20.519531 L 32.830078 13.759766 C 33.960078 12.619766 35.470312 12 37.070312 12 L 40.320312 12 L 30.730469 2.4101562 C 29.200469 0.88015625 27.16 0.0390625 25 0.0390625 z M 7.6796875 14 L 2.4101562 19.269531 C -0.74984375 22.429531 -0.74984375 27.570469 2.4101562 30.730469 L 7.6796875 36 L 12.929688 36 C 13.999687 36 14.999766 35.580078 15.759766 34.830078 L 22.529297 28.060547 C 23.889297 26.700547 26.110703 26.700547 27.470703 28.060547 L 34.240234 34.830078 C 35.000234 35.580078 36.000312 36 37.070312 36 L 42.320312 36 L 47.589844 30.730469 C 50.749844 27.570469 50.749844 22.429531 47.589844 19.269531 L 42.320312 14 L 37.070312 14 C 36.000313 14 35.000234 14.419922 34.240234 15.169922 L 27.470703 21.939453 C 26.790703 22.619453 25.9 22.960938 25 22.960938 C 24.1 22.960937 23.209297 22.619453 22.529297 21.939453 L 15.759766 15.169922 C 14.999766 14.419922 13.999688 14 12.929688 14 L 7.6796875 14 z M 25 29.037109 C 24.615 29.038359 24.229453 29.185469 23.939453 29.480469 L 17.169922 36.240234 C 16.039922 37.380234 14.529687 38 12.929688 38 L 9.6796875 38 L 19.269531 47.589844 C 20.799531 49.119844 22.84 49.960938 25 49.960938 C 27.16 49.960938 29.200469 49.119844 30.730469 47.589844 L 40.320312 38 L 37.070312 38 C 35.470313 38 33.960078 37.380234 32.830078 36.240234 L 26.060547 29.470703 C 25.770547 29.180703 25.385 29.035859 25 29.037109 z" />
                                                    </svg>
                                                    <span className="text-sm font-bold text-gray-800">Pix</span>
                                                </div>
                                                <span className="text-xs px-2 py-1 rounded font-semibold bg-green-100 text-green-800">Instantâneo</span>
                                            </label>

                                            <label className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors ${paymentMethod === 'CREDIT_CARD' ? 'border-black bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value="CREDIT_CARD"
                                                        checked={paymentMethod === 'CREDIT_CARD'}
                                                        onChange={() => setPaymentMethod('CREDIT_CARD')}
                                                        className="w-4 h-4 text-black accent-black"
                                                    />
                                                    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${paymentMethod === 'CREDIT_CARD' ? 'text-black' : 'text-gray-400'}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect width="20" height="14" x="2" y="5" rx="2" />
                                                        <line x1="2" x2="22" y1="10" y2="10" />
                                                    </svg>
                                                    <span className="text-sm font-bold text-gray-800">Cartão de Crédito</span>
                                                </div>
                                                <span className={`text-xs ${paymentMethod === 'CREDIT_CARD' ? 'text-black font-medium' : 'text-gray-500'}`}>Apenas 1x</span>
                                            </label>

                                            <label className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors ${paymentMethod === 'DEBIT_CARD' ? 'border-black bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value="DEBIT_CARD"
                                                        checked={paymentMethod === 'DEBIT_CARD'}
                                                        onChange={() => setPaymentMethod('DEBIT_CARD')}
                                                        className="w-4 h-4 text-black accent-black"
                                                    />
                                                    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${paymentMethod === 'DEBIT_CARD' ? 'text-black' : 'text-gray-400'}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect width="20" height="14" x="2" y="5" rx="2" />
                                                        <line x1="2" x2="22" y1="10" y2="10" />
                                                        <path d="M7 15h0" />
                                                        <path d="M11 15h2" />
                                                    </svg>
                                                    <span className="text-sm font-bold text-gray-800">Cartão de Débito</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-4 mt-8">
                                        <button
                                            type="button"
                                            onClick={() => setPixStage(shippingType === 'FREE_DELIVERY_FOZ' ? 'ADDRESS' : 'SHIPPING')}
                                            className="w-full bg-gray-100 text-gray-800 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors"
                                        >
                                            Voltar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleNextFromPaymentMethod}
                                            className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors"
                                        >
                                            Continuar
                                        </button>
                                    </div>
                                </>
                            )}

                            {pixStage === 'CARD' && (
                                <CardPaymentForm
                                    total={orderTotal || total}
                                    email={user?.email || ''}
                                    cpfDefault={cpf}
                                    paymentType={paymentMethod as 'CREDIT_CARD' | 'DEBIT_CARD'}
                                    loading={loading}
                                    onSubmit={handleSubmitCard}
                                    onCancel={handleCancelCard}
                                />
                            )}

                            {pixStage === 'PIX' && (
                                <>
                                    <div className="flex flex-col items-center mb-4 mt-2">
                                        <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-3">
                                            <Fingerprint className="w-8 h-8 text-black" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800">Confirmação de Identidade</p>
                                    </div>
                                    <div className="text-center mb-4">
                                        <p className="text-sm text-gray-600">Para emitir a chave PIX, informe seu CPF.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">CPF (apenas números)</label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={14}
                                            inputMode="numeric"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                                            placeholder="000.000.000-00"
                                            value={cpf}
                                            onChange={(e) => {
                                                const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                                                const formatted = digits
                                                    .replace(/^(\d{3})(\d)/, '$1.$2')
                                                    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
                                                    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
                                                setCpf(formatted);
                                            }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-4 mt-8">
                                        <button
                                            type="button"
                                            onClick={() => setPixStage('PAYMENT_METHOD')}
                                            className="w-full bg-gray-100 text-gray-800 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors"
                                        >
                                            Voltar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSubmitPix}
                                            disabled={loading || cpfDigits.length < 11}
                                            className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {loading ? 'Gerando PIX...' : <><QrCode size={20} /> Gerar PIX</>}
                                        </button>
                                    </div>
                                </>
                            )}

                            {pixStage !== 'CARD' && (
                                <div className="text-center mt-3">
                                    <span className="text-xs text-gray-500 font-medium flex items-center justify-center gap-1">
                                        <ShieldCheck size={14} /> Processado de forma segura
                                    </span>
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    <form onSubmit={handleSubmitManual} className="space-y-4">
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
                            className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 mt-4 outline-none"
                        >
                            {loading ? 'Enviando...' : 'Confirmar Pedido'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
