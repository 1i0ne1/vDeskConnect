'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { api } from '@/lib/api';

export default function DashboardLayout({ children, title, subtitle, role = 'admin' }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Read persisted sidebar state directly from localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar-collapsed');
      return stored !== null ? JSON.parse(stored) : false;
    }
    return false;
  });

  // Track desktop/mobile breakpoint
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    api.get('/user')
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        api.logout();
        router.push('/login');
      });
  }, [router]);

  const handleLogout = () => {
    api.logout();
    router.push('/login');
  };

  const handleSidebarToggle = (collapsed) => {
    setSidebarCollapsed(collapsed);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Margin only on desktop; mobile gets zero margin
  const contentMargin = isDesktop ? (sidebarCollapsed ? '5rem' : '16rem') : '0rem';

  return (
    <div className="min-h-screen bg-bg-main overflow-x-hidden">
      {/* Subtle background gradient for glass effect */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-primary-light/5 pointer-events-none" />
      <div className="fixed top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-primary-light/10 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

      <Sidebar
        role={role === 'admin' && user?.role ? user.role : role}
        user={user}
        onLogout={handleLogout}
        onToggle={handleSidebarToggle}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        collapsed={sidebarCollapsed}
      />
      {/* Content area: margin adapts to desktop/mobile, width constrained to prevent overflow */}
      <div
        className="transition-all duration-300 ease-out"
        style={{
          marginLeft: contentMargin,
          width: isDesktop ? `calc(100vw - ${contentMargin})` : '100vw',
          maxWidth: '100vw',
        }}
      >
        <TopBar title={title} subtitle={subtitle} user={user} onMobileMenuToggle={handleMobileMenuToggle} />
        <main className="p-4 md:p-6 overflow-y-auto scrollbar-hide">
          {children}
        </main>
      </div>
    </div>
  );
}
