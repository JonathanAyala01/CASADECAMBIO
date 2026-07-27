import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Sparkles, 
  FileSpreadsheet, 
  Users, 
  CheckCircle2, 
  Bot, 
  Download, 
  Calendar,
  Building2,
  ChevronRight
} from 'lucide-react';
import { WeeklyReportSummary } from '../types';
import { fetchWeeklyReport, generateAIPunctualitySummary } from '../services/api';

export const WeeklyReportView: React.FC = () => {
  const [report, setReport] = useState<WeeklyReportSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await fetchWeeklyReport();
      setReport(data);
    } catch (e) {
      console.error('Error loading weekly report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleGenerateAiReport = async () => {
    setIsAiLoading(true);
    setAiError(null);
    try {
      const summaryText = await generateAIPunctualitySummary();
      setAiSummary(summaryText);
    } catch (err: any) {
      setAiError(err?.message || 'Error al conectar con la Inteligencia Artificial.');
    } finally {
      setIsAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200 space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Calculando métricas semanales de puntualidad y jornada...</p>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6">
      
      {/* Top Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Overall Punctuality Rate */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Índice de Puntualidad</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {report.overallPunctualityRate}%
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Semana Actual
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Porcentaje de ingresos dentro del margen de horario
          </p>
        </div>

        {/* Metric 2: Total Hours Worked */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Horas de Jornada</span>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {report.totalHoursWorked}h
            </span>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Acumuladas
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Suma total de horas trabajadas por todo el personal
          </p>
        </div>

        {/* Metric 3: Total Lateness Instances */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Casos de Tardanza</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {report.totalLatenessInstances}
            </span>
            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Promedio: {report.averageLatenessMinutes}m
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Registros de ingreso superiores a 5 mins de tolerancia
          </p>
        </div>

        {/* Metric 4: Active Employees */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Personal Evaluado</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {report.totalEmployeesActive}
            </span>
            <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              Empleados
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Cajeros, asesores y supervisores en sucursales
          </p>
        </div>

      </div>


      {/* Employee Breakdown Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Desglose de Puntualidad por Empleado</h3>
            <p className="text-xs text-slate-500">Puntaje y resumen acumulado de la semana</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Empleado</th>
                <th className="py-3 px-4">Sucursal & Cargo</th>
                <th className="py-3 px-4">Turnos Puntuales</th>
                <th className="py-3 px-4">Tardanzas</th>
                <th className="py-3 px-4">Total Horas</th>
                <th className="py-3 px-4">Puntaje</th>
                <th className="py-3 px-4 text-right">Estatus</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {report.employeeStats.map((emp) => (
                <tr key={emp.employeeId} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4">
                    <strong className="text-slate-900 font-semibold block">{emp.employeeName}</strong>
                    <span className="text-[10px] text-slate-400 font-mono">{emp.employeeCode}</span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{emp.branch}</div>
                    <div className="text-[10px] text-slate-400">{emp.role}</div>
                  </td>

                  <td className="py-3 px-4 font-semibold text-emerald-600">
                    {emp.punctualCount} / {emp.totalShiftsCompleted}
                  </td>

                  <td className="py-3 px-4">
                    {emp.lateCount > 0 ? (
                      <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {emp.lateCount} ({emp.totalLatenessMinutes} min)
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>

                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    {emp.totalHoursWorked}h
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                        <div
                          className={`h-full ${
                            emp.punctualityScore >= 90
                              ? 'bg-emerald-500'
                              : emp.punctualityScore >= 75
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${emp.punctualityScore}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-800 font-mono">{emp.punctualityScore}%</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      emp.statusBadge === 'Excelente'
                        ? 'bg-emerald-100 text-emerald-800'
                        : emp.statusBadge === 'Bueno'
                        ? 'bg-blue-100 text-blue-800'
                        : emp.statusBadge === 'Atención Requerida'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {emp.statusBadge}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
