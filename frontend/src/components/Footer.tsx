// // import { Heart } from 'lucide-react';

export const Footer = () => {
    return (
        <footer className="bg-white border-t border-gray-100 py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
                <p>
                    Copyright &copy; {new Date().getFullYear()} Todos os direitos reservados | <a href="https://api.triplice3d.com.br/admin">Tríplice 3D</a>
                </p>
            </div>
        </footer>
    );
};
