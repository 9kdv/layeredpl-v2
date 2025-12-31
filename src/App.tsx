import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
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
import AdminPage from "./pages/AdminPage";

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

  // Check if current route is admin (no transition for admin)
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (location.pathname === currentLocation.pathname) return;
    if (isAdminRoute || currentLocation.pathname.startsWith('/admin')) {
      setCurrentLocation(location);
      return;
    }

    setFadeOpacity(0);
    setLogoStage("idle");

    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => setFadeOpacity(1), 50));
    timers.push(setTimeout(() => setLogoStage("logo-in"), 300));
    timers.push(setTimeout(() => setLogoStage("wait"), 650));
    timers.push(setTimeout(() => {
      setLogoStage("logo-out");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1350));
    timers.push(setTimeout(() => {
      setFadeOpacity(0);
      setCurrentLocation(location);
    }, 1700));
    timers.push(setTimeout(() => {
      setLogoStage("done");
    }, 2000));

    return () => timers.forEach((t) => clearTimeout(t));
  }, [location, currentLocation, isAdminRoute]);

  const showNavbar = !currentLocation.pathname.startsWith('/admin');

  return (
    <>
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

      {showNavbar && <Navbar />}
      <Routes location={currentLocation} key={currentLocation.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/sklep" element={<ShopPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/produkt/:id" element={<ProductPage />} />
        <Route path="/kontakt" element={<ContactPage />} />
        <Route path="/regulamin" element={<TermsPage />} />
        <Route path="/prywatnosc" element={<PrivacyPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showNavbar && <Footer />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen flex flex-col">
              <CartDrawer />
              <div className="flex-1">
                <PageWrapper />
              </div>
              <CookieConsent />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
