import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { CookieConsent } from "@/components/CookieConsent";

import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import ProductPage from "./pages/ProductPage";
import ContactPage from "./pages/ContactPage";
import AboutPage from "./pages/AboutPage";
import AccountPage from "./pages/AccountPage";
import AdminPage from "./pages/AdminPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import CookiesPage from "./pages/CookiesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <CartDrawer />
              <div className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/sklep" element={<ShopPage />} />
                  <Route path="/produkt/:id" element={<ProductPage />} />
                  <Route path="/kontakt" element={<ContactPage />} />
                  <Route path="/o-nas" element={<AboutPage />} />
                  <Route path="/konto" element={<AccountPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/regulamin" element={<TermsPage />} />
                  <Route path="/prywatnosc" element={<PrivacyPage />} />
                  <Route path="/cookies" element={<CookiesPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              <Footer />
              <CookieConsent />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
