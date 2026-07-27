import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { 
  User, 
  Key, 
  LogIn, 
  LogOut, 
  Camera, 
  QrCode, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  Calendar, 
  Award, 
  RefreshCcw, 
  ShieldCheck, 
  Smartphone, 
  Building2, 
  Sparkles, 
  ChevronRight, 
  ArrowRight,
  Navigation,
  FileText,
  BadgeCheck,
  X
} from 'lucide-react';
import { Employee, AttendanceRecord, GeoLocationData, BranchLocation } from '../types';
import { QRBadgeGenerator } from './QRBadgeGenerator';

interface EmployeePortalAppProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  branches: BranchLocation[];
  onClockIn: (payload: {
    employeeCodeOrId: string;
    branch?: string;
    location?: GeoLocationData;
    method?: 'QR Cámara' | 'Código PIN' | 'Manual Admin';
    notes?: string;
  }) => Promise<{ success: boolean; message: string; record: AttendanceRecord; employee: Employee }>;
  onClockOut: (payload: {
    employeeCodeOrId: string;
    branch?: string;
    location?: GeoLocationData;
    method?: 'QR Cámara' | 'Código PIN' | 'Manual Admin';
    notes?: string;
  }) => Promise<{ success: boolean; message: string; record: AttendanceRecord; employee: Employee; shiftDurationFormatted: string }>;
  onRefreshData: () => void;
}

export const EmployeePortalApp: React.FC<EmployeePortalAppProps> = ({
  employees,
  attendanceRecords,
  branches,
  onClockIn,
  onClockOut,
  onRefreshData,
}) => {
  // Login State
  const [loggedEmployee, setLoggedEmployee] = useState<Employee | null>(() => {
    // Default logged in as first active employee for smooth immediate demo
    return employees.find((e) => e.active) || null;
  });

  const [inputCodeOrPin, setInputCodeOrPin] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Scanner modal state
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // GPS Location state
  const [userLocation, setUserLocation] = useState<GeoLocationData | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Result Feedback modal
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    record?: AttendanceRecord;
    duration?: string;
  } | null>(null);

  // Show badge modal
  const [showBadgeModal, setShowBadgeModal] = useState<boolean>(false);

  // Live Time
  const [nowTime, setNowTime] = useState<Date>(new Date());

  const qrRegionId = 'employee-portal-camera-region';
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch GPS location
  const fetchGps = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          address: loggedEmployee ? loggedEmployee.branch : 'Ubicación GPS Verificada',
        });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setUserLocation({
          latitude: -34.6037,
          longitude: -58.3816,
          accuracy: 15,
          address: loggedEmployee ? loggedEmployee.branch : 'Sucursal Central CAMBIOS de aire',
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    if (loggedEmployee) {
      fetchGps();
    }
  }, [loggedEmployee]);

  // Handle Login Form
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const query = inputCodeOrPin.trim().toUpperCase();

    const emp = employees.find(
      (e) => e.code.toUpperCase() === query || e.pin === query || e.id === query || e.email.toUpperCase() === query
    );

    if (emp) {
      if (!emp.active) {
        setLoginError('El empleado se encuentra inactivo en el sistema.');
        return;
      }
      setLoggedEmployee(emp);
      setInputCodeOrPin('');
    } else {
      setLoginError('Código o PIN incorrecto. Intente nuevamente o use el selector rápido de demo.');
    }
  };

  const handleLogout = () => {
    setLoggedEmployee(null);
    setShowScannerModal(false);
    setLastResult(null);
  };

  // Check if currently clocked in today
  const todayStr = new Date().toISOString().split('T')[0];
  const myRecords = loggedEmployee
    ? attendanceRecords.filter((r) => r.employeeId === loggedEmployee.id)
    : [];

  const myTodayRecords = myRecords.filter((r) => r.dateStr === todayStr);
  const todayEntryRecord = myTodayRecords.find((r) => r.type === 'entry');
  const hasClockedInToday = Boolean(todayEntryRecord);

  // Calculate stats for logged employee
  const totalEntries = myRecords.filter((r) => r.type === 'entry');
  const punctualEntries = totalEntries.filter((r) => r.punctualityStatus === 'Puntual');
  const punctualityScore = totalEntries.length > 0 ? Math.round((punctualEntries.length / totalEntries.length) * 100) : 100;

  // Start / Stop Camera Scanner
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (html5QrcodeRef.current) {
        try {
          await html5QrcodeRef.current.stop();
        } catch (e) {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode(qrRegionId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
        ],
        verbose: false,
      });
      html5QrcodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: facingMode },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleQrScanned(decodedText);
        },
        () => {}
      );
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Portal camera error:', err);
      setCameraError('No se pudo acceder a la cámara del dispositivo.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (e) {
        // ignore
      }
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (showScannerModal) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [showScannerModal, facingMode]);

  // Handle scanned QR Code (e.g. from Admin Terminal)
  const handleQrScanned = async (data: string) => {
    if (isSubmitting || !loggedEmployee) return;

    stopCamera();
    setIsSubmitting(true);
    setLastResult(null);

    // Extract branch name if scanned from Admin Terminal e.g., "CAMBIOS|BRANCH|Microcentro|MODE:DUAL|TS:123"
    let scannedBranch = loggedEmployee.branch;
    if (data.includes('CAMBIOS|BRANCH|')) {
      const parts = data.split('|');
      if (parts[2]) scannedBranch = parts[2];
    }

    const gpsLoc = userLocation || {
      latitude: -34.6037,
      longitude: -58.3816,
      accuracy: 10,
      address: scannedBranch,
    };

    try {
      // Daily Clock In
      const res = await onClockIn({
        employeeCodeOrId: loggedEmployee.code,
        branch: scannedBranch,
        location: gpsLoc,
        method: 'QR Cámara',
      });

      setLastResult({
        success: true,
        message: res.message,
        record: res.record,
      });

      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#059669', '#34d399'],
      });

      setShowScannerModal(false);
      onRefreshData();
    } catch (err: any) {
      setLastResult({
        success: false,
        message: err?.message || 'Error al procesar la asistencia',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- VIEW 1: LOGIN SCREEN IF NOT LOGGED IN ---
  if (!loggedEmployee) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 space-y-6">
        
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 text-center space-y-6">
          <img
            src="/loguito.png"
            alt="Logo Inmobiliaria CAMBIOS de aire"
            className="h-32 sm:h-36 w-auto mx-auto object-contain"
            referrerPolicy="no-referrer"
          />

          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Portal del Empleado
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Inmobiliaria CAMBIOS de aire — Control de Jornada Móvil
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                PIN de Acceso o Código de Empleado
              </label>
              <div className="relative">
                <Key className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inputCodeOrPin}
                  onChange={(e) => setInputCodeOrPin(e.target.value)}
                  placeholder="Ej. PIN 1001 o CAMBIO-101"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-700/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-5 h-5" />
              <span>Ingresar a Mi Portal</span>
            </button>
          </form>

          {/* Quick Demo Test Logins */}
          <div className="pt-4 border-t border-slate-100 text-left space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Prueba Rápida con 1 Clic (Seleccionar Perfil):
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {employees.slice(0, 5).map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setLoggedEmployee(emp)}
                  className="w-full p-2.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-xl transition text-left flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={emp.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250'}
                      alt={emp.name}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    <div>
                      <strong className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 block">{emp.name}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">{emp.role} • PIN {emp.pin}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    );
  }

  // --- VIEW 2: LOGGED-IN EMPLOYEE DASHBOARD ---
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Employee Profile Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-700/80 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          
          <div className="flex items-center space-x-4">
            <img
              src={loggedEmployee.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250'}
              alt={loggedEmployee.name}
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-400 shadow-md shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40 font-mono">
                  {loggedEmployee.code}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">PIN {loggedEmployee.pin}</span>
              </div>
              <h2 className="text-xl font-extrabold text-white mt-1">{loggedEmployee.name}</h2>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{loggedEmployee.role} — <strong className="text-white">{loggedEmployee.branch}</strong></span>
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer self-end sm:self-auto"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Cerrar Sesión</span>
          </button>

        </div>

        {/* GPS Verification Info Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
          <div className="flex items-center gap-2">
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
            {isLocating ? (
              <span className="text-amber-300">Verificando GPS...</span>
            ) : userLocation ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>GPS Ubicación: <strong className="text-white">{userLocation.address}</strong> (±{userLocation.accuracy}m)</span>
              </span>
            ) : (
              <span className="text-slate-400">GPS no disponible</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBadgeModal(true)}
              className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px] font-semibold px-3 py-1 rounded-lg border border-emerald-500/40 flex items-center gap-1 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" /> Mi Credencial QR
            </button>
          </div>
        </div>
      </div>

      {/* Main Shift Status Card & Primary Camera Scan Action */}
      <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 space-y-6">
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
          
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado de Registro Diario:</span>
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <span className={`w-3.5 h-3.5 rounded-full ${hasClockedInToday ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
              <strong className={`text-xl font-black ${hasClockedInToday ? 'text-emerald-600' : 'text-amber-600'}`}>
                {hasClockedInToday ? 'ENTRADA DE HOY REGISTRADA' : 'PENDIENTE DE REGISTRO'}
              </strong>
            </div>

            {todayEntryRecord ? (
              <p className="text-xs text-slate-600 font-mono pt-1">
                Ingreso hoy a las <strong className="text-slate-900 font-bold">{todayEntryRecord.timeStr}</strong> • Estado: <span className="text-emerald-700 font-bold">{todayEntryRecord.punctualityStatus}</span>
              </p>
            ) : (
              <p className="text-xs text-slate-500 font-mono pt-1">
                Horario de ingreso previsto: <strong className="text-slate-800">{loggedEmployee.expectedStartTime} hs</strong>
              </p>
            )}
          </div>

          {/* Primary Action Button: Open Camera Scanner */}
          <button
            onClick={() => setShowScannerModal(true)}
            className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-white text-base shadow-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 cursor-pointer ${
              hasClockedInToday
                ? 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-800/30 ring-4 ring-emerald-500/20'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-700/30 ring-4 ring-emerald-500/20'
            }`}
          >
            <Camera className="w-6 h-6 animate-pulse" />
            <span>{hasClockedInToday ? 'RECONFIRMAR ENTRADA DIARIA' : 'ESCANEAR QR DE ENTRADA DIARIA'}</span>
          </button>

        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
              <span>Días Presentes</span>
              <BadgeCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
              {totalEntries.length} días
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Total de marcajes de entrada</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
              <span>Índice de Puntualidad</span>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-emerald-600 font-mono">
              {punctualityScore}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Ingresos a término</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
              <span>Estado de Hoy</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className={`mt-2 text-xl font-extrabold font-mono ${hasClockedInToday ? 'text-emerald-600' : 'text-amber-600'}`}>
              {hasClockedInToday ? 'PRESENTA (OK)' : 'PENDIENTE'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Registro diario de entrada</p>
          </div>
        </div>

      </div>

      {/* Result Confirmation Message Card */}
      {lastResult && (
        <div className={`p-5 rounded-2xl shadow-lg border text-white ${
          lastResult.success ? 'bg-slate-900 border-emerald-500' : 'bg-rose-900 border-rose-700'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {lastResult.success ? <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-6 h-6 text-rose-300 shrink-0" />}
              <div>
                <strong className="text-sm font-bold">{lastResult.message}</strong>
                {lastResult.duration && (
                  <span className="block text-xs text-blue-300 font-mono">Duración registrada: {lastResult.duration}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setLastResult(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* History Table of Entries & Exits */}
      <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden space-y-0">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Mi Historial de Asistencia y Marcas</h3>
            <p className="text-xs text-slate-500">Registros sincronizados con la sede central</p>
          </div>

          <button
            onClick={onRefreshData}
            className="text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl border border-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Actualizar</span>
          </button>
        </div>

        {myRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-medium">No posee registros aún en el sistema.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Fecha & Hora</th>
                  <th className="py-3 px-4">Tipo de Marca</th>
                  <th className="py-3 px-4">Sucursal</th>
                  <th className="py-3 px-4">Duración / Puntualidad</th>
                  <th className="py-3 px-4">Método</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {myRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      <div>{rec.dateStr}</div>
                      <div className="text-xs text-slate-500">{rec.timeStr} hs</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        rec.type === 'entry'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {rec.type === 'entry' ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                        <span>{rec.type === 'entry' ? 'Ingreso' : 'Salida'}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{rec.branch}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{rec.location.address}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {rec.type === 'exit' ? (
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {rec.shiftDurationFormatted || `${rec.shiftDurationHours}h`}
                        </span>
                      ) : (
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.punctualityStatus === 'Puntual'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {rec.punctualityStatus}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {rec.method}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Modal Camera Scanner for Employee Smartphone */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 space-y-4">
            
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Escáner de Cámara — {loggedEmployee.name}</h3>
              </div>
              <button
                onClick={() => setShowScannerModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 text-center space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                Apunte la cámara hacia el código QR de la sucursal para registrar su <strong className="text-emerald-600">ENTRADA DIARIA</strong>.
              </p>

              <div className="relative bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-800 min-h-[260px] flex items-center justify-center shadow-inner">
                <div id={qrRegionId} className="w-full h-full max-w-sm mx-auto min-h-[260px] overflow-hidden" />

                {!isCameraActive && !cameraError && (
                  <div className="p-6 text-slate-400 space-y-3">
                    <Camera className="w-10 h-10 mx-auto text-slate-500 animate-pulse" />
                    <p className="text-xs">Iniciando cámara del teléfono...</p>
                  </div>
                )}

                {cameraError && (
                  <div className="p-6 text-rose-300 space-y-3">
                    <AlertTriangle className="w-8 h-8 mx-auto text-rose-400" />
                    <p className="text-xs font-medium">{cameraError}</p>
                  </div>
                )}

                {isSubmitting && (
                  <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-2 z-20">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-bold">Verificando marca y GPS...</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <button
                  onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
                  className="text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  Girar Cámara ({facingMode === 'environment' ? 'Trasera' : 'Frontal'})
                </button>

                <button
                  onClick={() => setShowScannerModal(false)}
                  className="text-xs text-slate-500 hover:text-slate-900 underline"
                >
                  Cancelar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Badge Modal */}
      {showBadgeModal && (
        <QRBadgeGenerator
          employees={[loggedEmployee]}
          onClose={() => setShowBadgeModal(false)}
        />
      )}

    </div>
  );
};
