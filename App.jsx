import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  LogOut,
  Menu,
  X,
  Zap,
  Building2,
  ShieldCheck,
  BarChart3,
  AlertTriangle,
  Warehouse as WarehouseIcon,
  Gift,
} from 'lucide-react';

import { api } from './utils/api';

import DashboardPage     from './pages/DashboardPage';
import EmployeesPage     from './pages/EmployeesPage';
import AttendancePage    from './pages/AttendancePage';
import PayrollPage       from './pages/PayrollPage';
import LoginPage         from './pages/LoginPage';
import EmployeePortalPage from './pages/EmployeePortalPage';
import ObjectsPage       from './pages/ObjectsPage';
import ExcelPage         from './pages/ExcelPage';
import FinesPage         from './pages/FinesPage';
import WarehousePage     from './pages/WarehousePage';
import BonusesPage       from './pages/BonusesPage';

const App = () => {
  // Current User holati
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [employees,  setEmployees]  = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payroll,    setPayroll]    = useState([]);
  const [logs,       setLogs]       = useState([]);
  const [objects,    setObjects]    = useState([]);
  const [fines,      setFines]      = useState([]);
  const [bonuses,    setBonuses]    = useState([]);

  // Internet holatini kuzatish
  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Mobil / planshet: breakpoint o‘zgarganda sidebar (desktopda ochiq, telefonda yopiq)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const syncSidebar = () => {
      setIsSidebarOpen(mq.matches);
    };
    mq.addEventListener('change', syncSidebar);
    return () => mq.removeEventListener('change', syncSidebar);
  }, []);

  // Ma'lumotlarni yuklash
  const loadData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [emps, att, pay, objs, lg, fns, bns] = await Promise.all([
        api.getEmployees(),
        api.getAttendance(),
        api.getPayroll(),
        api.getObjects(),
        api.getLogs(),
        api.getFines(),
        api.getBonuses(),
      ]);
      setEmployees(emps.data   || []);
      setAttendance(att.data   || []);
      setPayroll(pay.data      || []);
      setObjects(objs.data     || []);
      setLogs(lg.data          || []);
      setFines(fns.data        || []);
      setBonuses(bns.data      || bns.bonuses || []);
    } catch (err) {
      console.error('Maʼlumot yuklashda xato:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // har 30 soniyada
    return () => clearInterval(interval);
  }, [loadData]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  // Log tizimi
  const addLog = useCallback(async (action) => {
    const cleanAction = action ? String(action).trim() : '';
    if (!cleanAction) return;

    const performer = currentUser?.name ? String(currentUser.name).trim() : 'Sistema';

    const tempLog = {
      _id:       `temp_${Date.now()}`,
      action:    cleanAction,
      performer,
      createdAt: new Date().toISOString(),
    };

    setLogs(prev => [tempLog, ...prev].slice(0, 50));

    try {
      await api.createLog(cleanAction, performer);
    } catch (e) {
      console.error('Log yozishda xato:', e);
      setLogs(prev => prev.filter(l => l._id !== tempLog._id));
    }
  }, [currentUser]);

  const isSuperAdmin   = currentUser?.role === 'SUPER_ADMIN';
  const isAdminOrSuper = isSuperAdmin || currentUser?.role === 'ADMIN';

  const NavItem = ({ to, icon, label }) => (
    <Link
      to={to}
      onClick={() => setIsSidebarOpen(false)}
      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-slate-400 rounded-xl hover:bg-slate-900 hover:text-yellow-500 transition-all font-semibold min-h-[44px] sm:min-h-0"
    >
      {icon} <span>{label}</span>
    </Link>
  );

  return (
    <Router>
      <Routes>
        {/* Login sahifa */}
        <Route
          path="/login"
          element={currentUser ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} />}
        />

        {/* Asosiy app */}
        <Route
          path="/*"
          element={
            currentUser ? (
              <div className="flex h-[100dvh] min-h-0 bg-slate-900 overflow-hidden">

                {/* SIDEBAR */}
                <aside 
                  className={`fixed inset-y-0 left-0 z-50 w-[min(18rem,calc(100vw-1rem))] max-w-[90vw] sm:w-72 bg-slate-950 border-r border-slate-800 flex flex-col 
                    transition-transform duration-200 ease-out md:relative md:translate-x-0 md:max-w-none
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                  {/* Logo */}
                  <div className="flex items-center justify-between min-h-[4.5rem] sm:h-24 px-4 sm:px-6 md:px-8 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <Zap className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 text-yellow-500 fill-yellow-500" />
                      <span className="text-base sm:text-lg md:text-xl font-black text-white italic tracking-tighter uppercase truncate">
                        Dost <span className="text-yellow-500">Electric</span>
                      </span>
                    </div>
                    <button 
                      onClick={() => setIsSidebarOpen(false)} 
                      className="md:hidden text-slate-400"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Navigatsiya */}
                  <nav className="flex-1 min-h-0 p-4 sm:p-5 md:p-6 space-y-1.5 sm:space-y-2 overflow-y-auto custom-scroll">
                    {isAdminOrSuper && (
                      <>
                        <NavItem to="/"           icon={<LayoutDashboard size={20}/>} label="Asosiy Panel" />
                        <NavItem to="/employees"  icon={<Users size={20}/>}           label="Xodimlar" />
                        <NavItem to="/attendance" icon={<Users size={20}/>}           label="Davomat" />
                        <NavItem to="/payroll"    icon={<CreditCard size={20}/>}      label="Ish haqi" />
                        <NavItem to="/bonuses"    icon={<Gift size={20}/>}            label="Bonuslar" />
                        <NavItem to="/fines"      icon={<AlertTriangle size={20}/>}   label="Jarimalar" />
                        {isSuperAdmin && (
                          <NavItem to="/objects"  icon={<Building2 size={20}/>}       label="Obyektlar" />
                        )}
                        <NavItem to="/excel"      icon={<BarChart3 size={20}/>}       label="Hisobotlar" />
                        <NavItem to="/warehouse"  icon={<WarehouseIcon size={20}/>}   label="Ombor" />
                        
                      </>
                    )}
                  </nav>

                  {/* User info */}
                  <div className="p-4 sm:p-5 md:p-6 border-t border-slate-800 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-6">
                    <div className="mb-4 px-4 py-3 bg-slate-900 rounded-2xl border border-slate-800 flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 min-w-[40px] rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-black border border-yellow-500/20">
                        {currentUser.name?.[0] || 'U'}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold text-slate-200 truncate">{currentUser.name}</p>
                        <p className="text-[10px] text-yellow-500 uppercase font-black tracking-widest">
                          {currentUser.role}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full gap-3 px-4 py-3 text-rose-500 rounded-xl hover:bg-rose-500/10 transition-colors font-bold text-sm"
                    >
                      <LogOut size={18} /> Chiqish
                    </button>
                  </div>
                </aside>

                {/* Mobil fon */}
                {isSidebarOpen && (
                  <div
                    className="fixed inset-0 z-40 bg-black/60 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                  />
                )}

                {/* MAIN CONTENT */}
                <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                  {/* Header */}
                  <header className="app-header-safe min-h-[3.5rem] sm:min-h-[4rem] md:h-24 shrink-0 bg-slate-950/50 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between gap-2 px-3 xs:px-4 sm:px-6 md:px-8 py-2 md:py-0">
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(true)}
                      className="md:hidden p-2.5 -ml-1 rounded-xl text-slate-400 hover:bg-slate-800 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Menyuni ochish"
                    >
                      <Menu size={22} />
                    </button>

                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 ml-auto shrink-0">
                      {isAdminOrSuper && (
                        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[10px] font-black uppercase">
                          <ShieldCheck size={14} /> 
                          {isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full border border-slate-800 bg-slate-900/50">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          {isOnline ? 'Online' : 'Off'}
                        </span>
                      </div>
                    </div>
                  </header>

                  {/* Sahifa mazmuni */}
                  <div className="flex-1 min-h-0 app-content-safe p-3 xs:p-4 sm:p-5 md:p-8 overflow-y-auto overflow-x-hidden">
                    <Routes>
                      <Route
                        index
                        element={
                          isAdminOrSuper ? (
                            <DashboardPage
                              employees={employees}
                              attendance={attendance}
                              payroll={payroll}
                              logs={logs}
                            />
                          ) : (
                            <EmployeePortalPage 
                              user={currentUser} 
                              employees={employees} 
                              attendance={attendance} 
                              payroll={payroll} 
                              objects={objects}
                              fines={fines}
                              bonuses={bonuses}
                              onRefresh={loadData} 
                            />
                          )
                        }
                      />

                      <Route
                        path="/employees"
                        element={isAdminOrSuper ? (
                          <EmployeesPage employees={employees} payroll={payroll} onLog={addLog} onRefresh={loadData} />
                        ) : <Navigate to="/" />}
                      />

                      <Route
                        path="/attendance"
                        element={isAdminOrSuper ? (
                          <AttendancePage 
                            employees={employees} 
                            attendance={attendance} 
                            userRole={currentUser.role} 
                            onLog={addLog} 
                            onRefresh={loadData} 
                          />
                        ) : <Navigate to="/" />}
                      />

                      <Route
                        path="/payroll"
                        element={isAdminOrSuper ? (
                          <PayrollPage 
                            employees={employees} 
                            attendance={attendance} 
                            payroll={payroll} 
                            objects={objects}
                            fines={fines}
                            bonuses={bonuses}
                            userRole={currentUser.role} 
                            onLog={addLog} 
                            onRefresh={loadData} 
                          />
                        ) : <Navigate to="/" />}
                      />

                      <Route
                        path="/fines"
                        element={isAdminOrSuper ? (
                          <FinesPage 
                            employees={employees} 
                            fines={fines} 
                            userRole={currentUser.role} 
                            onLog={addLog} 
                            onRefresh={loadData} 
                          />
                        ) : <Navigate to="/" />}
                      />

                      <Route
                        path="/excel"
                        element={isAdminOrSuper ? (
                          <ExcelPage 
                            employees={employees} 
                            attendance={attendance} 
                            payroll={payroll} 
                            objects={objects} 
                          />
                        ) : <Navigate to="/" />}
                      />

                      <Route
                        path="/objects"
                        element={isSuperAdmin ? (
                          <ObjectsPage 
                            objects={objects} 
                            payroll={payroll} 
                            userRole={currentUser.role} 
                            onRefresh={loadData} 
                          />
                        ) : <Navigate to="/" />}
                      />

                      <Route
                        path="/warehouse"
                        element={isAdminOrSuper ? (
                          <WarehousePage 
                            objects={objects} 
                            currentUser={currentUser}
                          />
                        ) : <Navigate to="/" />}
                      />

                      <Route
                        path="/bonuses"
                        element={isAdminOrSuper ? (
                          <BonusesPage 
                            employees={employees}
                            bonuses={bonuses}
                            userRole={currentUser.role} 
                            onLog={addLog} 
                            onRefresh={loadData}
                          />
                        ) : <Navigate to="/" />}
                      />

                      <Route
                        path="/my-portal"
                        element={
                          <EmployeePortalPage 
                            user={currentUser} 
                            employees={employees} 
                            attendance={attendance} 
                            payroll={payroll} 
                            objects={objects}
                            fines={fines}
                            bonuses={bonuses}
                            onRefresh={loadData} 
                          />
                        }
                      />
                    </Routes>
                  </div>
                </main>
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
