import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { MobileTabBar } from './components/MobileTabBar.tsx';
import { Footer } from './components/Footer.tsx';

import { HomePage } from './pages/HomePage.tsx';
import { CatalogPage } from './pages/CatalogPage.tsx';
import { ServiceDetailPage } from './pages/ServiceDetailPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { PaymentPage } from './pages/PaymentPage.tsx';
import { PaymentSuccessPage } from './pages/PaymentSuccessPage.tsx';
import { ClientAccountPage } from './pages/ClientAccountPage.tsx';
import { OrderDetailPage } from './pages/OrderDetailPage.tsx';
import { StaffDashboardPage } from './pages/StaffDashboardPage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { AuthPages } from './pages/AuthPages.tsx';

import { Service, Order } from './types.ts';

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<string>('home');
  const [categorySlugFilter, setCategorySlugFilter] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const navigateTo = (view: string, param?: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (view === 'catalog') {
      setCategorySlugFilter(param || 'all');
      setCurrentView('catalog');
    } else if (view === 'service-detail') {
      setCurrentView('service-detail');
    } else if (view === 'order-detail') {
      if (param) setSelectedOrderId(param);
      setCurrentView('order-detail');
    } else {
      setCurrentView(view);
    }
  };

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentView('service-detail');
  };

  const handleProceedToCheckout = (service: Service) => {
    setSelectedService(service);
    if (!user) {
      setCurrentView('login');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentView('checkout');
    }
  };

  const handleOrderCreated = (order: Order) => {
    setActiveOrder(order);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentView('payment');
  };

  const handlePaymentSuccess = (order: Order) => {
    setActiveOrder(order);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentView('payment-success');
  };

  return (
    <div className="min-h-screen flex flex-col bg-fond text-ink selection:bg-rose-brand/20 selection:text-ink relative overflow-x-hidden">
      {/* Vibrant Palette Ambient Lighting Accents */}
      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-violet opacity-[0.06] rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-rose-brand opacity-[0.06] rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-brand opacity-[0.03] rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Navbar */}
      <Navbar currentView={currentView} onNavigate={navigateTo} />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            onNavigate={navigateTo}
            onSelectService={handleSelectService}
          />
        )}

        {currentView === 'catalog' && (
          <CatalogPage
            initialCategorySlug={categorySlugFilter}
            onSelectService={handleSelectService}
          />
        )}

        {currentView === 'service-detail' && selectedService && (
          <ServiceDetailPage
            serviceIdOrSlug={selectedService.id}
            onBack={() => navigateTo('catalog')}
            onProceedToCheckout={handleProceedToCheckout}
            onSelectRelatedService={handleSelectService}
          />
        )}

        {currentView === 'checkout' && selectedService && (
          <CheckoutPage
            service={selectedService}
            onBack={() => navigateTo('service-detail')}
            onOrderCreated={handleOrderCreated}
          />
        )}

        {currentView === 'payment' && activeOrder && (
          <PaymentPage
            order={activeOrder}
            onPaymentSuccess={handlePaymentSuccess}
            onCancel={() => navigateTo('account')}
          />
        )}

        {currentView === 'payment-success' && activeOrder && (
          <PaymentSuccessPage
            order={activeOrder}
            onViewOrder={(id) => navigateTo('order-detail', id)}
            onGoHome={() => navigateTo('home')}
          />
        )}

        {currentView === 'account' && (
          <ClientAccountPage
            onSelectOrder={(id) => navigateTo('order-detail', id)}
            onNavigateToCatalog={() => navigateTo('catalog')}
          />
        )}

        {currentView === 'order-detail' && selectedOrderId && (
          <OrderDetailPage
            orderId={selectedOrderId}
            onBack={() => navigateTo('account')}
            onPayNow={(order) => {
              setActiveOrder(order);
              setCurrentView('payment');
            }}
          />
        )}

        {currentView === 'staff' && (
          <StaffDashboardPage />
        )}

        {currentView === 'admin' && (
          <AdminDashboardPage />
        )}

        {(currentView === 'login' || currentView === 'register') && (
          <AuthPages
            initialMode={currentView === 'login' ? 'login' : 'register'}
            onSuccess={() => {
              if (selectedService) {
                setCurrentView('checkout');
              } else {
                setCurrentView('account');
              }
            }}
            onNavigateHome={() => navigateTo('home')}
          />
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={navigateTo} />

      {/* Mobile Floating Bottom Bar */}
      <MobileTabBar currentView={currentView} onNavigate={navigateTo} />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
