'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Receipt, 
  FolderTree, 
  BarChart3,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  Settings,
  User,
  Users,
  Plus,
  ChevronDown,
  ChevronRight,
  Home,
  Bell,
  Mail,
  PiggyBank
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { groupService } from '@/services/groupService';
import { Group } from '@/types';
import { NotificationBell } from './NotificationComponents';

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

const NavLink = ({ href, icon, label, isActive, onClick }: NavLinkProps) => (
  <Link
    href={href}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive
        ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-medium'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isSidebarOpen, toggleSidebar, groups, setGroups, currentGroupId, setCurrentGroupId } = useAppStore();
  const [showGroups, setShowGroups] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  useEffect(() => {
    const loadGroups = async () => {
      setIsLoadingGroups(true);
      try {
        const fetchedGroups = await groupService.getGroups();
        setGroups(fetchedGroups);
      } catch (error) {
        console.error('Failed to load groups:', error);
      } finally {
        setIsLoadingGroups(false);
      }
    };
    loadGroups();
  }, [setGroups]);

  // Navigation items that are context-dependent (personal vs group)
  const contextNavItems = [
    { href: '/transactions', icon: <Receipt size={20} />, label: 'Transações' },
    { href: '/categories', icon: <FolderTree size={20} />, label: 'Categorias' },
    { href: '/budget', icon: <LayoutDashboard size={20} />, label: 'Orçamento' },
    { href: '/accounts', icon: <PiggyBank size={20} />, label: 'Contas' },
    { href: '/annual-review', icon: <BarChart3 size={20} />, label: 'Resumo Anual' },
    { href: '/settings', icon: <Settings size={20} />, label: 'Configurações' },
  ];

  // Global navigation items (always personal, never group-specific)
  const globalNavItems = [
    { href: '/invitations', icon: <Mail size={20} />, label: 'Convites' },
    { href: '/notifications', icon: <Bell size={20} />, label: 'Notificações' },
  ];

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
  };

  const handleSwitchToPersonal = () => {
    setCurrentGroupId(null);
    router.push('/transactions');
    handleNavClick();
  };

  const handleSwitchToGroup = (groupId: number) => {
    setCurrentGroupId(groupId);
    router.push(`/groups/${groupId}/transactions`);
    handleNavClick();
  };

  const isInGroup = pathname.startsWith('/groups/');
  const isPersonalView = !isInGroup;

  return (
    <>
      {/* Menu button - always visible on mobile when sidebar is closed */}
      {!isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 lg:hidden transition-transform hover:scale-105"
        >
          <Menu size={24} className="text-gray-900 dark:text-gray-100" />
        </button>
      )}

      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-black z-40 lg:hidden transition-opacity duration-300 ease-in-out ${
          isSidebarOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        style={{ willChange: 'opacity' }}
        onClick={toggleSidebar}
      />
      
      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 flex flex-col ${
          isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'
        }`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Budget Manager</h1>
          <div className="flex items-center gap-2">
            <NotificationBell onNavigate={handleNavClick} />
            <button
              onClick={toggleSidebar}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded lg:hidden"
            >
              <X size={20} className="text-gray-900 dark:text-gray-100" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* Personal Section */}
          <div className="mb-4">
            <button
              onClick={handleSwitchToPersonal}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg w-full transition-colors ${
                isPersonalView
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Home size={18} />
              <span>Pessoal</span>
            </button>
          </div>

          {/* Groups Section */}
          <div className="mb-4">
            <button
              onClick={() => setShowGroups(!showGroups)}
              className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users size={18} />
                <span>Grupos</span>
              </div>
              {showGroups ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {showGroups && (
              <div className="mt-2 space-y-1 ml-4">
                {isLoadingGroups ? (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Carregando...
                  </div>
                ) : groups.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Nenhum grupo ainda
                  </div>
                ) : (
                  groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handleSwitchToGroup(group.id)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg w-full transition-colors text-left ${
                        currentGroupId === group.id
                          ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Users size={16} />
                      <span className="truncate">{group.name}</span>
                    </button>
                  ))
                )}
                
                <Link
                  href="/groups/new"
                  onClick={handleNavClick}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  <span>Criar Grupo</span>
                </Link>
              </div>
            )}
          </div>

          {/* Context-dependent Navigation - only show when in personal or group context */}
          {(isPersonalView || isInGroup) && contextNavItems.map((item) => (
            <NavLink
              key={item.href}
              href={isInGroup && currentGroupId ? `/groups/${currentGroupId}${item.href}` : item.href}
              icon={item.icon}
              label={item.label}
              isActive={
                isInGroup 
                  ? pathname === `/groups/${currentGroupId}${item.href}`
                  : pathname === item.href
              }
              onClick={handleNavClick}
            />
          ))}

          {/* Global Navigation - always personal/user-scoped */}
          {(isPersonalView || isInGroup) && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
              {globalNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isActive={pathname === item.href}
                  onClick={handleNavClick}
                />
              ))}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <NavLink
            href="/profile"
            icon={<User size={20} />}
            label="Perfil"
            isActive={pathname === '/profile'}
            onClick={handleNavClick}
          />
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-3 w-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
