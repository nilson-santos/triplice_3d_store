import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    errorMessage: string;
}

export class CheckoutErrorBoundary extends Component<Props, State> {
    state: State = {
        hasError: false,
        errorMessage: '',
    };

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            errorMessage: error.message || 'Erro desconhecido no checkout.',
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Checkout render error', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                        <h2 className="text-xl font-bold mb-3">Erro ao abrir o checkout</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            O React encontrou um erro ao renderizar a tela de finalizacao.
                        </p>
                        <pre className="whitespace-pre-wrap break-words rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
                            {this.state.errorMessage}
                        </pre>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
