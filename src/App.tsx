import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { CookieConsent } from "@/components/CookieConsent";
import { Wrench } from "lucide-react";

import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import ProductPage from "./pages/ProductPage";
import ContactPage from "./pages/ContactPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import CookiesPage from "./pages/CookiesPage";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import AccountPage from "./pages/AccountPage";
import OrderDetailsPage from "./pages/OrderDetailsPage";

// New Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import OrdersPage from "./pages/admin/OrdersPage";
import ProductsPage from "./pages/admin/ProductsPage";
import PromotionsPage from "./pages/admin/PromotionsPage";
import MessagesPage from "./pages/admin/MessagesPage";
import ProductionPage from "./pages/admin/ProductionPage";
import MaterialsPage from "./pages/admin/MaterialsPage";
import PrintersPage from "./pages/admin/PrintersPage";
import ReportsPage from "./pages/admin/ReportsPage";
import ReturnsPage from "./pages/admin/ReturnsPage";
import SettingsPage from "./pages/admin/SettingsPage";
import UsersPage from "./pages/admin/UsersPage";
import LogsPage from "./pages/admin/LogsPage";
import LocationsPage from "./pages/admin/LocationsPage";
import ResourcesPage from "./pages/admin/ResourcesPage";

import favicon from "/favicon.svg";

const queryClient = new QueryClient();

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001';

// Maintenance mode overlay
function MaintenancePage({ message }: { message?: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Wrench className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Przerwa techniczna</h1>
        <p className="text-muted-foreground text-lg mb-6">
          {message || 'Strona jest w trakcie konserwacji. Wrócimy wkrótce!'}
        </p>
        <p className="text-sm text-muted-foreground">
          Przepraszamy za utrudnienia.
        </p>
      </div>
    </main>
  );
}

// PageWrapper with delayed route rendering
const PageWrapper = () => {
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [logoStage, setLogoStage] = useState<
    "idle" | "logo-in" | "wait" | "logo-out" | "done"
  >("done");

  const [currentLocation, setCurrentLocation] = useState(location);
  
  // Maintenance mode
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceAllowLoggedIn, setMaintenanceAllowLoggedIn] = useState(false);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/settings/public`)
      .then(r => r.json())
      .then(data => {
        setMaintenanceMode(data.maintenance_mode === true || data.maintenance_mode === 'true');
        setMaintenanceMessage(data.maintenance_message || '');
        setMaintenanceAllowLoggedIn(data.maintenance_allow_logged_in === true || data.maintenance_allow_logged_in === 'true');
      })
      .catch(() => {})
      .finally(() => setMaintenanceChecked(true));
  }, []);

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

  // Show maintenance page for non-admin, non-login routes
  if (maintenanceChecked && maintenanceMode && !isAdminRoute) {
    const isLoginRoute = currentLocation.pathname === '/login';
    const isAccountRoute = currentLocation.pathname === '/konto' || currentLocation.pathname.startsWith('/zamowienie/');
    
    // Allow admin users always
    if (isAdmin) {
      // Admin can access everything - fall through
    } else if (isLoginRoute) {
      // Always allow login page
    } else if (maintenanceAllowLoggedIn && user && isAccountRoute) {
      // Allow logged-in users to see their account/orders
    } else {
      return <MaintenancePage message={maintenanceMessage} />;
    }
  }

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
        <Route path="/konto" element={<AccountPage />} />
        <Route path="/produkt/:id" element={<ProductPage />} />
        <Route path="/zamowienie" element={<CheckoutPage />} />
        <Route path="/zamowienie-sukces" element={<OrderSuccessPage />} />
        <Route path="/zamowienie/:id" element={<OrderDetailsPage />} />
        <Route path="/kontakt" element={<ContactPage />} />
        <Route path="/regulamin" element={<TermsPage />} />
        <Route path="/prywatnosc" element={<PrivacyPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrdersPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="promotions" element={<PromotionsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="production" element={<ProductionPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="materials" element={<MaterialsPage />} />
          <Route path="printers" element={<PrintersPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="returns" element={<ReturnsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="logs" element={<LogsPage />} />
        </Route>
        
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