import { useEffect, useRef, useState } from 'react';
import { CreditCard, Fingerprint, Mail, ShieldCheck, User } from 'lucide-react';

interface CardPaymentFormProps {
    total: number;
    email: string;
    cpfDefault: string;
    paymentType: 'CREDIT_CARD' | 'DEBIT_CARD';
    onSubmit: (data: { token: string; paymentMethodId: string; issuerId: string; installments: number; cpf: string }) => void;
    onCancel: () => void;
    loading: boolean;
}

const formatCpf = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length <= 11) {
        return v
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    }
    return value;
};

const getPayerCosts = (installments: any): any[] => {
    if (!installments) return [];
    if (Array.isArray(installments)) {
        const first = installments[0];
        return Array.isArray(first?.payer_costs) ? first.payer_costs : [];
    }
    return Array.isArray(installments.payer_costs) ? installments.payer_costs : [];
};

export const CardPaymentForm = ({ total, email, cpfDefault, paymentType, onSubmit, onCancel, loading }: CardPaymentFormProps) => {
    const initialized = useRef(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [statusText, setStatusText] = useState('');
    const [sdkError, setSdkError] = useState('');
    const onSubmitRef = useRef(onSubmit);
    const paymentTypeRef = useRef(paymentType);
    const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY?.trim();

    // Update refs on every render to ensure callbacks/types are current without re-initializing SDK
    useEffect(() => {
        onSubmitRef.current = onSubmit;
        paymentTypeRef.current = paymentType;
    });

    useEffect(() => {
        if (initialized.current) return;

        if (!publicKey) {
            setSdkError('A chave publica do Mercado Pago nao foi configurada no frontend.');
            return;
        }

        if (!window.MercadoPago) {
            setSdkError('O SDK do Mercado Pago nao foi carregado.');
            return;
        }

        setSdkError('');
        const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });

        initialized.current = true;

        const cardForm = mp.cardForm({
            amount: String(total),
            iframe: true,
            form: {
                id: "form-checkout",
                cardNumber: {
                    id: "form-checkout__cardNumber",
                    placeholder: "0000 0000 0000 0000",
                    style: { fontSize: "16px", padding: '12px' }
                },
                expirationDate: {
                    id: "form-checkout__expirationDate",
                    placeholder: "MM/YY",
                    style: { fontSize: "16px", padding: '12px' }
                },
                securityCode: {
                    id: "form-checkout__securityCode",
                    placeholder: "CVV",
                    style: { fontSize: "16px", padding: '12px' }
                },
                cardholderName: {
                    id: "form-checkout__cardholderName",
                    placeholder: "Titular do cartão"
                },
                issuer: {
                    id: "form-checkout__issuer",
                    placeholder: "Banco emissor"
                },
                installments: {
                    id: "form-checkout__installments",
                    placeholder: "Parcelas"
                },
                identificationType: {
                    id: "form-checkout__identificationType",
                },
                identificationNumber: {
                    id: "form-checkout__identificationNumber",
                    placeholder: "CPF"
                },
                cardholderEmail: {
                    id: "form-checkout__cardholderEmail",
                    placeholder: "E-mail"
                }
            },
            callbacks: {
                onFormMounted: (error: any) => {
                    if (error) return console.warn("FormMounted error: ", error);
                },
                onSubmit: (event: any) => {
                    event.preventDefault();
                    if (loading) return;
                    setStatusText('Processando pagamento...');
                    const formData = cardForm.getCardFormData();

                    const installmentsSelect = document.getElementById('form-checkout__installments') as HTMLSelectElement;
                    let finalInstallments = installmentsSelect ? parseInt(installmentsSelect.value || '1', 10) : 1;

                    // For debit cards, always force 1 installment
                    if (paymentTypeRef.current === 'DEBIT_CARD') {
                        finalInstallments = 1;
                    }

                    const cpfInput = document.getElementById('form-checkout__identificationNumber') as HTMLInputElement;

                    onSubmitRef.current({
                        token: formData.token,
                        paymentMethodId: formData.paymentMethodId,
                        issuerId: formData.issuerId,
                        installments: finalInstallments,
                        cpf: cpfInput ? cpfInput.value : ''
                    });
                },
                onFetching: (resource: any) => {
                    console.log("Fetching resource: ", resource);
                },
                onInstallmentsReceived: (error: any, installments: any) => {
                    if (error) {
                        console.warn("MP SDK Installments error: ", error);
                        return;
                    }
                    const select = document.getElementById('form-checkout__installments') as HTMLSelectElement;
                    if (!select) return;

                    // Clear and manually populate installments avoiding SDK crash
                    select.options.length = 0;
                    const payerCosts = getPayerCosts(installments);
                    if (payerCosts.length > 0) {
                        payerCosts.forEach((ic: any) => {
                            select.options.add(new Option(ic.recommended_message, ic.installments));
                        });
                    } else {
                        select.options.add(new Option('1x', '1'));
                    }
                },
                onPaymentMethodsReceived: (error: any, paymentMethods: any[]) => {
                    if (error) {
                        setStatusText('Erro ao obter métodos de pagamento. Verifique o número do cartão.');
                    } else {
                        setStatusText('');
                        const isDebit = paymentMethods.some((p: any) => p.payment_type_id === 'debit_card');
                        if (paymentTypeRef.current === 'DEBIT_CARD' && !isDebit) {
                            setStatusText("O cartão inserido não parece ser de débito. Tente outro.");
                        }
                    }
                },
                onError: (error: any) => {
                    console.error("MP SDK Form ValidationError:", error);
                    if (error && error.length > 0) {
                        // error is usually an array of fields that failed validation
                        const rawError = error.map((e: any) => `${e.message || 'Erro de validacao'} (${e.code || 'unknown'})`).join(', ');
                        const hasInstallmentCrash = rawError.toLowerCase().includes('payer_costs');
                        const errorMap = hasInstallmentCrash
                            ? 'Nao foi possivel carregar as opcoes de parcelamento. Tente novamente em alguns segundos.'
                            : rawError;
                        setStatusText(`Erro nos dados: ${errorMap}`);
                    }
                }
            }
        });

        // Small delay to ensure form inputs are properly set
        setTimeout(() => {
            const emailInput = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement;
            if (emailInput && email) emailInput.value = email;

            const docInput = document.getElementById('visible-cpf') as HTMLInputElement;
            const hiddenDocInput = document.getElementById('form-checkout__identificationNumber') as HTMLInputElement;

            if (docInput && cpfDefault) {
                docInput.value = formatCpf(cpfDefault);
            }
            if (hiddenDocInput && cpfDefault) {
                hiddenDocInput.value = cpfDefault.replace(/\D/g, '');
            }
        }, 500);

        return () => {
            if (cardForm) cardForm.unmount();
            initialized.current = false;
        };
    }, [total, email, cpfDefault, publicKey]); // Removed onSubmit and paymentType dependencies as they are now in refs

    return (
        <form id="form-checkout" ref={formRef} className="space-y-4 pt-2">
            <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-3">
                    <CreditCard className="w-8 h-8 text-black" />
                </div>
                <p className="text-sm font-semibold text-gray-800">
                    {paymentType === 'CREDIT_CARD' ? 'Pagamento via Crédito' : 'Pagamento via Débito'}
                </p>
                <p className="text-xs text-gray-500">Formato seguro Mercado Pago</p>
            </div>

            <div className="space-y-4 px-1 pb-4">
                {/* Secure fields from Mercado Pago */}
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Número do Cartão</label>
                        <div id="form-checkout__cardNumber" className="w-full h-12 bg-white border border-gray-300 rounded-lg outline-none transition px-2"></div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Validade</label>
                        <div id="form-checkout__expirationDate" className="w-full h-12 bg-white border border-gray-300 rounded-lg outline-none transition px-2"></div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                        <div id="form-checkout__securityCode" className="w-full h-12 bg-white border border-gray-300 rounded-lg outline-none transition px-2"></div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome no Cartão</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User size={16} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            id="form-checkout__cardholderName"
                            className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="hidden">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Banco Emissor</label>
                        <select id="form-checkout__issuer" className="w-full p-3 border border-gray-300 rounded-lg outline-none transition"></select>
                    </div>
                    <div className="hidden">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
                        <select id="form-checkout__identificationType" className="w-full p-3 border border-gray-300 rounded-lg outline-none transition"></select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CPF do Titular</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Fingerprint size={16} className="text-gray-400" />
                        </div>
                        <input
                            type="hidden"
                            id="form-checkout__identificationNumber"
                            name="identificationNumber"
                        />
                        <input
                            type="text"
                            id="visible-cpf"
                            onChange={(e) => {
                                const formatted = formatCpf(e.target.value);
                                e.target.value = formatted;
                                const hiddenInput = document.getElementById('form-checkout__identificationNumber') as HTMLInputElement;
                                if (hiddenInput) {
                                    hiddenInput.value = formatted.replace(/\D/g, '');
                                }
                            }}
                            maxLength={14}
                            className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                        />
                    </div>
                </div>

                <div className="hidden">
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail size={16} className="text-gray-400" />
                        </div>
                        <input
                            type="email"
                            id="form-checkout__cardholderEmail"
                            className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                        />
                    </div>
                </div>

                <div className={paymentType === 'DEBIT_CARD' ? 'hidden' : 'block'}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opção de Pagamento</label>
                    {/* Always visible single installment or dynamic select */}
                    <select
                        id="form-checkout__installments"
                        className="w-full p-3 border border-gray-300 rounded-lg outline-none transition bg-white"
                    >
                    </select>
                </div>

                {statusText && (
                    <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100 flex items-start gap-2">
                        <span className="mt-0.5">ℹ️</span>
                        <span>{statusText}</span>
                    </div>
                )}

                {sdkError && (
                    <div className="p-3 bg-red-50 text-red-800 text-sm rounded-lg border border-red-100">
                        {sdkError}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 mt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="w-full bg-gray-100 text-gray-800 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                    Voltar
                </button>
                <button
                    type="submit"
                    id="form-checkout__submit"
                    disabled={loading || !!sdkError}
                    className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? 'Processando...' : <><ShieldCheck size={20} /> Pagar</>}
                </button>
            </div>

            <div className="text-center mt-3">
                <span className="text-xs text-gray-500 font-medium flex items-center justify-center gap-1">
                    <ShieldCheck size={14} className="text-green-500" /> Pagamento 100% seguro pelo Mercado Pago
                </span>
            </div>
        </form>
    );
};
