import React from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  UsersRound,
  CalendarClock,
  CreditCard,
  LogOut,
  X,
  Zap,
  Building2,
  BarChart3,
  AlertTriangle,
  Warehouse as WarehouseIcon,
  Gift,
  Contact2,
  Settings,
  ScrollText,
  Bell,
  MessageCircle,
  Shield,
} from 'lucide-react';

const NavItem = ({ to, icon, label, onNavigate, badgeCount = 0 }) => (
  <Link
    to={to}
    onClick={onNavigate}
    className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-slate-400 rounded-xl hover:bg-slate-900 hover:text-yellow-500 transition-all font-semibold min-h-[44px] sm:min-h-0"
  >
    {icon}
    <span className="flex-1 min-w-0 truncate">{label}</span>
    {badgeCount > 0 ? (
      <span
        className="sc-unread-badge shrink-0 min-w-[1.25rem] h-5 px-1 rounded-full text-[11px] font-black flex items-center justify-center tabular-nums leading-none"
        aria-label={`O‘qilmagan xabarlar: ${badgeCount}`}
      >
        {badgeCount > 99 ? '99+' : badgeCount}
      </span>
    ) : null}
  </Link>
);

const AppSidebar = ({
  isOpen,
  onClose,
  currentUser,
  isAdminOrSuper,
  isSuperAdmin,
  onLogout,
  supportChatUnreadTotal = 0,
}) => {
  const closeOnNav = () => onClose();

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[min(18rem,calc(100vw-1rem))] max-w-[90vw] sm:w-72 bg-slate-950 border-r border-slate-800 flex flex-col 
          transition-transform duration-200 ease-out md:relative md:translate-x-0 md:max-w-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between min-h-[4.5rem] sm:h-24 px-4 sm:px-6 md:px-8 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Zap className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 text-yellow-500 fill-yellow-500" />
            <span className="text-base sm:text-lg md:text-xl font-black text-white italic tracking-tighter uppercase truncate">
              Dost <span className="text-yellow-500">Electric</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden text-slate-400"
            aria-label="Menyuni yopish"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 min-h-0 p-4 sm:p-5 md:p-6 space-y-1.5 sm:space-y-2 overflow-y-auto custom-scroll">
          {isAdminOrSuper && (
            <>
              <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Asosiy Panel" onNavigate={closeOnNav} />
              <NavItem to="/employees" icon={<UsersRound size={20} />} label="Xodimlar" onNavigate={closeOnNav} />
              <NavItem to="/objects" icon={<Building2 size={20} />} label="Obyektlar" onNavigate={closeOnNav} />
              <NavItem to="/attendance" icon={<CalendarClock size={20} />} label="Davomat" onNavigate={closeOnNav} />
              <NavItem to="/payroll" icon={<CreditCard size={20} />} label="Ish haqi" onNavigate={closeOnNav} />
              <NavItem to="/bonuses" icon={<Gift size={20} />} label="Bonuslar" onNavigate={closeOnNav} />
              <NavItem to="/fines" icon={<AlertTriangle size={20} />} label="Jarimalar" onNavigate={closeOnNav} />
              <NavItem to="/warehouse" icon={<WarehouseIcon size={20} />} label="Ombor" onNavigate={closeOnNav} />
              <NavItem to="/suppliers" icon={<Contact2 size={20} />} label="Beruvchilar" onNavigate={closeOnNav} />
              <NavItem to="/excel" icon={<BarChart3 size={20} />} label="Hisobotlar" onNavigate={closeOnNav} />
              <NavItem to="/notifications-send" icon={<Bell size={20} />} label="Xabarnoma yuborish" onNavigate={closeOnNav} />
              <NavItem
                to="/support-chat"
                icon={<MessageCircle size={20} />}
                label="Chat (xodimlar)"
                onNavigate={closeOnNav}
                badgeCount={supportChatUnreadTotal}
              />
              <NavItem to="/logs" icon={<ScrollText size={20} />} label="Loglar" onNavigate={closeOnNav} />
              {isSuperAdmin && (
                <NavItem to="/add-super-admin" icon={<Shield size={20} />} label="Super admin qo‘shish" onNavigate={closeOnNav} />
              )}
            </>
          )}
          <NavItem to="/settings" icon={<Settings size={20} />} label="Sozlamalar" onNavigate={closeOnNav} />
        </nav>

        <div className="p-4 sm:p-5 md:p-6 border-t border-slate-800 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-6">
          <div className="mb-4 px-4 py-3 bg-slate-900 rounded-2xl border border-slate-800 flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 min-w-[40px] rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-black border border-yellow-500/20">
              {currentUser?.name?.[0] || 'U'}
            </div>
            <div className="truncate">
              <p className="text-sm font-bold text-slate-200 truncate">{currentUser?.name}</p>
              <p className="text-[10px] text-yellow-500 uppercase font-black tracking-widest">
                {currentUser?.role}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center w-full gap-3 px-4 py-3 text-rose-500 rounded-xl hover:bg-rose-500/10 transition-colors font-bold text-sm"
          >
            <LogOut size={18} /> Chiqish
          </button>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
    </>
  );
};

export default AppSidebar;
