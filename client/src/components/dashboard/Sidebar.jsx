'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Users,
  School,
  BookOpen,
  Calendar,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BarChart3,
  Shield,
  Package,
  GraduationCap,
  CreditCard,
  Menu,
  X,
  UserRound,
  SlidersHorizontal,
  ClipboardList,
  Video,
} from 'lucide-react';

// Super Admin navigation items
const SUPER_ADMIN_NAV = [
  { label: 'Dashboard', icon: LayoutGrid, href: '/admin/dashboard' },
  { label: 'Schools', icon: School, href: '/admin/schools' },
  { label: 'Subscriptions', icon: CreditCard, href: '/admin/subscriptions' },
  { label: 'Illustrations', icon: Package, href: '/admin/illustrations' },
  { label: 'Analytics', icon: BarChart3, href: '/admin/analytics' },
  { label: 'Settings', icon: Settings, href: '/admin/settings' },
];

// School Admin navigation items
const SCHOOL_ADMIN_NAV = [
  { label: 'Dashboard', icon: LayoutGrid, href: '/dashboard' },
  { label: 'Students', icon: GraduationCap, href: '/dashboard/students' },
  { label: 'Teachers', icon: Users, href: '/dashboard/teachers' },
  { label: 'Staff', icon: UserRound, href: '/dashboard/staff' },
  { label: 'Academic', icon: SlidersHorizontal, href: '/dashboard/academic' },
  { label: 'Classes', icon: School, href: '/dashboard/classes' },
  { label: 'Lectures', icon: Video, href: '/dashboard/lectures' },
  { label: 'Lesson Notes', icon: ClipboardList, href: '/dashboard/lesson-notes' },
  { label: 'Exams', icon: FileText, href: '/dashboard/exams' },
  { label: 'Events', icon: Calendar, href: '/dashboard/events' },
  { label: 'Reports', icon: BarChart3, href: '/dashboard/reports' },
  { label: 'Fees', icon: CreditCard, href: '/dashboard/fees' },
  { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
];

// Teacher navigation items
const TEACHER_NAV = [
  { label: 'Dashboard', icon: LayoutGrid, href: '/dashboard' },
  { label: 'My Classes', icon: School, href: '/dashboard/classes' },
  { label: 'Lectures', icon: Video, href: '/dashboard/lectures' },
  { label: 'Lesson Notes', icon: ClipboardList, href: '/dashboard/lesson-notes' },
  { label: 'Exams & Grading', icon: FileText, href: '/dashboard/exams' },
  { label: 'Students', icon: GraduationCap, href: '/dashboard/students' },
  { label: 'Events', icon: Calendar, href: '/dashboard/events' },
  { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
];

// Student navigation items
const STUDENT_NAV = [
  { label: 'Dashboard', icon: LayoutGrid, href: '/dashboard' },
  { label: 'My Lectures', icon: Video, href: '/dashboard/lectures' },
  { label: 'My Exams', icon: FileText, href: '/dashboard/exams' },
  { label: 'Results', icon: Award, href: '/dashboard/results' },
  { label: 'Events', icon: Calendar, href: '/dashboard/events' },
  { label: 'Fees', icon: CreditCard, href: '/dashboard/fees' },
  { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
];

// Staff (Principal, Admin Staff, Receptionist) navigation items
const STAFF_NAV = [
  { label: 'Dashboard', icon: LayoutGrid, href: '/dashboard' },
  { label: 'Students', icon: GraduationCap, href: '/dashboard/students' },
  { label: 'Fees', icon: CreditCard, href: '/dashboard/fees' },
  { label: 'Events', icon: Calendar, href: '/dashboard/events' },
  { label: 'Staff Chat', icon: Users, href: '/dashboard/chat' },
  { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
];

export default function Sidebar({ role = 'admin', user, onLogout, collapsed: initialCollapsed = false, onToggle, mobileOpen, onMobileClose }) {
  const pathname = usePathname();
  
  // Persist collapsed state in localStorage
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar-collapsed');
      return stored !== null ? JSON.parse(stored) : initialCollapsed;
    }
    return initialCollapsed;
  });

  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
    }
  }, [collapsed]);

  // Sync with initialCollapsed prop on mount only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar-collapsed');
      if (stored === null && initialCollapsed !== collapsed) {
        setCollapsed(initialCollapsed);
      }
    }
  }, [initialCollapsed]);

  const navItems = role === 'super_admin' ? SUPER_ADMIN_NAV : 
                   role === 'teacher' ? TEACHER_NAV :
                   role === 'student' ? STUDENT_NAV :
                   (['principal', 'admin_staff', 'receptionist'].includes(role)) ? STAFF_NAV :
                   SCHOOL_ADMIN_NAV;

  const handleLogout = () => {
    onLogout?.();
  };

  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    onToggle?.(newState);
  };

  const closeMobile = () => {
    onMobileClose?.();
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-sidebar text-white z-50 transition-all duration-300 ease-out flex flex-col
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'w-20 lg:w-20' : 'w-64 lg:w-64'}
        `}
      >
        {/* Header with Logo and Mobile Close */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-4 border-b border-white/10`}>
          {!collapsed && (
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" />
                  <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="font-bold text-lg">vDeskconnect</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" />
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          
          {/* Mobile Close Button - only when NOT collapsed and menu is open */}
          {!collapsed && mobileOpen && (
            <button
              onClick={closeMobile}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          )}

          {/* Desktop Collapse Toggle */}
          {!collapsed && (
            <button
              onClick={toggleSidebar}
              className="text-white/50 hover:text-white transition-colors hidden lg:flex p-1.5 rounded-lg hover:bg-white/10"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* Role badge */}
        {!collapsed && (
          <div className="px-4 py-3">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              role === 'super_admin'
                ? 'bg-warning/20 text-warning'
                : 'bg-primary/20 text-primary-light'
            }`}>
              <Shield size={12} />
              {role === 'super_admin' ? 'Super Admin' : 'School Admin'}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => {
            // Active state logic:
            // - For dashboard: exact match only to avoid matching /dashboard/* sub-routes
            // - For other items: exact match OR starts with the route + '/'
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href + '/'));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-250 group
                  ${isActive
                    ? 'bg-primary text-white shadow-soft'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                  }
                  ${collapsed ? 'justify-center px-0 py-2' : ''}
                `}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={collapsed ? 18 : 20} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (bottom) - visible on ALL screen sizes */}
        {!collapsed && (
          <div className="px-3 pb-4">
            <button
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all duration-250 text-sm"
            >
              <ChevronLeft size={16} />
              <span>Collapse</span>
            </button>
          </div>
        )}
        {collapsed && (
          <div className="px-3 pb-4">
            <button
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all duration-250"
              title="Expand sidebar"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* User section */}
        <div className={`px-3 pb-4 border-t border-white/10 pt-4 ${collapsed ? 'flex flex-col items-center gap-3' : ''}`}>
          {!collapsed && user && (
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-9 h-9 bg-primary/30 rounded-full flex items-center justify-center text-sm font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                <p className="text-xs text-white/40">{role === 'super_admin' ? 'Platform Owner' : user?.school_name}</p>
              </div>
            </div>
          )}
          {collapsed && user && (
            <div className="w-9 h-9 bg-primary/30 rounded-full flex items-center justify-center text-sm font-bold mx-auto">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 text-white/50 hover:text-error transition-colors duration-200 text-sm ${
              collapsed ? 'justify-center w-full' : ''
            }`}
          >
            <LogOut size={18} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
