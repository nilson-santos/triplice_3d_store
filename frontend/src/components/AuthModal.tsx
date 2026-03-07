import { X } from 'lucide-react';
import { AuthForm } from './AuthForm';
import type { ViewState } from './AuthForm';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialView?: 'login' | 'register';
}

export const AuthModal = ({ isOpen, onClose, initialView = 'login' }: AuthModalProps) => {

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-8 relative shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black">
                    <X size={24} />
                </button>

                <AuthForm onSuccess={onClose} initialView={initialView as ViewState} />
            </div>
        </div>
    );
};
