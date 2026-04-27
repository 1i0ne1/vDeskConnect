'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Bell, Search, User, Settings, Menu } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function TopBar({ title, subtitle, user, onMobileMenuToggle }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');

  // Sync state with URL
  useEffect(() => {
    setSearchTerm(searchParams?.get('q') || '');
  }, [searchParams]);

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (term.trim()) {
      params.set('q', term.trim());
    } else {
      params.delete('q');
    }
    
    // Use replace to avoid building up a massive browser history
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <header className="sticky top-0 z-30 glass-header px-3 md:px-6 py-3 md:py-4 overflow-x-hidden">
      <div className="flex items-center justify-between min-w-0">
        {/* Left: Title + Mobile Menu */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-primary/10 transition-colors text-text-secondary flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base md:text-xl font-bold text-text-primary truncate">{title}</h1>
            {subtitle && <p className="text-xs md:text-sm text-text-secondary mt-0.5 truncate hidden sm:block">{subtitle}</p>}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          {/* Search - Glass Input */}
          <div className="hidden lg:flex items-center gap-2 glass-input rounded-btn px-3 py-2 w-48 xl:w-64 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
            <Search size={16} className="text-text-muted flex-shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="bg-transparent text-sm text-text-primary placeholder-text-muted outline-none flex-1 min-w-0"
            />
          </div>

          {/* Notifications */}
          <button className="relative w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-btn hover:bg-primary/10 transition-colors duration-200 flex-shrink-0">
            <Bell size={18} className="text-text-secondary" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full border-2 border-bg-card" />
          </button>

          {/* User avatar */}
          <div className="hidden sm:flex items-center gap-3 pl-2 md:pl-3 border-l border-border flex-shrink-0">
            <div className="w-8 h-8 md:w-9 md:h-9 bg-primary/20 rounded-full flex items-center justify-center text-sm font-bold text-primary border-2 border-primary/30 backdrop-blur-lg flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-text-primary truncate max-w-[120px]">{user?.name || user?.email?.split('@')[0]}</p>
              <p className="text-xs text-text-muted">{user?.role}</p>
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="flex-shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
