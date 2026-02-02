import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '../assets/hero-image.png';

export const Home = () => {
    return (
        <div className="relative overflow-hidden">
            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 py-2 sm:py-4 grid md:grid-cols-2 gap-12 items-center">
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
                            className="bg-black text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition"
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
        </div>
    );
};
