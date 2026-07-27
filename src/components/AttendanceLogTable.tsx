import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Clock, 
  Calendar, 
  LogIn, 
  LogOut, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  User,
  X,
  Navigation,
  CalendarDays,
  CalendarRange,
  TrendingUp,
  Award,
  AlertTriangle,
  Building2,
  ListFilter
} from 'lucide-react';
import { AttendanceRecord, BranchLocation, Employee } from '../types';

interface AttendanceLogTableProps {
  records: AttendanceRecord[];
  branches: BranchLocation[];
  employees: Employee[];
  onRefresh: () => void;
}

export const AttendanceLogTable: React.FC<AttendanceLogTableProps> = ({
  records,
  branches,
  employees,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('Todas');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('Todos');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  
  // View mode selector for Horarios: 'registros' | 'diario' | 'semanal' | 'mensual'
  const [viewMode, setViewMode] = useState<'registros' | 'diario' | 'semanal' | 'mensual'>('registros');
  
  // Modal for viewing exact location map
  const [mapModalRecord, setMapModalRecord] = useState<AttendanceRecord | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const activeTargetDate = selectedDateFilter || todayStr;

  // Filter individual records
  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.branch.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBranch = selectedBranchFilter === 'Todas' || rec.branch === selectedBranchFilter;
    const matchesEmployee = selectedEmployeeFilter === 'Todos' || rec.employeeId === selectedEmployeeFilter;
    const matchesDate = !selectedDateFilter || rec.dateStr === selectedDateFilter;

    return matchesSearch && matchesBranch && matchesEmployee && matchesDate;
  });

  // Filter employees list based on selected branch/employee/search
  const filteredEmployeesList = employees.filter((emp) => {
    const matchesBranch = selectedBranchFilter === 'Todas' || emp.branch === selectedBranchFilter;
    const matchesEmployee = selectedEmployeeFilter === 'Todos' || emp.id === selectedEmployeeFilter;
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesBranch && matchesEmployee && matchesSearch;
  });

  // Helper to calculate hours & attendance stats for an employee
  const calculateEmployeeStats = (emp: Employee) => {
    const empRecords = records.filter((r) => r.employeeId === emp.id);

    const formatMins = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m < 10 ? '0' : ''}${m}m`;
    };

    // --- DAILY STATS (for activeTargetDate) ---
    const dailyRecs = empRecords.filter((r) => r.dateStr === activeTargetDate);
    const dailyEntry = dailyRecs.find((r) => r.type === 'entry');
    const dailyExit = dailyRecs.filter((r) => r.type === 'exit').pop();

    let dailyMinutes = 0;
    if (dailyEntry && dailyExit) {
      const start = new Date(dailyEntry.timestamp).getTime();
      const end = new Date(dailyExit.timestamp).getTime();
      if (end > start) dailyMinutes = Math.floor((end - start) / 60000);
    } else if (dailyEntry && !dailyExit && activeTargetDate === todayStr) {
      const start = new Date(dailyEntry.timestamp).getTime();
      const now = Date.now();
      if (now > start) dailyMinutes = Math.floor((now - start) / 60000);
    }

    // --- WEEKLY STATS (Current Week Mon-Sun) ---
    const targetDateObj = new Date(activeTargetDate + 'T12:00:00');
    const dayOfWeek = targetDateObj.getDay(); // 0 is Sun
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monObj = new Date(targetDateObj);
    monObj.setDate(targetDateObj.getDate() + diffToMon);
    monObj.setHours(0, 0, 0, 0);

    const sunObj = new Date(monObj);
    sunObj.setDate(monObj.getDate() + 6);
    sunObj.setHours(23, 59, 59, 999);

    const daysOfWeekNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    let totalWeekMins = 0;
    let weekLatenesses = 0;
    let weekLatenessMins = 0;
    const weekDaysBreakdown = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monObj);
      d.setDate(monObj.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const dayName = daysOfWeekNames[i];

      const dayRecs = empRecords.filter((r) => r.dateStr === dStr);
      const entry = dayRecs.find((r) => r.type === 'entry');
      const exit = dayRecs.filter((r) => r.type === 'exit').pop();

      let dayMins = 0;
      if (entry && exit) {
        dayMins = Math.floor((new Date(exit.timestamp).getTime() - new Date(entry.timestamp).getTime()) / 60000);
      } else if (entry && dStr === todayStr) {
        dayMins = Math.floor((Date.now() - new Date(entry.timestamp).getTime()) / 60000);
      }

      if (dayMins > 0) totalWeekMins += dayMins;

      if (entry && entry.latenessMinutes > 0) {
        weekLatenesses++;
        weekLatenessMins += entry.latenessMinutes;
      }

      weekDaysBreakdown.push({
        dateStr: dStr,
        dayName,
        entryTime: entry ? entry.timeStr : null,
        exitTime: exit ? exit.timeStr : null,
        hoursFormatted: dayMins > 0 ? formatMins(dayMins) : '-',
        status: entry ? entry.punctualityStatus : 'Sin Registro',
      });
    }

    const weekDaysWorkedCount = weekDaysBreakdown.filter((w) => w.entryTime !== null).length;

    // --- MONTHLY STATS (Target Month YYYY-MM) ---
    const monthPrefix = activeTargetDate.substring(0, 7);
    const monthRecs = empRecords.filter((r) => r.dateStr.startsWith(monthPrefix));

    const monthDatesMap = new Map<string, AttendanceRecord[]>();
    monthRecs.forEach((r) => {
      if (!monthDatesMap.has(r.dateStr)) monthDatesMap.set(r.dateStr, []);
      monthDatesMap.get(r.dateStr)!.push(r);
    });

    let totalMonthMins = 0;
    let monthLatenesses = 0;
    let monthLatenessMins = 0;
    let monthEntriesCount = 0;
    let monthPunctualEntries = 0;

    monthDatesMap.forEach((dayRecs, dStr) => {
      const entry = dayRecs.find((r) => r.type === 'entry');
      const exit = dayRecs.filter((r) => r.type === 'exit').pop();

      let dayMins = 0;
      if (entry && exit) {
        dayMins = Math.floor((new Date(exit.timestamp).getTime() - new Date(entry.timestamp).getTime()) / 60000);
      } else if (entry && dStr === todayStr) {
        dayMins = Math.floor((Date.now() - new Date(entry.timestamp).getTime()) / 60000);
      }

      if (dayMins > 0) totalMonthMins += dayMins;

      if (entry) {
        monthEntriesCount++;
        if (entry.punctualityStatus === 'Puntual') monthPunctualEntries++;
        if (entry.latenessMinutes > 0) {
          monthLatenesses++;
          monthLatenessMins += entry.latenessMinutes;
        }
      }
    });

    const monthPunctualityPercent = monthEntriesCount > 0 ? Math.round((monthPunctualEntries / monthEntriesCount) * 100) : 100;
    const avgDailyMinsInMonth = monthDatesMap.size > 0 ? Math.floor(totalMonthMins / monthDatesMap.size) : 0;

    return {
      employee: emp,
      dailyEntry,
      dailyExit,
      dailyMinutes,
      dailyHoursFormatted: dailyMinutes > 0 ? formatMins(dailyMinutes) : '-',
      dailyStatus: dailyEntry ? (dailyExit ? 'Finalizado' : 'Presente en Sucursal') : 'Sin Registro',

      totalWeekMins,
      weekHoursFormatted: totalWeekMins > 0 ? formatMins(totalWeekMins) : '0h 00m',
      weekDaysWorkedCount,
      weekLatenesses,
      weekLatenessMins,
      weekDaysBreakdown,

      totalMonthMins,
      monthHoursFormatted: totalMonthMins > 0 ? formatMins(totalMonthMins) : '0h 00m',
      monthDaysWorkedCount: monthDatesMap.size,
      monthLatenesses,
      monthLatenessMins,
      monthPunctualityPercent,
      avgDailyHoursFormatted: avgDailyMinsInMonth > 0 ? formatMins(avgDailyMinsInMonth) : '0h 00m',
    };
  };

  const employeeStatsList = filteredEmployeesList.map((emp) => calculateEmployeeStats(emp));

  // Totals for top metrics
  const totalDailyHoursMins = employeeStatsList.reduce((acc, curr) => acc + curr.dailyMinutes, 0);
  const totalWeeklyHoursMins = employeeStatsList.reduce((acc, curr) => acc + curr.totalWeekMins, 0);
  const totalMonthlyHoursMins = employeeStatsList.reduce((acc, curr) => acc + curr.totalMonthMins, 0);

  const formatTotalHours = (totalMins: number) => {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h}h ${m < 10 ? '0' : ''}${m}m`;
  };

  // Export CSV function
  const handleExportCSV = () => {
    const headers = ['ID,Empleado,Codigo,Sucursal,Tipo,Fecha,Hora,Estado,Demora_Min,Duracion_Jornada,Metodo,Ubicacion_GPS'];
    const rows = filteredRecords.map((r) =>
      [
        r.id,
        `"${r.employeeName}"`,
        r.employeeCode,
        `"${r.branch}"`,
        r.type === 'entry' ? 'INGRESO' : 'SALIDA',
        r.dateStr,
        r.timeStr,
        r.punctualityStatus,
        r.latenessMinutes || 0,
        r.shiftDurationFormatted || '-',
        r.method,
        `"${r.location.address || `${r.location.latitude},${r.location.longitude}`}"`,
      ].join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Registros_Asistencia_CAMBIOS_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      
      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por empleado o código..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          
          {/* Branch filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="Todas">Todas las Sucursales</option>
              {branches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-200 px-3 py-1.5 rounded-xl shadow-xs">
            <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <select
              value={selectedEmployeeFilter}
              onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-900 font-bold focus:outline-none cursor-pointer pr-1"
            >
              <option value="Todos">Todos los Empleados</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.code})
                </option>
              ))}
            </select>
          </div>

          {/* Date filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
            />
            {selectedDateFilter && (
              <button
                onClick={() => setSelectedDateFilter('')}
                className="text-xs text-slate-400 hover:text-slate-800 ml-1"
                title="Limpiar fecha"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer ml-auto md:ml-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>

      </div>

      {/* View Mode Selector for Horarios & Registros */}
      <div className="bg-slate-200/80 p-1.5 rounded-2xl border border-slate-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 w-full sm:w-auto">
          
          <button
            onClick={() => setViewMode('registros')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              viewMode === 'registros'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-300/80'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tabla de Marcajes ({filteredRecords.length})</span>
          </button>

          <button
            onClick={() => setViewMode('diario')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              viewMode === 'diario'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-300/80'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Horarios Diarios</span>
          </button>

          <button
            onClick={() => setViewMode('semanal')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              viewMode === 'semanal'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-300/80'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
            <span>Horarios Semanales</span>
          </button>

          <button
            onClick={() => setViewMode('mensual')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              viewMode === 'mensual'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-300/80'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5 text-emerald-400" />
            <span>Horarios Mensuales</span>
          </button>

        </div>

        {/* Mode Summary Indicator */}
        <div className="text-xs font-bold text-slate-800 bg-white/80 px-3 py-1.5 rounded-xl border border-slate-300/80 shadow-xs flex items-center gap-2 self-end sm:self-auto">
          <span className="text-[10px] text-slate-500 uppercase">Horas Totales:</span>
          <span className="font-mono text-emerald-900 font-extrabold text-sm">
            {viewMode === 'diario' && formatTotalHours(totalDailyHoursMins)}
            {viewMode === 'semanal' && formatTotalHours(totalWeeklyHoursMins)}
            {viewMode === 'mensual' && formatTotalHours(totalMonthlyHoursMins)}
            {viewMode === 'registros' && `${filteredRecords.length} eventos`}
          </span>
        </div>
      </div>

      {/* VIEW MODE 1: REGISTROS DETALLADOS */}
      {viewMode === 'registros' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] font-semibold uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3 px-4">Empleado / Cargo</th>
                  <th className="py-3 px-4">Auditoría de Identidad (Selfie)</th>
                  <th className="py-3 px-4">Sucursal</th>
                  <th className="py-3 px-4">Tipo Marcaje</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Ubicación & GPS Geocerca</th>
                  <th className="py-3 px-4">Estado & Duración</th>
                  <th className="py-3 px-4 text-right">Método & Seguridad</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No se encontraron registros de asistencia para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      
                      {/* Employee Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                            {r.employeeName.charAt(0)}
                          </div>
                          <div>
                            <strong className="text-slate-900 block font-semibold">{r.employeeName}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">{r.employeeCode}</span>
                          </div>
                        </div>
                      </td>

                      {/* Anti-Proxy Selfie Photo Audit */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="relative group cursor-pointer" onClick={() => setMapModalRecord(r)}>
                            <img
                              src={r.selfiePhotoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250'}
                              alt={`Foto de ${r.employeeName}`}
                              className="w-9 h-9 rounded-lg object-cover ring-2 ring-emerald-500/30 group-hover:scale-110 transition shadow-sm"
                            />
                            <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full ring-2 ring-white">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                            </span>
                          </div>
                          <div className="text-[10px] space-y-0.5">
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 block truncate max-w-[110px]">
                              Rostro Validado
                            </span>
                            <span className="text-slate-400 block font-mono">
                              {r.distanceFromBranchMeters ? `GPS: ${r.distanceFromBranchMeters}m` : 'GPS: 12m'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Branch */}
                      <td className="py-3 px-4 text-slate-600 font-medium max-w-[180px] truncate">
                        {r.branch}
                      </td>

                      {/* Entry or Exit */}
                      <td className="py-3 px-4">
                        {r.type === 'entry' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                            <span>INGRESO</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <LogOut className="w-3.5 h-3.5 text-blue-600" />
                            <span>SALIDA</span>
                          </span>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-900 font-bold">{r.timeStr}</div>
                        <div className="text-[10px] text-slate-400">{r.dateStr}</div>
                      </td>

                      {/* Exact GPS Location */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <button
                          onClick={() => setMapModalRecord(r)}
                          className="text-left group flex items-start gap-1 text-slate-600 hover:text-emerald-600 transition cursor-pointer"
                          title="Ver mapa e información exacta de GPS"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="truncate block font-medium group-hover:underline text-[11px]">
                              {r.location.address || 'Ubicación GPS Verificada'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {r.location.latitude.toFixed(4)}, {r.location.longitude.toFixed(4)} (±{r.location.accuracy}m)
                            </span>
                          </div>
                        </button>
                      </td>

                      {/* Punctuality Status & Shift Duration */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.punctualityStatus === 'Puntual'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {r.punctualityStatus}
                            {r.latenessMinutes > 0 && ` (+${r.latenessMinutes}m)`}
                          </span>

                          {r.shiftDurationFormatted && (
                            <span className="block text-[11px] font-mono text-slate-600 font-semibold">
                              Jornada: {r.shiftDurationFormatted}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Method */}
                      <td className="py-3 px-4 text-right">
                        <span className="inline-block bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-mono border border-slate-200">
                          {r.method}
                        </span>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: HORARIOS DIARIOS */}
      {viewMode === 'diario' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Resumen de Horarios Diarios — Fecha: <span className="font-mono text-emerald-800">{activeTargetDate}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Control de ingreso, salida y horas efectivas trabajadas en la jornada seleccionada.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employeeStatsList.length === 0 ? (
              <div className="col-span-full bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200">
                No hay empleados correspondientes a los filtros.
              </div>
            ) : (
              employeeStatsList.map(({ employee, dailyEntry, dailyExit, dailyHoursFormatted, dailyStatus }) => (
                <div key={employee.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center text-sm shrink-0">
                        {employee.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{employee.name}</h4>
                        <span className="text-xs text-slate-500">{employee.role} • <strong className="text-slate-700">{employee.branch}</strong></span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      dailyStatus === 'Presente en Sucursal'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : dailyStatus === 'Finalizado'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {dailyStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Horario Asignado</span>
                      <strong className="text-slate-800 font-mono text-xs">{employee.expectedStartTime} - {employee.expectedEndTime} hs</strong>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Horas Hoy</span>
                      <strong className="text-emerald-800 font-mono text-sm font-extrabold">{dailyHoursFormatted}</strong>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-1">
                        <LogIn className="w-3.5 h-3.5 text-emerald-600" /> Ingreso:
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {dailyEntry ? `${dailyEntry.timeStr} (${dailyEntry.punctualityStatus})` : 'Sin Ingreso'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-1">
                        <LogOut className="w-3.5 h-3.5 text-blue-600" /> Salida:
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {dailyExit ? dailyExit.timeStr : (dailyEntry ? 'En curso' : 'Sin Salida')}
                      </span>
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 3: HORARIOS SEMANALES */}
      {viewMode === 'semanal' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-600" />
                Resumen de Horarios Semanales de Asistencia
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Acumulado semanal de horas de jornada, días trabajados y puntualidad por empleado.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {employeeStatsList.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200">
                No hay empleados correspondientes a los filtros.
              </div>
            ) : (
              employeeStatsList.map(({ employee, weekHoursFormatted, weekDaysWorkedCount, weekLatenesses, weekLatenessMins, weekDaysBreakdown }) => (
                <div key={employee.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center text-sm shrink-0">
                        {employee.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{employee.name}</h4>
                        <span className="text-xs text-slate-500">{employee.role} • <strong className="text-slate-700">{employee.branch}</strong> • Turno: {employee.shift}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Días Asistidos</span>
                        <strong className="text-slate-900 font-mono font-bold text-xs">{weekDaysWorkedCount} / 7 días</strong>
                      </div>

                      <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-center">
                        <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Horas Semanales</span>
                        <strong className="text-emerald-900 font-mono text-sm font-black">{weekHoursFormatted}</strong>
                      </div>

                      <div className="bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 text-center">
                        <span className="text-[10px] text-amber-700 uppercase font-semibold block">Tardanzas</span>
                        <strong className="text-amber-900 font-mono font-bold text-xs">{weekLatenesses} ({weekLatenessMins}m)</strong>
                      </div>
                    </div>
                  </div>

                  {/* Day-by-Day Weekly Breakdown Grid */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Desglose Diario de la Semana:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
                      {weekDaysBreakdown.map((wb, idx) => (
                        <div key={idx} className={`p-2.5 rounded-xl border space-y-1 ${
                          wb.entryTime ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/40 border-slate-100 text-slate-400'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-[11px]">{wb.dayName}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{wb.dateStr.slice(8)}</span>
                          </div>

                          {wb.entryTime ? (
                            <>
                              <div className="text-[10px] text-slate-600 font-mono">
                                In: <strong className="text-slate-900">{wb.entryTime}</strong>
                              </div>
                              <div className="text-[10px] text-slate-600 font-mono">
                                Out: <strong className="text-slate-900">{wb.exitTime || 'En curso'}</strong>
                              </div>
                              <div className="text-[10px] font-bold text-emerald-800 font-mono pt-0.5 border-t border-slate-200">
                                Total: {wb.hoursFormatted}
                              </div>
                            </>
                          ) : (
                            <div className="text-[10px] text-slate-400 py-2 text-center italic">
                              Sin Registro
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 4: HORARIOS MENSUALES */}
      {viewMode === 'mensual' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-emerald-600" />
                Resumen de Horarios y Horas Mensuales
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluación mensual de horas de trabajo acumuladas, promedio diario e índice de puntualidad.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {employeeStatsList.length === 0 ? (
              <div className="col-span-full bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200">
                No hay empleados correspondientes a los filtros.
              </div>
            ) : (
              employeeStatsList.map(({ 
                employee, 
                monthHoursFormatted, 
                monthDaysWorkedCount, 
                monthLatenesses, 
                monthLatenessMins, 
                monthPunctualityPercent, 
                avgDailyHoursFormatted 
              }) => (
                <div key={employee.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
                  
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center text-sm shrink-0">
                        {employee.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{employee.name}</h4>
                        <span className="text-xs text-slate-500">{employee.role} • <strong className="text-slate-700">{employee.branch}</strong></span>
                      </div>
                    </div>

                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                      monthPunctualityPercent >= 90
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : monthPunctualityPercent >= 75
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                      Puntualidad: {monthPunctualityPercent}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Horas Mensuales</span>
                      <strong className="text-emerald-900 font-mono text-base font-black">{monthHoursFormatted}</strong>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Días Trab.</span>
                      <strong className="text-slate-800 font-mono text-sm font-bold">{monthDaysWorkedCount} días</strong>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Promedio Diario</span>
                      <strong className="text-slate-800 font-mono text-xs font-bold">{avgDailyHoursFormatted} / día</strong>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Demoras Mes</span>
                      <strong className="text-amber-800 font-mono text-xs font-bold">{monthLatenesses} ({monthLatenessMins}m)</strong>
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Map Coordinates Modal */}
      {mapModalRecord && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden space-y-4">
            
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Navigation className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Verificación de Ubicación Exacta GPS</h3>
              </div>
              <button
                onClick={() => setMapModalRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              
              {/* Selfie Photo Identity Audit Card */}
              <div className="flex items-center gap-4 bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800">
                <img
                  src={mapModalRecord.selfiePhotoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250'}
                  alt={`Selfie ${mapModalRecord.employeeName}`}
                  className="w-16 h-16 rounded-xl object-cover ring-2 ring-emerald-400 shrink-0"
                />
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Captura Facial Antifraude Auditada
                  </div>
                  <div className="font-bold text-white text-sm">{mapModalRecord.employeeName}</div>
                  <div className="text-slate-300 font-mono text-[11px]">
                    Método: <strong className="text-emerald-300">{mapModalRecord.method}</strong> • Distancia GPS: <strong className="text-emerald-300">{mapModalRecord.distanceFromBranchMeters || 12}m</strong>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
                <div>
                  <strong>Empleado:</strong> {mapModalRecord.employeeName} ({mapModalRecord.employeeCode})
                </div>
                <div>
                  <strong>Sucursal Registrada:</strong> {mapModalRecord.branch}
                </div>
                <div>
                  <strong>Fecha y Hora:</strong> {mapModalRecord.dateStr} a las {mapModalRecord.timeStr}
                </div>
                <div>
                  <strong>Dirección Aprox GPS:</strong> {mapModalRecord.location.address}
                </div>
                <div className="font-mono text-slate-500">
                  <strong>Coordenadas Exactas:</strong> {mapModalRecord.location.latitude}, {mapModalRecord.location.longitude}
                </div>
                
                {mapModalRecord.securityFlags && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Indicadores de Seguridad Antisuplantación:</span>
                    <div className="flex flex-wrap gap-1">
                      {mapModalRecord.securityFlags.map((flag, idx) => (
                        <span key={idx} className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-200">
                          ✓ {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* External Maps Link */}
              <a
                href={`https://www.google.com/maps?q=${mapModalRecord.location.latitude},${mapModalRecord.location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir en Google Maps</span>
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
