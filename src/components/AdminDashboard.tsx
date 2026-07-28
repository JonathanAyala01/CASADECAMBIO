import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  Award, 
  AlertTriangle, 
  Building2, 
  ShieldCheck, 
  ListFilter, 
  FileSpreadsheet, 
  BarChart3, 
  UserCheck, 
  UserX, 
  LogIn, 
  LogOut, 
  RefreshCw,
  QrCode
} from 'lucide-react';
import { Employee, AttendanceRecord, BranchLocation } from '../types';
import { AttendanceLogTable } from './AttendanceLogTable';
import { WeeklyReportView } from './WeeklyReportView';
import { EmployeeManagement } from './EmployeeManagement';
import { BranchManagement } from './BranchManagement';

interface AdminDashboardProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  branches: BranchLocation[];
  selectedBranch: string;
  onRefresh: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  employees,
  attendanceRecords,
  branches,
  selectedBranch,
  onRefresh,
}) => {
  const [adminTab, setAdminTab] = useState<'logs' | 'weekly' | 'employees' | 'branches'>('logs');

  const todayStr = new Date().toISOString().split('T')[0];

  // Calculate live presence stats
  const todayRecords = attendanceRecords.filter((r) => r.dateStr === todayStr);

  // Present right now = has an entry today without a subsequent exit today
  const activeEmployees = employees.filter((e) => e.active);

  const employeesStatus = activeEmployees.map((emp) => {
    const empTodayRecs = todayRecords.filter((r) => r.employeeId === emp.id);
    const lastEntry = empTodayRecs.filter((r) => r.type === 'entry').pop();
    const lastExit = empTodayRecs.filter((r) => r.type === 'exit').pop();

    let isPresent = false;
    if (lastEntry) {
      if (!lastExit || new Date(lastExit.timestamp) < new Date(lastEntry.timestamp)) {
        isPresent = true;
      }
    }

    return {
      employee: emp,
      isPresent,
      lastEntry,
      lastExit,
    };
  });

  const presentCount = employeesStatus.filter((s) => s.isPresent).length;
  const absentCount = activeEmployees.length - presentCount;
  const lateTodayCount = todayRecords.filter((r) => r.type === 'entry' && r.punctualityStatus === 'Tardanza').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Real-time Status Counter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Presentes en Jornada</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-600 font-mono">{presentCount}</span>
            <span className="text-xs text-slate-400">de {activeEmployees.length} empleados</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Con ingreso activo registrado hoy</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Demoras / Tardanzas Hoy</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-amber-600 font-mono">{lateTodayCount}</span>
            <span className="text-xs text-slate-400">ingresos con demora</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sujeto a evaluación de puntualidad</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sin Marcaje Hoy</span>
            <div className="p-2 bg-slate-50 text-slate-600 rounded-xl">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-700 font-mono">{absentCount}</span>
            <span className="text-xs text-slate-400">pendientes</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Aún no registran ingreso</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Marcajes de Hoy</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{todayRecords.length}</span>
            <span className="text-xs text-slate-400">eventos</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Lecturas de escáner en sucursales</p>
        </div>

      </div>

      {/* Security & Anti-Proxy Audit Banner */}
      <div className="bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 text-slate-900 p-5 rounded-2xl shadow-md border border-slate-400 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-400/60 pb-2.5">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-800" />
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Control Antifraude: Prevención de Clave Compartida y Suplantación
            </h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-950 bg-emerald-800/15 px-2.5 py-0.5 rounded-full border border-emerald-700/30 font-mono">
            3 Capas de Protección Activas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-800 pt-1">
          <div className="bg-slate-100/90 p-3 rounded-xl border border-slate-400/80 shadow-sm space-y-1">
            <span className="text-emerald-900 font-black block">1. Celular Único Vinculado</span>
            <p className="text-[11px] text-slate-700 font-medium">
              Cada empleado solo puede fichar desde su teléfono personal autorizado. Evita traspaso de claves a terceros.
            </p>
          </div>

          <div className="bg-slate-100/90 p-3 rounded-xl border border-slate-400/80 shadow-sm space-y-1">
            <span className="text-emerald-900 font-black block">2. Dynamic QR (10 segs)</span>
            <p className="text-[11px] text-slate-700 font-medium">
              El QR del tótem cambia cada 10s con sello criptográfico. Es imposible enviar capturas por WhatsApp para marcar a la distancia.
            </p>
          </div>

          <div className="bg-slate-100/90 p-3 rounded-xl border border-slate-400/80 shadow-sm space-y-1">
            <span className="text-emerald-900 font-black block">3. Geocerca GPS &lt; 100m</span>
            <p className="text-[11px] text-slate-700 font-medium">
              Verifica que las coordenadas del teléfono celular del empleado estén físicamente dentro del radio de la sucursal asignada.
            </p>
          </div>
        </div>
      </div>

      {/* Admin Tab Navigation Bar */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-1 w-full sm:w-auto">
          
          <button
            onClick={() => setAdminTab('logs')}
            className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              adminTab === 'logs'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Registros de Asistencia</span>
          </button>

          <button
            onClick={() => setAdminTab('weekly')}
            className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              adminTab === 'weekly'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>Reportes Semanales de Puntualidad</span>
          </button>

          <button
            onClick={() => setAdminTab('employees')}
            className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              adminTab === 'employees'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Personal & Credenciales</span>
          </button>

          <button
            onClick={() => setAdminTab('branches')}
            className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              adminTab === 'branches'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Sucursales (ABM)</span>
          </button>

        </div>

        <button
          onClick={onRefresh}
          className="text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 py-2 px-3 rounded-xl border border-slate-200 flex items-center gap-1.5 transition cursor-pointer self-end sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Actualizar Datos</span>
        </button>
      </div>

      {/* Tab Views */}
      {adminTab === 'logs' && (
        <AttendanceLogTable
          records={attendanceRecords}
          branches={branches}
          employees={employees}
          onRefresh={onRefresh}
        />
      )}

      {adminTab === 'weekly' && (
        <WeeklyReportView />
      )}

      {adminTab === 'employees' && (
        <EmployeeManagement
          employees={employees}
          branches={branches}
          onRefresh={onRefresh}
        />
      )}

      {adminTab === 'branches' && (
        <BranchManagement
          branches={branches}
          employees={employees}
          onRefresh={onRefresh}
        />
      )}

    </div>
  );
};
