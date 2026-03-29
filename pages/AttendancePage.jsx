import React, { useState } from 'react';
import { CheckCircle2, CalendarCheck, XCircle, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../utils/api';

const Attendance = ({ employees, attendance, onLog, userRole, onRefresh }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const markAttendance = async (empId, status, extra = {}) => {
    setLoading(empId);
    setError(null);
    
    try {
      console.log('📤 So\'rov yuborilmoqda:', {
        employeeId: empId,
        date: selectedDate,
        status,
        markedBy: 'admin',
        ...extra,
      });

      const response = await api.upsertAttendance({
        employeeId: empId,
        date: selectedDate,
        status,
        markedBy: 'admin',
        ...extra,
      });

      console.log('✅ Javob keldi:', response);
      
      const emp = employees.find(e => e._id === empId || e.id === empId);
      const logMessage = `${emp?.name} - ${status === 'PRESENT' ? 'BOR' : "YO'Q"} deb tasdiqlandi`;
      onLog(logMessage);
      
      // Ma'lumotlarni yangilash
      if (onRefresh) {
        setTimeout(() => {
          onRefresh();
        }, 500);
      }
      
    } catch (err) {
      console.error('❌ Xatolik:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Server bilan aloqa yo\'q';
      setError(errorMsg);
      onLog(`XATOLIK: ${errorMsg}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Xatolik xabari */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500 rounded-[2rem] p-5 flex items-start gap-4 animate-in slide-in-from-top duration-300">
          <AlertCircle className="text-rose-500 flex-shrink-0 mt-0.5" size={22} />
          <div className="flex-1">
            <p className="text-rose-400 font-black text-sm uppercase">XATOLIK YUZ BERDI</p>
            <p className="text-rose-300 text-xs mt-1 font-medium">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-300 transition-colors font-black text-lg"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sarlavha */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-950 p-6 rounded-[2.5rem] border border-slate-800">
        <div>
          <h1 className="text-3xl font-black text-white italic">
            DAVOMAT <span className="text-yellow-500 underline">SO'ROVLARI</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
            Xodimlardan kelgan tasdiqlar
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-2xl border border-slate-800">
          <CalendarCheck className="text-yellow-500 ml-2" size={20} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-white p-2 outline-none font-black"
          />
        </div>
      </div>

      {/* Xodimlar ro'yxati */}
      <div className="grid gap-4">
        {employees.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="font-black uppercase text-sm">Xodimlar topilmadi</p>
          </div>
        ) : (
          employees.map((emp) => {
            const empId = emp._id || emp.id;
            const record = attendance.find(
              (a) => (a.employeeId?._id || a.employeeId) === empId && a.date === selectedDate
            );
            const isPending = record?.status === 'PENDING';
            const isPresent = record?.status === 'PRESENT';
            const isAbsent  = record?.status === 'ABSENT';
            const hasRecord = !!record;
            const isLoading = loading === empId;

            return (
              <div
                key={empId}
                className={`flex flex-col md:flex-row items-center justify-between p-6 rounded-[2.5rem] border transition-all duration-300 ${
                  isPending ? 'bg-yellow-500/10 border-yellow-500 shadow-lg shadow-yellow-500/20' 
                  : 'bg-slate-950 border-slate-900'
                } ${isLoading ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-5 w-full md:w-auto">
                  <div
                    className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl border transition-all duration-300 ${
                      isPresent ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/20'
                      : isAbsent ? 'bg-rose-500/20 border-rose-500 text-rose-500 shadow-lg shadow-rose-500/20'
                      : 'bg-slate-900 border-slate-700 text-slate-500'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" size={24} />
                    ) : (
                      emp.name?.[0] || '?'
                    )}
                  </div>
                  <div>
                    <h4 className={`text-xl font-black transition-colors ${hasRecord ? 'text-white' : 'text-slate-600'}`}>
                      {emp.name}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] text-slate-500 uppercase font-black bg-slate-900 px-2 py-1 rounded">
                        {emp.position}
                      </span>
                      {record?.objectName && (
                        <span className="flex items-center gap-1 text-[9px] text-blue-400 font-black uppercase">
                          <Building2 size={12} /> {record.objectName}
                        </span>
                      )}
                      {isPending && (
                        <span className="flex items-center gap-1 text-[9px] text-yellow-500 font-black uppercase animate-pulse">
                          ⏱ KUTILMOQDA
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6 md:mt-0 w-full md:w-auto">
                  <button
                    onClick={() => markAttendance(empId, 'PRESENT', {
                      objectId: record?.objectId,
                      objectName: record?.objectName,
                    })}
                    disabled={isLoading}
                    className={`flex-1 md:flex-none px-8 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all duration-300 ${
                      isPresent 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-slate-900 text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50'
                    } ${isLoading ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'}`}
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    {isPending ? 'TASDIQLASH' : 'BOR'}
                  </button>
                  
                  <button
                    onClick={() => markAttendance(empId, 'ABSENT')}
                    disabled={isLoading}
                    className={`flex-1 md:flex-none px-8 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all duration-300 ${
                      isAbsent 
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30'
                        : 'bg-slate-900 text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/50'
                    } ${isLoading ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'}`}
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <XCircle size={16} />
                    )}
                    YO'Q
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Attendance;