import { Instagram, Phone } from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { Link } from 'react-router-dom';

export const Footer = () => {
    return (
        <footer className="bg-white border-t border-gray-100 mt-auto">
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    {/* Column 1: Institucional */}
                    <div>
                        <h3 className="font-bold text-lg mb-4">Institucional</h3>
                        <ul className="space-y-2 text-gray-600">
                            <li>
                                <Link to="/privacy" className="hover:text-black transition-colors">
                                    Política de privacidade
                                </Link>
                            </li>
                            <li>
                                <Link to="/terms" className="hover:text-black transition-colors">
                                    Termos de uso
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 2: Contato */}
                    <div>
                        <h3 className="font-bold text-lg mb-4">Contato</h3>
                        <ul className="space-y-3 text-gray-600">
                            <li className="flex items-center gap-2">
                                <SiWhatsapp size={18} />
                                <a
                                    href="https://wa.me/5545991080886"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-black transition-colors"
                                >
                                    (45) 99108-0886
                                </a>
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone size={18} />
                                <span>Seg. a Sex. das 9h às 18h</span>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Redes Sociais */}
                    <div>
                        <h3 className="font-bold text-lg mb-4">Redes Sociais</h3>
                        <div className="flex gap-4">
                            <a
                                href="https://instagram.com/triplice.3d/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all"
                                aria-label="Instagram"
                            >
                                <Instagram size={20} />
                            </a>
                            <a
                                href="https://wa.me/5545991080886"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-all"
                                aria-label="WhatsApp"
                            >
                                <SiWhatsapp size={20} />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-100 text-center text-gray-500 text-sm">
                    <p>
                        Copyright &copy; {new Date().getFullYear()} Todos os direitos reservados | <a href="https://api.triplice3d.com.br/admin" className="hover:text-black transition-colors">Tríplice 3D</a>
                    </p>
                </div>
            </div>
        </footer>
    );
};
