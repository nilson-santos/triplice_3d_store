import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { api, getProfileAddressStatus } from '../api';
import type { CreateOrderPayload, CreateOrderPixPayload, OrderPixResponse } from '../api';
import { X, CheckCircle, Smartphone, QrCode, Copy, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const parseUseMercadoPago = () => {
    const rawFlag = import.meta.env.VITE_USE_MERCADOPAGO;
    if (typeof rawFlag !== 'string' || rawFlag.trim() === '') {
        return true;
    }
    return rawFlag.trim().toLowerCase() === 'true';
};

const USE_MERCADOPAGO = parseUseMercadoPago();

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CheckoutModal = ({ isOpen, onClose }: CheckoutModalProps) => {
    const { items, total, clearCart } = useCart();
    const { isAuthenticated, user } = useAuth();
    const [cpf, setCpf] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [checkingAddressStatus, setCheckingAddressStatus] = useState(false);
    const [pixStage, setPixStage] = useState<'SHIPPING' | 'ADDRESS' | 'PIX'>('SHIPPING');
    const [shippingType, setShippingType] = useState<'PICKUP_STORE' | 'FREE_DELIVERY_FOZ'>('PICKUP_STORE');
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

    const [copied, setCopied] = useState(false);
    const cpfDigits = cpf.replace(/\D/g, '');
    const zipcodeDigits = registrationZipcode.replace(/\D/g, '');
    const requiredRegistrationAddressFilled =
        zipcodeDigits.length === 8 &&
        registrationStreet.trim().length > 0 &&
        registrationNumber.trim().length > 0 &&
        registrationNeighborhood.trim().length > 0 &&
        registrationCity.trim().length > 0 &&
        registrationState.trim().length > 0;
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
    const totalPixSteps = shippingType === 'FREE_DELIVERY_FOZ' ? 3 : 2;
    const currentPixStep = pixStage === 'SHIPPING' ? 1 : pixStage === 'ADDRESS' ? 2 : totalPixSteps;

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
            } catch (error) {
                // Keep empty address fields if loading fails.
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
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCopyPix = () => {
        if (successData?.qr_code_copia_e_cola) {
            navigator.clipboard.writeText(successData.qr_code_copia_e_cola);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleSubmitManual = async (e: React.FormEvent) => {
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
            setManualSuccessData(response.data);
            clearCart();
        } catch (error) {
            console.error('Failed to create order', error);
            alert('Erro ao criar pedido. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitPix = async (e: React.FormEvent) => {
        e.preventDefault();
        if (shippingType === 'FREE_DELIVERY_FOZ' && !requiredRegistrationAddressFilled) {
            alert('Preencha o endereço de cadastro completo para continuar.');
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
            const response = await api.post('/checkout/pix', payload);
            setSuccessData(response.data);
            clearCart();
        } catch (error: any) {
            console.error('Failed to process PIX order', error);
            if (error.response?.status === 401) {
                alert('Sessão expirada. Faça login novamente.');
            } else if (error.response?.status === 400) {
                alert(error.response?.data?.error || 'Não foi possível gerar o PIX agora.');
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
        setPixStage('PIX');
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
        setPixStage('PIX');
    };

    const handleRegeneratePix = async () => {
        if (!successData?.id) return;
        setLoading(true);
        try {
            const response = await api.post(`/checkout/pix/${successData.id}/regenerate`);
            setSuccessData(response.data);
        } catch (error: any) {
            console.error('Failed to regenerate PIX QR code', error);
            alert('Não foi possível gerar o QR Code novamente agora. Tente em instantes.');
        } finally {
            setLoading(false);
        }
    };

    if (manualSuccessData) {
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
                        href={manualSuccessData.whatsapp_url}
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
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center shadow-2xl flex flex-col items-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2 text-center w-full">Pedido Nº {successData.order_number}</h2>
                    <p className="text-gray-600 mb-6 text-center">
                        Escaneie o QR Code abaixo pelo aplicativo do seu banco para pagar.
                    </p>

                    {qrImageSrc && (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 flex justify-center w-full">
                            <img
                                src={qrImageSrc}
                                alt="QR Code PIX"
                                className="w-48 h-48 mix-blend-multiply"
                            />
                        </div>
                    )}
                    {!qrImageSrc && (
                        <div className="w-full mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                            QR Code ainda não disponível. Gere novamente para tentar concluir o pagamento.
                        </div>
                    )}

                    {successData.qr_code_copia_e_cola && (
                        <div className="w-full mb-6">
                            <p className="text-sm font-medium text-gray-700 mb-2">Ou use o Pix Copia e Cola:</p>
                            <div className="flex bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                <input
                                    type="text"
                                    readOnly
                                    value={successData.qr_code_copia_e_cola}
                                    className="flex-1 bg-transparent p-3 outline-none text-sm text-gray-600 font-mono"
                                />
                                <button
                                    onClick={handleCopyPix}
                                    className="bg-black text-white px-4 hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                        </div>
                    )}

                    <p className="text-sm text-gray-500 text-center mb-6 flex items-center justify-center gap-2">
                        <ShieldCheck size={16} /> Pagamento Seguro via Mercado Pago
                    </p>

                    {successData.payment_status !== 'approved' && (
                        <button
                            onClick={handleRegeneratePix}
                            disabled={loading}
                            className="w-full mb-3 bg-black text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Gerando novamente...' : 'Gerar QR Code Novamente'}
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full bg-gray-100 text-gray-800 font-bold py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                        Fechar e Acompanhar Pedido
                    </button>
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

                <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Total ({items.length} itens)</span>
                        <span className="font-bold text-black text-lg">R$ {total.toFixed(2)}</span>
                    </div>
                </div>

                {USE_MERCADOPAGO ? (
                    !isAuthenticated ? (
                        <div className="text-center py-6">
                            <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold mb-2">Faça Login para Pagar com PIX</h3>
                            <p className="text-gray-600 text-sm mb-6">
                                É necessário ter uma conta para acompanhar seus pedidos e pagamentos.
                            </p>
                            <button
                                onClick={() => {/* TODO Trigger Login */ }}
                                className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors"
                            >
                                Fazer Login ou Criar Conta
                            </button>
                        </div>
                    ) : (
                        <form
                            onSubmit={handleSubmitPix}
                            className="space-y-4"
                        >
                            <p className="text-sm text-gray-600">Olá, <strong>{user?.name}</strong>.</p>
                            <p className="text-xs text-gray-500">Etapa {currentPixStep} de {totalPixSteps}</p>
                            {checkingAddressStatus && (
                                <p className="text-xs text-gray-500">Carregando dados de endereço...</p>
                            )}

                            {pixStage === 'SHIPPING' && (
                                <>
                                    <div>
                                        <p className="block text-sm font-medium text-gray-700 mb-2">Tipo de Frete</p>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="shippingType"
                                                    value="PICKUP_STORE"
                                                    checked={shippingType === 'PICKUP_STORE'}
                                                    onChange={() => setShippingType('PICKUP_STORE')}
                                                />
                                                <span className="text-sm text-gray-800">Retirada na loja (grátis)</span>
                                            </label>
                                            <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="shippingType"
                                                    value="FREE_DELIVERY_FOZ"
                                                    checked={shippingType === 'FREE_DELIVERY_FOZ'}
                                                    onChange={() => setShippingType('FREE_DELIVERY_FOZ')}
                                                />
                                                <span className="text-sm text-gray-800">Entrega em Foz do Iguaçu (grátis)</span>
                                            </label>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleNextFromShipping}
                                        disabled={checkingAddressStatus}
                                        className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 mt-4"
                                    >
                                        Continuar
                                    </button>
                                </>
                            )}

                            {pixStage === 'ADDRESS' && (
                                <>
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
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
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
                                    <div className="grid grid-cols-2 gap-3">
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

                            {pixStage === 'PIX' && (
                                <>
                                    <p className="text-sm text-gray-600">Para emitir a chave PIX, confirme seu CPF.</p>
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
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setPixStage(shippingType === 'FREE_DELIVERY_FOZ' ? 'ADDRESS' : 'SHIPPING')}
                                            className="w-full bg-gray-100 text-gray-800 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors"
                                        >
                                            Voltar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading || cpfDigits.length < 11}
                                            className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {loading ? 'Gerando PIX...' : <><QrCode size={20} /> Gerar PIX</>}
                                        </button>
                                    </div>
                                </>
                            )}

                            <div className="text-center mt-3">
                                <span className="text-xs text-gray-500 font-medium flex items-center justify-center gap-1">
                                    <ShieldCheck size={14} /> Processado de forma segura
                                </span>
                            </div>
                        </form>
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
                            className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 mt-4"
                        >
                            {loading ? 'Enviando...' : 'Confirmar Pedido'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
