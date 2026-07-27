import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { 
  Camera, 
  QrCode, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Keyboard, 
  User, 
  Clock, 
  RefreshCcw, 
  Building2, 
  Shield, 
  LogOut, 
  LogIn, 
  Sparkles, 
  HelpCircle,
  Smartphone,
  Navigation,
  FileBadge
} from 'lucide-react';
import { Employee, AttendanceType, GeoLocationData, AttendanceRecord } from '../types';
import { QRBadgeGenerator } from './QRBadgeGenerator';

interface EmployeeScannerViewProps {
  employees: Employee[];
  selectedBranch: string;
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
}

export const EmployeeScannerView: React.FC<EmployeeScannerViewProps> = ({
  employees,
  selectedBranch,
  onClockIn,
  onClockOut,
}) => {
  const [attendanceType, setAttendanceType] = useState<AttendanceType>('entry');
  const [activeTab, setActiveTab] = useState<'camera' | 'pin'>('camera');
  
  // Camera scanning states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  // PIN & manual code input
  const [manualCode, setManualCode] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('');
  
  // Location & status
  const [userLocation, setUserLocation] = useState<GeoLocationData | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Processing & result modal
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    employee?: Employee;
    record?: AttendanceRecord;
    duration?: string;
  } | null>(null);

  // Show badge generator modal
  const [showBadgeModal, setShowBadgeModal] = useState<boolean>(false);

  // Live time ticker
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const qrRegionId = 'html5qr-code-full-region';
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Live clock interval
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Request GPS Location on mount or branch change
  const fetchLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocalización no soportada por el navegador');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          address: selectedBranch !== 'Todas' ? selectedBranch : 'Sucursal Verificada por GPS',
        });
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation warning:', err);
        setLocationError('No se pudo acceder a la ubicación exacta. Se registrará la sucursal asignada.');
        setIsLocating(false);
        // Fallback default coordinates (Buenos Aires Central)
        setUserLocation({
          latitude: -34.6037,
          longitude: -58.3816,
          accuracy: 25,
          address: selectedBranch !== 'Todas' ? selectedBranch : 'Sucursal Central CAMBIOS de aire',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchLocation();
  }, [selectedBranch]);

  // Handle Camera Scanning start/stop
  const startCameraScanner = async () => {
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
          Html5QrcodeSupportedFormats.EAN_13,
        ],
        verbose: false,
      });
      html5QrcodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: facingMode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Code detected!
          handleQrCodeScanned(decodedText);
        },
        () => {
          // Frame decode error - ignored for clean UX
        }
      );
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera startup error:', err);
      setCameraError('No se pudo acceder a la cámara. Asegúrese de conceder permisos o utilice la opción de PIN.');
      setIsCameraActive(false);
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping QR scanner:', e);
      }
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (activeTab === 'camera') {
      startCameraScanner();
    } else {
      stopCameraScanner();
    }

    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    };
  }, [activeTab, facingMode]);

  // Handle QR code decoded
  const handleQrCodeScanned = async (qrData: string) => {
    if (isSubmitting) return;

    // Pause scanner temporarily
    stopCameraScanner();

    // Parse QR string (e.g., "CAMBIO-101|Carlos Benitez" or plain "CAMBIO-101")
    const codePart = qrData.split('|')[0].trim();

    processAttendance(codePart, 'QR Cámara');
  };

  // Process Attendance submit
  const processAttendance = async (codeOrPin: string, method: 'QR Cámara' | 'Código PIN' | 'Manual Admin') => {
    setIsSubmitting(true);
    setLastResult(null);

    const locData = userLocation || {
      latitude: -34.6037,
      longitude: -58.3816,
      accuracy: 15,
      address: selectedBranch !== 'Todas' ? selectedBranch : 'Sucursal Central',
    };

    try {
      if (attendanceType === 'entry') {
        const res = await onClockIn({
          employeeCodeOrId: codeOrPin,
          branch: selectedBranch !== 'Todas' ? selectedBranch : undefined,
          location: locData,
          method,
          notes: manualNotes.trim() || undefined,
        });

        setLastResult({
          success: true,
          message: res.message,
          employee: res.employee,
          record: res.record,
        });

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#059669', '#34d399', '#f59e0b'],
        });
      } else {
        const res = await onClockOut({
          employeeCodeOrId: codeOrPin,
          branch: selectedBranch !== 'Todas' ? selectedBranch : undefined,
          location: locData,
          method,
          notes: manualNotes.trim() || undefined,
        });

        setLastResult({
          success: true,
          message: res.message,
          employee: res.employee,
          record: res.record,
          duration: res.shiftDurationFormatted,
        });

        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#60a5fa', '#10b981'],
        });
      }

      setManualCode('');
      setManualNotes('');
    } catch (err: any) {
      setLastResult({
        success: false,
        message: err?.message || 'Ocurrió un error al procesar el registro.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processAttendance(manualCode.trim(), 'Código PIN');
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Banner Card with Realtime Clock & Geolocation */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-xl border border-slate-700/80 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Building2 className="w-64 h-64 text-emerald-400" />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase">
              <Smartphone className="w-4 h-4" />
              Terminal de Asistencia Empleados
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              Registro de Ingreso y Salida
            </h2>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Sucursal Activa: <strong className="text-emerald-300 font-semibold">{selectedBranch}</strong></span>
            </p>
          </div>

          {/* Realtime Clock Badge */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 text-right shrink-0 w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" /> Hora Oficial
            </div>
            <div className="text-2xl font-mono font-bold text-emerald-400 tracking-wider">
              {currentTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[11px] text-slate-300 capitalize">
              {currentTime.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}
            </div>
          </div>
        </div>

        {/* GPS Geolocation Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
          <div className="flex items-center gap-2">
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
            {isLocating ? (
              <span className="text-amber-300">Obteniendo coordenadas GPS...</span>
            ) : userLocation ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Ubicación GPS: <strong className="text-white">{userLocation.address || 'Verificada'}</strong> (±{userLocation.accuracy}m)</span>
              </span>
            ) : (
              <span className="text-slate-400">Ubicación por defecto sucursal</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLocation}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCcw className="w-3 h-3" /> Re-verificar GPS
            </button>
            <button
              onClick={() => setShowBadgeModal(true)}
              className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-emerald-500/40 flex items-center gap-1 cursor-pointer"
            >
              <FileBadge className="w-3.5 h-3.5" /> Mi Credencial QR
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Mode Selector: INGRESO vs SALIDA */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200 grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            setAttendanceType('entry');
            setLastResult(null);
          }}
          className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base transition-all cursor-pointer ${
            attendanceType === 'entry'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/20 ring-2 ring-emerald-500'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <LogIn className="w-5 h-5" />
          <span>REGISTRAR INGRESO (Entrada)</span>
        </button>

        <button
          onClick={() => {
            setAttendanceType('exit');
            setLastResult(null);
          }}
          className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base transition-all cursor-pointer ${
            attendanceType === 'exit'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-700/20 ring-2 ring-blue-500'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <LogOut className="w-5 h-5" />
          <span>REGISTRAR SALIDA (Egreso)</span>
        </button>
      </div>

      {/* Main Scanner Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Scanner Tab Switcher: Camera vs PIN */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-3 px-4 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'camera'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Escáner de Cámara Celular</span>
          </button>

          <button
            onClick={() => setActiveTab('pin')}
            className={`flex-1 py-3 px-4 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'pin'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>Teclado PIN / Código de Empleado</span>
          </button>
        </div>

        {/* Tab 1: Camera QR Scanner */}
        {activeTab === 'camera' && (
          <div className="p-6 space-y-4 text-center">
            <div className="max-w-md mx-auto space-y-3">
              
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  Apunte la cámara al código QR de su credencial
                </span>
                
                {isCameraActive && (
                  <button
                    onClick={toggleCameraFacing}
                    className="text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCcw className="w-3 h-3 text-slate-500" />
                    Cambiar Cámara ({facingMode === 'environment' ? 'Trasera' : 'Frontal'})
                  </button>
                )}
              </div>

              {/* Camera Scanner Viewport */}
              <div className="relative bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-800 min-h-[280px] flex items-center justify-center shadow-inner">
                
                <div id={qrRegionId} className="w-full h-full max-w-sm mx-auto min-h-[280px] overflow-hidden" />

                {!isCameraActive && !cameraError && (
                  <div className="p-6 text-slate-400 space-y-3">
                    <Camera className="w-12 h-12 mx-auto text-slate-500 animate-pulse" />
                    <p className="text-xs">Iniciando cámara del celular para lectura en tiempo real...</p>
                    <button
                      onClick={startCameraScanner}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition"
                    >
                      Activar Cámara
                    </button>
                  </div>
                )}

                {cameraError && (
                  <div className="p-6 text-rose-300 space-y-3 max-w-xs mx-auto">
                    <AlertTriangle className="w-10 h-10 mx-auto text-rose-400" />
                    <p className="text-xs font-medium">{cameraError}</p>
                    <button
                      onClick={() => setActiveTab('pin')}
                      className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-slate-700 cursor-pointer"
                    >
                      Usar Teclado PIN
                    </button>
                  </div>
                )}

                {/* Submitting Loading Overlay */}
                {isSubmitting && (
                  <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-3 z-20">
                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold tracking-wide">Sincronizando con base central...</p>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                Los datos de la cámara se procesan localmente sin guardar grabaciones
              </p>

            </div>
          </div>
        )}

        {/* Tab 2: PIN / Manual Code Input */}
        {activeTab === 'pin' && (
          <div className="p-6 max-w-md mx-auto space-y-4">
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ingrese Código de Empleado o PIN de 4 Dígitos
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Ej. CAMBIO-101 o PIN 1001"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-base font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Notas u Observaciones (Opcional)
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Ej. Tráfico, comisión externa, permiso especial..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Quick employee buttons for instant test */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-2">
                  Selección rápida de prueba:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {employees.slice(0, 4).map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setManualCode(emp.code)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-left text-xs transition border border-slate-200 flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{emp.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{emp.code}</div>
                      </div>
                      <span className="text-[10px] bg-slate-200 text-slate-700 font-mono px-1.5 py-0.5 rounded">
                        PIN {emp.pin}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!manualCode.trim() || isSubmitting}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                  attendanceType === 'entry' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Confirmar {attendanceType === 'entry' ? 'Ingreso' : 'Salida'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Confirmation Feedback Modal Card */}
      {lastResult && (
        <div className={`p-6 rounded-2xl shadow-xl border transition-all ${
          lastResult.success 
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-emerald-500/50' 
            : 'bg-rose-900 text-white border-rose-700'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full shrink-0 ${
              lastResult.success ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30' : 'bg-rose-500/20 text-rose-300'
            }`}>
              {lastResult.success ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                  lastResult.success ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {lastResult.success ? 'Registro Confirmado' : 'Error de Registro'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date().toLocaleTimeString('es-AR')}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white">
                {lastResult.message}
              </h3>

              {lastResult.employee && lastResult.record && (
                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mt-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Empleado</span>
                    <strong className="text-white text-sm">{lastResult.employee.name}</strong>
                    <span className="text-slate-400 block font-mono text-[11px]">{lastResult.employee.code} ({lastResult.employee.role})</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Estado de Puntualidad</span>
                    <span className={`inline-block px-2 py-0.5 rounded font-semibold mt-0.5 ${
                      lastResult.record.punctualityStatus === 'Puntual'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {lastResult.record.punctualityStatus}
                      {lastResult.record.latenessMinutes > 0 && ` (+${lastResult.record.latenessMinutes} min)`}
                    </span>
                  </div>

                  {lastResult.duration && (
                    <div className="sm:col-span-2 bg-blue-950/50 p-2.5 rounded-lg border border-blue-800/50 flex items-center justify-between">
                      <span className="text-blue-200 font-medium">Duración Total de la Jornada:</span>
                      <strong className="text-blue-300 text-sm font-mono">{lastResult.duration}</strong>
                    </div>
                  )}

                  <div className="sm:col-span-2 text-slate-300 text-[11px] flex items-center gap-1.5 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sincronizado en tiempo real con servidor central - {lastResult.record.location.address}</span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => {
                    setLastResult(null);
                    if (activeTab === 'camera') startCameraScanner();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition shadow-sm"
                >
                  Registrar Otro Marcaje
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Badge Generator Modal */}
      {showBadgeModal && (
        <QRBadgeGenerator
          employees={employees}
          onClose={() => setShowBadgeModal(false)}
        />
      )}

    </div>
  );
};
