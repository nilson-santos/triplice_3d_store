import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { ProductDetail } from './pages/ProductDetail';
import { TrackOrder } from './pages/TrackOrder';
import { Favorites } from './pages/Favorites';
import { ScrollToTop } from './components/ScrollToTop';
import { PromotionalPopup } from './components/PromotionalPopup';
import { WhatsAppFAB } from './components/WhatsAppFAB';
import PriceTags from './pages/PriceTags';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <ScrollToTop />
          <PromotionalPopup />
          <div className="min-h-screen bg-white text-black">
            <Header />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/produto/:slug" element={<ProductDetail />} />
                <Route path="/rastrear-pedido" element={<TrackOrder />} />
                <Route path="/favoritos" element={<Favorites />} />
                <Route path="/admin/price-tags" element={<PriceTags />} />
              </Routes>
            </main>
            <Footer />
            <WhatsAppFAB />
          </div>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}


export default App;
