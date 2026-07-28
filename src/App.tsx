import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { EmployeePortalApp } from './components/EmployeePortalApp';
import { BranchTerminalQRView } from './components/BranchTerminalQRView';
import { AdminDashboard } from './components/AdminDashboard';
import { Employee, AttendanceRecord, BranchLocation } from './types';
import { 
  fetchBranches, 
  fetchEmployees, 
  fetchAttendanceRecords, 
  recordClockIn, 
  recordClockOut 
} from './services/api';

export default function App() {
  const getViewFromPath = (): 'portal' | 'terminal' | 'admin' => {
    const path = window.location.pathname.replace(/\/$/, '');
    if (path === '/terminal') return 'terminal';
    if (path === '/admin') return 'admin';
    return 'portal';
  };

  const [currentView, setCurrentView] = useState<'portal' | 'terminal' | 'admin'>(getViewFromPath);
  const [selectedBranch, setSelectedBranch] = useState<string>('Todas');

  const [branches, setBranches] = useState<BranchLocation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(
    new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  const navigateToView = (view: 'portal' | 'terminal' | 'admin') => {
    const path = view === 'portal' ? '/empleado' : `/${view}`;
    window.history.pushState({}, '', path);
    setCurrentView(view);
  };

  useEffect(() => {
    const handlePopState = () => setCurrentView(getViewFromPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Load initial data from central server
  const loadData = async () => {
    setIsSyncing(true);
    try {
      const [branchData, empData, attData] = await Promise.all([
        fetchBranches(),
        fetchEmployees(),
        fetchAttendanceRecords(selectedBranch),
      ]);

      if (branchData.length > 0) setBranches(branchData);
      if (empData.length > 0) setEmployees(empData);
      setAttendanceRecords(attData);

      setLastSyncedTime(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.warn('Error loading sync data:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranch]);

  // Real-time synchronization polling every 12 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 12000);
    return () => clearInterval(interval);
  }, [selectedBranch]);

  // Clock In handler
  const handleClockIn = async (payload: {
    employeeCodeOrId: string;
    branch?: string;
    location?: { latitude: number; longitude: number; accuracy: number; address?: string };
    method?: 'QR Cámara' | 'Código PIN' | 'Manual Admin';
    notes?: string;
    deviceId?: string;
  }) => {
    const result = await recordClockIn(payload);
    // Refresh local records state immediately
    await loadData();
    return result;
  };

  // Clock Out handler
  const handleClockOut = async (payload: {
    employeeCodeOrId: string;
    branch?: string;
    location?: { latitude: number; longitude: number; accuracy: number; address?: string };
    method?: 'QR Cámara' | 'Código PIN' | 'Manual Admin';
    notes?: string;
    deviceId?: string;
  }) => {
    const result = await recordClockOut(payload);
    await loadData();
    return result;
  };

  // Calculate live counts for header
  const todayStr = new Date().toISOString().split('T')[0];
  const activeEmpCount = employees.filter((e) => e.active).length;
  const presentTodayCount = new Set(
    attendanceRecords.filter((r) => r.dateStr === todayStr && r.type === 'entry').map((r) => r.employeeId)
  ).size;

  const isEmployeeApp = currentView === 'portal';

  return (
    <div className={`${isEmployeeApp ? 'min-h-screen bg-[#060e20]' : 'min-h-screen bg-slate-200'} text-slate-900 font-sans flex flex-col selection:bg-emerald-600 selection:text-white`}>
      
      {/* Top Header */}
      {!isEmployeeApp && <Header
        currentView={currentView}
        onNavigate={navigateToView}
        selectedBranch={selectedBranch}
        setSelectedBranch={setSelectedBranch}
        branches={branches}
        isSyncing={isSyncing}
        onManualSync={loadData}
        lastSyncedTime={lastSyncedTime}
        activeEmployeesCount={activeEmpCount}
        presentTodayCount={presentTodayCount}
      />}

      {/* Main Container */}
      <main className={`flex-1 ${isEmployeeApp ? '' : 'pb-12'}`}>
        {currentView === 'portal' ? (
          <EmployeePortalApp
            employees={employees}
            attendanceRecords={attendanceRecords}
            branches={branches}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onRefreshData={loadData}
          />
        ) : currentView === 'terminal' ? (
          <BranchTerminalQRView
            branches={branches}
            selectedBranch={selectedBranch}
            onBranchChange={setSelectedBranch}
            attendanceRecords={attendanceRecords}
            employees={employees}
          />
        ) : (
          <AdminDashboard
            employees={employees}
            attendanceRecords={attendanceRecords}
            branches={branches}
            selectedBranch={selectedBranch}
            onRefresh={loadData}
          />
        )}
      </main>

      {/* Footer */}
      {!isEmployeeApp && <footer className="bg-slate-300 text-slate-700 py-6 text-center text-xs border-t border-slate-400 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-bold text-slate-900">
            Inmobiliaria CAMBIOS de aire &copy; {new Date().getFullYear()} — Sistema de Control de Asistencia y Jornada Laboral
          </p>
          <p className="text-[11px] text-slate-700 font-medium">
            Sincronización en tiempo real con servidor central • Lectura por Cámara QR • Geolocalización GPS Verificada
          </p>
        </div>
      </footer>}

    </div>
  );
}
