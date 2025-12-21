import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { CookieConsent } from "@/components/CookieConsent";

import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import ProductPage from "./pages/ProductPage";
import ContactPage from "./pages/ContactPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import CookiesPage from "./pages/CookiesPage";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";

import favicon from "/favicon.svg";

const queryClient = new QueryClient();

// PageWrapper with delayed route rendering
const PageWrapper = () => {
  const location = useLocation();

  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [logoStage, setLogoStage] = useState<
    "idle" | "logo-in" | "wait" | "logo-out" | "done"
  >("done");

  const [currentLocation, setCurrentLocation] = useState(location);

  useEffect(() => {
    if (location.pathname === currentLocation.pathname) return;

    setFadeOpacity(0);
    setLogoStage("idle");

    const timers: NodeJS.Timeout[] = [];

    // 1. Fade in black
    timers.push(setTimeout(() => setFadeOpacity(1), 50));

    // 2. Logo in
    timers.push(setTimeout(() => setLogoStage("logo-in"), 300));

    // 3. Wait
    timers.push(setTimeout(() => setLogoStage("wait"), 650));

    // 4. Logo out
    timers.push(setTimeout(() => {
      setLogoStage("logo-out");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1350));

    // 5. Fade out black + zmiana lokalizacji
    timers.push(setTimeout(() => {
      setFadeOpacity(0);
      setCurrentLocation(location); // zmiana strony od razu
    }, 1700));

    // 6. Kończenie animacji (odblokowanie overlay)
    timers.push(setTimeout(() => {
      setLogoStage("done");
    }, 2000));

    return () => timers.forEach((t) => clearTimeout(t));
  }, [location, currentLocation]);

  return (
    <>
      {/* Black overlay + logo */}
      {logoStage !== "done" && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black"
          style={{
            opacity: fadeOpacity,
            transition: "opacity 0.3s ease-in-out",
            pointerEvents: "none"
          }}
        >
          {logoStage !== "idle" && (
            <img
              src={favicon}
              alt="Logo"
              className="absolute w-32 h-32"
              style={{
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          )}
        </div>
      )}

      {/* Render current page */}
      <Routes location={currentLocation} key={currentLocation.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/sklep" element={<ShopPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/produkt/:id" element={<ProductPage />} />
        <Route path="/kontakt" element={<ContactPage />} />
        <Route path="/regulamin" element={<TermsPage />} />
        <Route path="/prywatnosc" element={<PrivacyPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};


const App = () => (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <CartDrawer />
            <div className="flex-1">
              <PageWrapper />
            </div>
            <Footer />
            <CookieConsent />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </CartProvider>
  </QueryClientProvider>
);

export default App;
