import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Monitor, 
  Wrench, 
  MapPin, 
  Users, 
  FileText, 
  ShieldCheck, 
  LogOut,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed?: boolean;
}

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full p-3 my-1 rounded-lg transition-all duration-200 group",
      active 
        ? "bg-slate-800 text-white shadow-lg" 
        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
    )}
  >
    <Icon size={20} className={cn("min-w-[20px]", active ? "text-emerald-400" : "group-hover:text-emerald-400")} />
    {!collapsed && (
      <span className="ml-3 font-medium text-sm whitespace-nowrap overflow-hidden transition-all">
        {label}
      </span>
    )}
    {active && !collapsed && <ChevronRight size={14} className="ml-auto text-emerald-400" />}
  </button>
);

export default function Layout({ 
  children, 
  activeTab, 
  setActiveTab 
}: { 
  children: React.ReactNode; 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
}) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'tech', 'read'] },
    { id: 'equipos', label: 'Gestión de Equipos', icon: Monitor, roles: ['admin', 'tech', 'read'] },
    { id: 'mantenimiento', label: 'Mantenimiento', icon: Wrench, roles: ['admin', 'tech', 'read'] },
    { id: 'sedes', label: 'Sedes y Áreas', icon: MapPin, roles: ['admin', 'tech', 'read'] },
    { id: 'reportes', label: 'Reportes', icon: FileText, roles: ['admin', 'tech', 'read'] },
    { id: 'usuarios', label: 'Usuarios', icon: Users, roles: ['admin'] },
    { id: 'auditoria', label: 'Auditoría', icon: ShieldCheck, roles: ['admin'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-[#0F172A] border-r border-slate-800 transition-all duration-300 flex flex-col z-50",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-white font-bold text-xl tracking-tight">PGAI</span>
              <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">COINREFRI</span>
            </div>
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
          >
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 mt-4 overflow-y-auto scrollbar-hide">
          {filteredItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
              collapsed={collapsed}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className={cn("flex items-center mb-4", collapsed ? "justify-center" : "px-2")}>
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className={cn(
              "flex items-center w-full p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors",
              collapsed ? "justify-center" : ""
            )}
          >
            <LogOut size={20} />
            {!collapsed && <span className="ml-3 text-sm font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-bottom border-slate-200 flex items-center justify-between px-8 shadow-sm z-40">
          <h2 className="text-lg font-semibold text-slate-800 capitalize">
            {menuItems.find(i => i.id === activeTab)?.label}
          </h2>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-500">Fecha Actual</p>
              <p className="text-sm font-medium text-slate-700">
                {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
