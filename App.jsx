import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Menu, ShieldCheck, Eye } from 'lucide-react';

import { api } from './utils/api';
import { useAdminSupportUnread } from './hooks/useAdminSupportUnread';
import { AdminModeProvider } from './context/AdminModeContext';
import AppSidebar from './components/AppSidebar';
import AdminRealtimeToastStack from './components/AdminRealtimeToastStack';

import DashboardPage     from './pages/DashboardPage';
import EmployeesPage     from './pages/EmployeesPage';
import AttendancePage    from './pages/AttendancePage';
import PayrollPage       from './pages/PayrollPage';
import LoginPage         from './pages/LoginPage';
import ObjectsPage       from './pages/ObjectsPage';
import ExcelPage         from './pages/ExcelPage';
import WarehousePage     from './pages/WarehousePage';
import SuppliersPage     from './pages/SuppliersPage';
import { BonusesPage, FinesPage } from './pages/bonusesFines';
import LogsPage          from './pages/LogsPage';
import NotificationsSendPage from './pages/NotificationsSendPage';
import SettingsPage      from './pages/SettingsPage';
import {
  EmployeePortalPage,
  EmployeeWorkDaysPage,
  EmployeePaymentsPage,
  EmployeeObjectsPage,
  EmployeeAttendancePage,
  EmployeeMessagesPage,
  EmployeeFinesPage,
  EmployeeBonusesPage,
  EmployeeLocationPage,
} from './pages/employeePortal';
import { AddSuperAdminPage, AdminSupportChatPage, AdminLocationsPage } from './pages/admin';

/** Support chat mobil: yon padding yo‘q, kontent header ostidan to‘liq balandlik */
function MainScrollArea({ adminBanner, children }) {
  const { pathname } = useLocation();
  const isSupportChat = pathname === '/support-chat';
  const contentClass = isSupportChat
    ? 'flex-1 flex flex-col min-h-0 overflow-x-hidden app-content-support-chat-mobile max-lg:overflow-hidden lg:overflow-y-auto lg:app-content-safe lg:p-8'
    : 'flex-1 min-h-0 app-content-safe p-3 xs:p-4 sm:p-5 md:p-8 overflow-y-auto overflow-x-hidden';

  return (
    <div className={contentClass}>
      {adminBanner}
      {isSupportChat ? (
        <div className="flex flex-col flex-1 min-h-0 max-lg:overflow-hidden">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}

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
  const locationWatchIdRef = useRef(null);
  const locationPollRef = useRef(null);
  const lastLocationSentAtRef = useRef(0);

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
    if (currentUser?.role === 'ADMIN') return;

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
  const supportChatUnreadTotal = useAdminSupportUnread(Boolean(currentUser && isAdminOrSuper));

  useEffect(() => {
    if (!currentUser || isAdminOrSuper) {
      if (locationWatchIdRef.current != null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
      }
      if (locationPollRef.current != null) {
        clearInterval(locationPollRef.current);
      }
      locationWatchIdRef.current = null;
      locationPollRef.current = null;
      return undefined;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return undefined;
    }

    let cancelled = false;

    const stopTracking = () => {
      if (locationWatchIdRef.current != null) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
      if (locationPollRef.current != null) {
        clearInterval(locationPollRef.current);
        locationPollRef.current = null;
      }
    };

    const sendLocation = (coords) => {
      const now = Date.now();
      if (now - lastLocationSentAtRef.current < 15000) return;
      lastLocationSentAtRef.current = now;
      api.updateMyLocation({
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
        speed: coords.speed,
        heading: coords.heading,
      }).catch((err) => {
        console.error('Lokatsiya yuborilmadi:', err);
      });
    };

    const onSuccess = (position) => {
      if (!position?.coords) return;
      sendLocation(position.coords);
    };

    const onError = () => {};

    const startTracking = () => {
      if (cancelled) return;
      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      });
      locationWatchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      });
      locationPollRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(onSuccess, onError, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        });
      }, 20000);
    };

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((perm) => {
          if (cancelled) return;
          if (perm.state === 'denied') {
            return;
          }
          startTracking();
          perm.onchange = () => {
            if (perm.state === 'denied') {
              stopTracking();
            } else {
              startTracking();
            }
          };
        })
        .catch(() => {
          startTracking();
        });
    } else {
      startTracking();
    }

    return () => {
      cancelled = true;
      stopTracking();
    };
  }, [currentUser, isAdminOrSuper]);

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
              <AdminModeProvider currentUser={currentUser}>
              <div className="flex h-[100dvh] min-h-0 bg-slate-900 overflow-hidden">
                <AdminRealtimeToastStack active={isAdminOrSuper && isSuperAdmin} />

                <AppSidebar
                  isOpen={isSidebarOpen}
                  onClose={() => setIsSidebarOpen(false)}
                  currentUser={currentUser}
                  isAdminOrSuper={isAdminOrSuper}
                  isSuperAdmin={isSuperAdmin}
                  onLogout={handleLogout}
                  supportChatUnreadTotal={supportChatUnreadTotal}
                />

                {/* MAIN CONTENT */}
                <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                  {/* Header */}
                  <header className="app-header-safe min-h-[3.5rem] sm:min-h-[4rem] md:h-24 shrink-0 bg-slate-950/50 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between gap-2 px-3 xs:px-4 sm:px-6 md:px-8 py-2 md:py-0">
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(true)}
                      className="md:hidden relative p-2.5 -ml-1 rounded-xl text-slate-400 hover:bg-slate-800 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Menyuni ochish"
                    >
                      <Menu size={22} />
                      {isAdminOrSuper && supportChatUnreadTotal > 0 ? (
                        <span
                          className="absolute top-1.5 right-1.5 min-w-[10px] h-2.5 px-[3px] rounded-full bg-sky-500 border-2 border-slate-950"
                          aria-hidden
                        />
                      ) : null}
                    </button>

                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 ml-auto shrink-0">
                      {isAdminOrSuper && (
                        <div className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase border ${
                          isSuperAdmin
                            ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                            : 'bg-sky-500/10 text-sky-400 border-sky-500/25'
                        }`}>
                          {isSuperAdmin ? <ShieldCheck size={14} /> : <Eye size={14} />}
                          {isSuperAdmin ? 'SUPER ADMIN' : "ADMIN · FAQAT KO'RISH"}
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
                  <MainScrollArea
                    adminBanner={
                      currentUser?.role === 'ADMIN' ? (
                        <div className="mb-4 rounded-2xl border border-sky-500/35 bg-sky-500/10 px-4 py-3 flex items-start gap-3 text-sky-100 max-lg:mx-3 shrink-0">
                          <Eye className="shrink-0 text-sky-400 mt-0.5" size={18} />
                          <p className="text-xs sm:text-sm font-bold leading-snug">
                            <span className="text-sky-300 uppercase tracking-wide">Faqat ko‘rish rejimi.</span>{' '}
                            Siz ma’lumotlarni ko‘rishingiz mumkin; qo‘shish, tahrirlash va o‘chirish faqat super admin uchun.
                          </p>
                        </div>
                      ) : null
                    }
                  >
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
                              supportChatEnabled={!isAdminOrSuper}
                            />
                          )
                        }
                      />

                      <Route
                        path="/employees"
                        element={isAdminOrSuper ? (
                          <EmployeesPage employees={employees} payroll={payroll} onLog={addLog} onRefresh={loadData} canMutate={isSuperAdmin} />
                        ) : <Navigate to="/" />}
                      />

                      <Route
                        path="/attendance"
                        element={isAdminOrSuper ? (
                          <AttendancePage 
                            employees={employees} 
                            attendance={attendance}
                            objects={objects}
                            userRole={currentUser.role} 
                            onLog={addLog} 
                            onRefresh={loadData}
                            canMutate={false}
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
                            canMutate={isSuperAdmin}
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
                            canMutate={isSuperAdmin}
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
                            canMutate={isSuperAdmin}
                          />
                        ) : <Navigate to="/" />}
                      />

                      <Route
                        path="/objects"
                        element={isAdminOrSuper ? (
                          <ObjectsPage 
                            objects={objects} 
                            payroll={payroll} 
                            bonuses={bonuses}
                            attendance={attendance}
                            employees={employees}
                            userRole={currentUser.role} 
                            onRefresh={loadData}
                            canMutate={isSuperAdmin}
                          />
                        ) : <Navigate to="/" />}
                      />

                      <Route
                        path="/add-super-admin"
                        element={isSuperAdmin ? (
                          <AddSuperAdminPage
                            employees={employees}
                            currentUser={currentUser}
                            onLog={addLog}
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
                            canMutate={isSuperAdmin}
                          />
                        ) : <Navigate to="/" />}
                      />

                      <Route
                        path="/suppliers"
                        element={isAdminOrSuper ? (
                          <SuppliersPage objects={objects} canMutate={isSuperAdmin} />
                        ) : <Navigate to="/" />}
                      />

                      <Route
                        path="/bonuses"
                        element={isAdminOrSuper ? (
                          <BonusesPage 
                            employees={employees}
                            objects={objects}
                            bonuses={bonuses}
                            userRole={currentUser.role} 
                            onLog={addLog} 
                            onRefresh={loadData}
                            canMutate={isSuperAdmin}
                          />
                        ) : <Navigate to="/" />}
                      />

                      <Route
                        path="/logs"
                        element={isAdminOrSuper ? (
                          <LogsPage logs={logs} onRefresh={loadData} />
                        ) : <Navigate to="/" />}
                      />

                      <Route
                        path="/notifications-send"
                        element={isAdminOrSuper ? (
                          <NotificationsSendPage
                            employees={employees}
                            currentUser={currentUser}
                            onLog={addLog}
                            onRefresh={loadData}
                            canMutate={isSuperAdmin}
                          />
                        ) : <Navigate to="/" />}
                      />

                      <Route
                        path="/support-chat"
                        element={isAdminOrSuper ? (
                          <AdminSupportChatPage employees={employees} currentUser={currentUser} canMutate={isSuperAdmin} />
                        ) : <Navigate to="/" />}
                      />
                      <Route
                        path="/locations"
                        element={isAdminOrSuper ? (
                          <AdminLocationsPage employees={employees} />
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
                            supportChatEnabled={!isAdminOrSuper}
                          />
                        }
                      />

                      <Route
                        path="/ish-kunlarim"
                        element={
                          !isAdminOrSuper ? (
                            <EmployeeWorkDaysPage
                              user={currentUser}
                              employees={employees}
                              attendance={attendance}
                              payroll={payroll}
                              objects={objects}
                              supportChatEnabled={!isAdminOrSuper}
                            />
                          ) : (
                            <Navigate to="/" replace />
                          )
                        }
                      />

                      <Route
                        path="/kabinet-tolovlar"
                        element={
                          !isAdminOrSuper ? (
                            <EmployeePaymentsPage
                              user={currentUser}
                              employees={employees}
                              payroll={payroll}
                              supportChatEnabled={!isAdminOrSuper}
                            />
                          ) : (
                            <Navigate to="/" replace />
                          )
                        }
                      />
                      <Route
                        path="/kabinet-obyektlar"
                        element={
                          !isAdminOrSuper ? (
                            <EmployeeObjectsPage
                              user={currentUser}
                              employees={employees}
                              payroll={payroll}
                              supportChatEnabled={!isAdminOrSuper}
                            />
                          ) : (
                            <Navigate to="/" replace />
                          )
                        }
                      />
                      <Route
                        path="/kabinet-davomat"
                        element={
                          !isAdminOrSuper ? (
                            <EmployeeAttendancePage
                              user={currentUser}
                              employees={employees}
                              attendance={attendance}
                              supportChatEnabled={!isAdminOrSuper}
                            />
                          ) : (
                            <Navigate to="/" replace />
                          )
                        }
                      />
                      <Route
                        path="/kabinet-xabarlar"
                        element={
                          !isAdminOrSuper ? (
                            <EmployeeMessagesPage
                              user={currentUser}
                              employees={employees}
                              supportChatEnabled={!isAdminOrSuper}
                            />
                          ) : (
                            <Navigate to="/" replace />
                          )
                        }
                      />
                      <Route
                        path="/kabinet-jarimalar"
                        element={
                          !isAdminOrSuper ? (
                            <EmployeeFinesPage
                              user={currentUser}
                              employees={employees}
                              fines={fines}
                              supportChatEnabled={!isAdminOrSuper}
                            />
                          ) : (
                            <Navigate to="/" replace />
                          )
                        }
                      />
                      <Route
                        path="/kabinet-bonuslar"
                        element={
                          !isAdminOrSuper ? (
                            <EmployeeBonusesPage
                              user={currentUser}
                              employees={employees}
                              bonuses={bonuses}
                              supportChatEnabled={!isAdminOrSuper}
                            />
                          ) : (
                            <Navigate to="/" replace />
                          )
                        }
                      />
                      <Route
                        path="/kabinet-joylashuv"
                        element={
                          !isAdminOrSuper ? (
                            <EmployeeLocationPage
                              user={currentUser}
                              employees={employees}
                            />
                          ) : (
                            <Navigate to="/" replace />
                          )
                        }
                      />

                      <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                  </MainScrollArea>
                </main>
              </div>
              </AdminModeProvider>
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
