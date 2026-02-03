import { ArrowRight, MessageCircle, Phone, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '../assets/hero-image.png';

export const Home = () => {
    return (
        <div className="relative overflow-hidden">
            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 py-12 sm:py-20 grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6">
                        Arte Materializada em <span className="text-gray-500">3 Dimensões.</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-8 max-w-lg">
                        Decoração exclusiva, impressa sob demanda com precisão e design paramétrico. Transforme seu ambiente.
                    </p>
                    <div className="flex gap-4">
                        <Link
                            to="/catalog"
                            className="btn-glow-animate text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg"
                        >
                            Ver Catálogo <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>

                <div className="relative flex justify-center">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 to-purple-50 rounded-full blur-3xl opacity-50 -z-10"></div>
                    <div className="rounded-2xl overflow-hidden shadow-xl max-w-sm">
                        <img src={heroImage} alt="Vaso 3D Paramétrico" className="w-full h-auto object-cover" />
                    </div>
                </div>
            </div>

            {/* Contact Section */}
            <div id="contact" className="bg-gray-50 py-16 border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">Entre em Contato</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Dúvidas sobre produtos personalizados ou parcerias? Nossa equipe está pronta para materializar sua ideia.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <a
                            href="https://wa.me/554591080886"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col items-center text-center group"
                        >
                            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                <MessageCircle size={24} />
                            </div>
                            <h3 className="font-bold mb-2">WhatsApp</h3>
                            <p className="text-gray-600">(45) 9108-0886</p>
                        </a>

                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center group">
                            <div className="w-12 h-12 bg-gray-100 text-black rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                <Phone size={24} />
                            </div>
                            <h3 className="font-bold mb-2">Atendimento</h3>
                            <p className="text-gray-600">Seg. a Sex. das 9h às 18h</p>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center group">
                            <div className="w-12 h-12 bg-gray-100 text-black rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                <Mail size={24} />
                            </div>
                            <h3 className="font-bold mb-2">E-mail</h3>
                            <p className="text-gray-600">contato@triplice3d.com</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
