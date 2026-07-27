import React, { useState, useEffect } from 'react';
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
  QrCode,
  CreditCard,
  CheckCircle2,
  XCircle,
  FileText,
  Upload,
  X
} from 'lucide-react';
import { Employee, AttendanceRecord, BranchLocation, PaymentRequest } from '../types';
import { AttendanceLogTable } from './AttendanceLogTable';
import { WeeklyReportView } from './WeeklyReportView';
import { EmployeeManagement } from './EmployeeManagement';
import { BranchManagement } from './BranchManagement';
import { fetchPaymentRequests, resolvePaymentRequest } from '../services/api';

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
  const [adminTab, setAdminTab] = useState<'logs' | 'weekly' | 'employees' | 'branches' | 'payments'>('logs');

  // Payment Requests Admin state
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});
  const [receiptFiles, setReceiptFiles] = useState<Record<string, string>>({});
  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);

  const loadPayments = async () => {
    setLoadingPayments(true);
    try {
      const reqs = await fetchPaymentRequests();
      setPaymentRequests(reqs);
    } catch (e) {
      console.error('Error loading payment requests:', e);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    // Always load on mount to show pending badge count in tab
    loadPayments();
  }, []);

  useEffect(() => {
    if (adminTab === 'payments') {
      loadPayments();
    }
  }, [adminTab]);

  const handleReceiptFileChange = (reqId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (src) setReceiptFiles(prev => ({ ...prev, [reqId]: src }));
    };
    reader.readAsDataURL(file);
  };

  const handleResolveRequest = async (reqId: string, status: 'approved' | 'rejected') => {
    setProcessingId(reqId);
    try {
      await resolvePaymentRequest(reqId, {
        status,
        notes: resolveNotes[reqId] || '',
        receiptUrl: receiptFiles[reqId] || undefined,
      });
      setResolveNotes(prev => { const n = { ...prev }; delete n[reqId]; return n; });
      setReceiptFiles(prev => { const n = { ...prev }; delete n[reqId]; return n; });
      loadPayments();
    } catch (err: any) {
      alert(err?.message || 'Error al procesar la solicitud');
    } finally {
      setProcessingId(null);
    }
  };

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

          <button
            onClick={() => setAdminTab('payments')}
            className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              adminTab === 'payments'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Adelantos y Pagos</span>
            {paymentRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                {paymentRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
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

      {/* --- TAB CONTENT: ADELANTOS Y COMISIONES (ADMIN) --- */}
      {adminTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Solicitudes de Adelanto y Comisiones
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Gestione, apruebe o rechace las solicitudes de pago del personal
              </p>
            </div>
            <button
              onClick={loadPayments}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 py-2 px-3 rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualizar
            </button>
          </div>

          {loadingPayments ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Cargando solicitudes...</p>
            </div>
          ) : paymentRequests.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
              <CreditCard className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm text-slate-500">No hay solicitudes de pago registradas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentRequests.map((req) => (
                <div
                  key={req.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                    req.status === 'pending'
                      ? 'border-amber-300'
                      : req.status === 'approved'
                      ? 'border-emerald-300'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Header */}
                  <div className={`px-5 py-3.5 flex items-center justify-between flex-wrap gap-2 border-b ${
                    req.status === 'pending' ? 'bg-amber-50 border-amber-200' :
                    req.status === 'approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            req.type === 'adelanto' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {req.type === 'adelanto' ? 'Adelanto' : 'Comisión'}
                          </span>
                          <strong className="text-slate-900 text-sm font-extrabold font-mono">
                            ${req.amount.toLocaleString('es-AR')}
                          </strong>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {req.employeeName} &bull; {req.employeeCode}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(req.requestedAt).toLocaleString('es-AR')}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : req.status === 'rejected'
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {req.status === 'approved' ? '✓ Aprobado' : req.status === 'rejected' ? '✗ Rechazado' : '⏳ Pendiente'}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-4 text-xs">
                    <div>
                      <span className="font-semibold text-slate-700 block mb-0.5">Motivo:</span>
                      <p className="text-slate-600">{req.reason}</p>
                    </div>

                    {req.notes && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="font-semibold text-slate-700 block mb-0.5">Respuesta del Administrador:</span>
                        <p className="text-slate-600">{req.notes}</p>
                      </div>
                    )}

                    {/* Receipt Upload if approved */}
                    {req.receiptUrl && (
                      <button
                        onClick={() => setViewReceiptUrl(req.receiptUrl || null)}
                        className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-semibold transition cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        Ver Comprobante Subido
                      </button>
                    )}

                    {/* Admin Actions (only for pending) */}
                    {req.status === 'pending' && (
                      <div className="border-t border-slate-100 pt-4 space-y-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Respuesta / Notas (opcional)</label>
                          <textarea
                            value={resolveNotes[req.id] || ''}
                            onChange={(e) => setResolveNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                            placeholder="Ej: Aprobado. Transferido el 28/07. Descontado de quincena..."
                            rows={2}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Subir Comprobante de Pago (opcional)</label>
                          <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl border border-slate-200 cursor-pointer transition w-full justify-center">
                            <Upload className="w-4 h-4" />
                            <span>{receiptFiles[req.id] ? '✓ Comprobante cargado' : 'Seleccionar imagen o PDF'}</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => handleReceiptFileChange(req.id, e)}
                            />
                          </label>
                          {receiptFiles[req.id] && (
                            <button
                              onClick={() => setViewReceiptUrl(receiptFiles[req.id])}
                              className="mt-1.5 text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" /> Vista previa del comprobante
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => handleResolveRequest(req.id, 'rejected')}
                            disabled={processingId === req.id}
                            className="px-4 py-2 bg-slate-100 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            Rechazar Solicitud
                          </button>
                          <button
                            onClick={() => handleResolveRequest(req.id, 'approved')}
                            disabled={processingId === req.id}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {processingId === req.id ? 'Procesando...' : 'Aprobar y Pagar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Receipt Viewer Modal */}
      {viewReceiptUrl && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Comprobante de Pago</h3>
              </div>
              <button
                onClick={() => setViewReceiptUrl(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 min-h-[200px] flex items-center justify-center">
                {viewReceiptUrl.startsWith('data:application/pdf') || viewReceiptUrl.toLowerCase().endsWith('.pdf') ? (
                  <div className="p-6 space-y-3">
                    <FileText className="w-12 h-12 mx-auto text-emerald-600" />
                    <p className="text-sm text-slate-600">Documento PDF</p>
                    <a
                      href={viewReceiptUrl}
                      download="comprobante.pdf"
                      className="inline-block px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl"
                    >
                      Descargar PDF
                    </a>
                  </div>
                ) : (
                  <img
                    src={viewReceiptUrl}
                    alt="Comprobante de Pago"
                    className="max-w-full max-h-[400px] object-contain rounded-xl"
                  />
                )}
              </div>
              <button
                onClick={() => setViewReceiptUrl(null)}
                className="mt-4 px-6 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
