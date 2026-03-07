import { useState, useEffect } from 'react';
import { Mail, User, Phone, KeyRound, ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export type ViewState = 'login' | 'register' | 'verify-otp';

interface AuthFormProps {
    onSuccess?: () => void;
    initialView?: ViewState;
}

export const AuthForm = ({ onSuccess, initialView = 'login' }: AuthFormProps) => {
    const { login } = useAuth();
    const [view, setView] = useState<ViewState>(initialView);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form fields
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    const formatPhone = (rawValue: string) => {
        const digits = rawValue.replace(/\D/g, '').slice(0, 11);
        if (digits.length <= 2) return digits;
        if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    };

    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendTimer]);

    const clearMessages = () => {
        setError('');
        setSuccess('');
    };

    const handleRequestCode = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        clearMessages();
        try {
            await api.post('/auth/request-code', { email });
            setSuccess('Enviamos um código de acesso para o seu e-mail.');
            setView('verify-otp');
            setResendTimer(60);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || 'Erro ao solicitar código. Verifique se a conta existe.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        clearMessages();
        try {
            await api.post('/auth/register', { name, email, phone });
            setSuccess('Conta criada! Enviamos um código de acesso para seu e-mail.');
            setView('verify-otp');
            setResendTimer(60);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || 'Erro ao registrar.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        clearMessages();
        try {
            const res = await api.post('/auth/verify-otp', { email, code: otp });
            login(res.data.access, res.data.user_name, res.data.email_verified, !!res.data.is_staff);
            if (onSuccess) onSuccess();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || 'Código inválido ou expirado.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setOtp('');
        await handleRequestCode();
    };

    return (
        <div className="w-full">
            <div className="mb-6">
                <h2 className="text-2xl font-bold">
                    {view === 'login' && 'Entrar'}
                    {view === 'register' && 'Criar Conta'}
                    {view === 'verify-otp' && 'Verificar Código'}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                    {view === 'login' && 'Acesse sua conta. Enviaremos um código por e-mail.'}
                    {view === 'register' && 'Crie sua conta para uma experiência completa.'}
                    {view === 'verify-otp' && `Digite o código enviado para ${email || 'seu e-mail'}.`}
                </p>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm border border-green-100">{success}</div>}

            {view === 'login' && (
                <form onSubmit={handleRequestCode} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none" placeholder="seu@email.com" />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition flex justify-center items-center gap-2 mt-6">
                        {loading ? 'Aguarde...' : <>Continuar com E-mail <ArrowRight size={18} /></>}
                    </button>
                    <p className="text-center text-sm text-gray-600 mt-4">
                        <button type="button" onClick={() => { setView('register'); clearMessages(); }} className="font-bold text-black border-b border-black">Crie sua conta</button>
                    </p>
                </form>
            )}

            {view === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input type="text" required value={name} onChange={e => setName(e.target.value)}
                                className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none" placeholder="seu@email.com" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="tel"
                                required
                                inputMode="numeric"
                                maxLength={15}
                                value={phone}
                                onChange={e => setPhone(formatPhone(e.target.value))}
                                className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                placeholder="(45) 99999-9999"
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition mt-6">
                        {loading ? 'Aguarde...' : 'Criar Conta'}
                    </button>
                    <p className="text-center text-sm text-gray-600 mt-4">
                        Já tem conta? <button type="button" onClick={() => { setView('login'); clearMessages(); }} className="font-bold text-black border-b border-black">Fazer Login</button>
                    </p>
                </form>
            )}

            {view === 'verify-otp' && (
                <form onSubmit={handleVerify} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Código de 6 dígitos</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input type="text" required value={otp} onChange={e => setOtp(e.target.value)} maxLength={6}
                                className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none text-center tracking-[0.5em] font-mono text-lg" placeholder="000000" />
                        </div>
                    </div>
                    <button type="submit" disabled={loading || otp.length < 6} className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition">
                        {loading ? 'Validando...' : 'Entrar na Conta'}
                    </button>

                    <div className="flex flex-col items-center gap-1 mt-4">
                        <button type="button" onClick={handleResendCode} disabled={loading || resendTimer > 0} className="text-xs font-semibold text-gray-600 flex items-center justify-center gap-1.5 hover:text-black transition disabled:opacity-50 py-2">
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            {resendTimer > 0 ? `Aguarde ${resendTimer}s para reenviar` : 'Reenviar código'}
                        </button>
                        <button type="button" onClick={() => { setView('login'); setOtp(''); }} className="text-sm text-gray-400 hover:text-black py-1">
                            Voltar
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};
