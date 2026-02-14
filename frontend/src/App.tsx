import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { ScrollToTop } from './components/ScrollToTop';
import { PromotionalPopup } from './components/PromotionalPopup';
import { WhatsAppFAB } from './components/WhatsAppFAB';

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <ScrollToTop />
        <PromotionalPopup />
        <div className="min-h-screen bg-white text-black">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
            </Routes>
          </main>
          <Footer />
          <WhatsAppFAB />
        </div>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;

