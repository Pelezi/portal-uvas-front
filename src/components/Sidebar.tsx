'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, FileText, Home, User, Menu, X, Settings, ChevronDown, ChevronUp, Building } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { hasPermission, PageRequirement } from '@/lib/permissions';

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

interface NavItem {
  href?: string;
  label: string;
  icon: React.ReactNode;
  matchPrefix?: boolean;
  require?: PageRequirement;
  children?: Omit<NavItem, 'children'>[];
}

const NavLink = ({ href, icon, label, isActive, onClick }: NavLinkProps) => (
  <Link
    href={href}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
      ? 'bg-blue-900 text-blue-300 font-medium'
      : 'text-gray-300 hover:bg-gray-700'
      }`}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, currentMatrix } = useAuth();
  const { isSidebarOpen, toggleSidebar } = useAppStore();
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set(['Relatório']));

  const handleNavClick = useCallback(() => {
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
  }, [toggleSidebar]);

  const toggleDropdown = (label: string) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (!user || !user.permission) {
      logout();
      router.push('/auth/login');
    }
  }, [user, logout, router]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  if (!user || !user.permission) {
    return null;
  }

  const navItems: NavItem[] = [
    { href: '/', label: 'Início', icon: <Home size={18} />, matchPrefix: false, require: 'leader' },
    { 
      label: 'Relatório', 
      icon: <FileText size={18} />, 
      children: [
        { href: '/report/fill', label: 'Preencher Relatório', icon: <FileText size={18} />, matchPrefix: false, require: 'leaderInTraining' },
        { href: '/report/view', label: 'Visualizar Relatório', icon: <FileText size={18} />, matchPrefix: false, require: 'leaderInTraining' },
      ],
      require: 'leaderInTraining'
    },
    { href: '/members', label: 'Membros', icon: <Users size={18} />, matchPrefix: true, require: 'leader' },
    { href: '/celulas', label: 'Células', icon: <Users size={18} />, matchPrefix: true, require: 'leader' },
    { href: '/discipulados', label: 'Discipulados', icon: <Users size={18} />, matchPrefix: true, require: 'leader' },
    { href: '/redes', label: 'Redes', icon: <Users size={18} />, matchPrefix: true, require: 'leader' },
    { href: '/congregacoes', label: 'Congregações', icon: <Building size={18} />, matchPrefix: true, require: 'leader' },
    { href: '/settings', label: 'Configurações', icon: <Settings size={18} />, matchPrefix: true, require: 'admin' },
  ];

  return (
    <>

      {/* Menu button - always visible on mobile when sidebar is closed */}
      {!isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg shadow-lg hover:bg-gray-700 lg:hidden transition-transform hover:scale-105"
        >
          <Menu size={24} className="text-gray-100" />
        </button>
      )}


      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-black z-40 lg:hidden transition-opacity duration-300 ease-in-out ${isSidebarOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
          }`}
        style={{ willChange: 'opacity' }}
        onClick={toggleSidebar}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gray-800 border-r border-gray-700 z-50 flex flex-col ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'
          }`}
      >
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-semibold text-gray-100">Uvas</h1>
            <button
              onClick={toggleSidebar}
              className="p-1 hover:bg-gray-700 rounded lg:hidden"
            >
              <X size={20} className="text-gray-100" />
            </button>
          </div>
          {currentMatrix && (
            <div className="mt-2 px-2 py-1.5 bg-blue-900/30 rounded-md">
              <p className="text-xs text-gray-400">Base atual</p>
              <p className="text-sm font-medium text-blue-300">{currentMatrix.name}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            // permission filtering using unified system
            if (item.require && !hasPermission(user.permission, item.require)) {
              return null;
            }

            // Se tem filhos, renderizar dropdown
            if (item.children && item.children.length > 0) {
              const isOpen = openDropdowns.has(item.label);
              
              // Filter children based on permissions
              const visibleChildren = item.children.filter(child => 
                !child.require || hasPermission(user.permission, child.require)
              );

              // If no visible children, don't show the dropdown
              if (visibleChildren.length === 0) {
                return null;
              }

              const hasActiveChild = visibleChildren.some(child => 
                child.href && (child.matchPrefix ? pathname.startsWith(child.href) : pathname === child.href)
              );

              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleDropdown(item.label)}
                    className={`flex items-center justify-between w-full gap-3 px-4 py-3 rounded-lg transition-colors ${
                      hasActiveChild
                        ? 'bg-blue-900 text-blue-300 font-medium'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {isOpen && (
                    <div className="ml-4 mt-1 space-y-1">
                      {visibleChildren.map((child) => {
                        if (!child.href) return null;
                        const isActive = child.matchPrefix ? pathname.startsWith(child.href) : pathname === child.href;
                        return (
                          <NavLink 
                            key={`${child.href}-${child.label}`} 
                            href={child.href} 
                            icon={child.icon} 
                            label={child.label} 
                            isActive={isActive} 
                            onClick={handleNavClick} 
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Se não tem filhos, renderizar link normal
            if (!item.href) return null;
            const isActive = item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href;

            return (
              <NavLink key={`${item.href}-${item.label}`} href={item.href} icon={item.icon} label={item.label} isActive={isActive} onClick={handleNavClick} />
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700 space-y-2">
          <Link
            href="/profile"
            onClick={handleNavClick}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg w-full transition-colors relative ${
              pathname === '/profile'
                ? 'bg-blue-900 text-blue-300 font-medium'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            {user?.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={user.name || 'Usuário'}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <User size={18} />
            )}
            <span>Perfil</span>
            {user?.hasDefaultPassword && (
              <span className="ml-auto flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 rounded-lg w-full text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}