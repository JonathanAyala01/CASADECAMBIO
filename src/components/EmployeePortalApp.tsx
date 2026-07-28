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
  Home,
  Sparkles, 
  ChevronRight, 
  Navigation, 
  FileText, 
  BadgeCheck, 
  X,
  History,
  CreditCard,
  Zap,
  TrendingUp,
  Compass,
  ArrowUpRight,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  Lock,
  SmartphoneNfc,
  CheckCircle,
  XCircle,
  AlertCircle
  , Bell
} from 'lucide-react';
import { Employee, AttendanceRecord, GeoLocationData, BranchLocation, PaymentRequest, AppNotification } from '../types';
import { saveEmployee, requestDevicePairing, fetchPaymentRequests, createPaymentRequest, fetchNotifications } from '../services/api';
import { getDeviceDetails } from '../utils/device';

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
    deviceId?: string;
  }) => Promise<{ success: boolean; message: string; record: AttendanceRecord; employee: Employee }>;
  onClockOut: (payload: {
    employeeCodeOrId: string;
    branch?: string;
    location?: GeoLocationData;
    method?: 'QR Cámara' | 'Código PIN' | 'Manual Admin';
    notes?: string;
    deviceId?: string;
  }) => Promise<{ success: boolean; message: string; record: AttendanceRecord; employee: Employee; shiftDurationFormatted: string }>;
  onRefreshData: () => void;
}

export const EmployeePortalApp = ({
  employees,
  attendanceRecords,
  branches,
  onClockIn,
  onClockOut,
  onRefreshData,
}: EmployeePortalAppProps) => {
  // Login State
  const [loggedEmployee, setLoggedEmployee] = useState<Employee | null>(() => {
    return employees.find((e) => e.active) || null;
  });

  const [inputCodeOrPin, setInputCodeOrPin] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Menu Tab for App Navigation
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'badge' | 'profile' | 'payments'>('home');

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

  // Profile Photo Upload State
  const [showAvatarModal, setShowAvatarModal] = useState<boolean>(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState<string>('');
  const [isSavingAvatar, setIsSavingAvatar] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Device Security & Lock State
  const currentDevice = getDeviceDetails();
  const [isRequestingDevice, setIsRequestingDevice] = useState<boolean>(false);
  const [deviceRequestMsg, setDeviceRequestMsg] = useState<string | null>(null);

  // Payment Request States
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(false);
  const [requestType, setRequestType] = useState<'adelanto' | 'comision'>('adelanto');
  const [requestAmount, setRequestAmount] = useState<string>('');
  const [requestReason, setRequestReason] = useState<string>('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState<boolean>(false);
  const [requestSuccessMsg, setRequestSuccessMsg] = useState<string | null>(null);
  const [requestErrorMsg, setRequestErrorMsg] = useState<string | null>(null);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [loadingNotifications, setLoadingNotifications] = useState<boolean>(false);

  const handleRequestDevicePairing = async () => {
    if (!loggedEmployee) return;
    setIsRequestingDevice(true);
    setDeviceRequestMsg(null);
    try {
      await requestDevicePairing({
        employeeId: loggedEmployee.id,
        deviceId: currentDevice.deviceId,
        deviceName: currentDevice.deviceName,
        deviceUserAgent: currentDevice.userAgent,
      });
      setDeviceRequestMsg('¡Solicitud de vinculación enviada! El Administrador debe autorizar este teléfono.');
      onRefreshData();
    } catch (err: any) {
      alert(err?.message || 'Error al enviar solicitud de dispositivo.');
    } finally {
      setIsRequestingDevice(false);
    }
  };

  const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
  ];

  const handleOpenAvatarModal = () => {
    if (loggedEmployee) {
      setNewAvatarUrl(loggedEmployee.avatarUrl || PRESET_AVATARS[0]);
    }
    setAvatarError(null);
    setShowAvatarModal(true);
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (!src) return;

      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setNewAvatarUrl(compressedDataUrl);
          setAvatarError(null);
        } else {
          setNewAvatarUrl(src);
          setAvatarError(null);
        }
      };
      img.onerror = () => {
        setAvatarError('Formato de imagen inválido o no soportado.');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    if (!loggedEmployee || !newAvatarUrl) return;
    setIsSavingAvatar(true);
    setAvatarError(null);
    try {
      const updated = await saveEmployee({
        ...loggedEmployee,
        avatarUrl: newAvatarUrl,
      });
      setLoggedEmployee(updated);
      setShowAvatarModal(false);
      onRefreshData();
    } catch (err: any) {
      setAvatarError(err?.message || 'Error al guardar la foto de perfil');
    } finally {
      setIsSavingAvatar(false);
    }
  };

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

  const loadRequests = async () => {
    if (!loggedEmployee) return;
    setLoadingRequests(true);
    try {
      const reqs = await fetchPaymentRequests(loggedEmployee.id);
      setPaymentRequests(reqs);
    } catch (e) {
      console.error('Error loading payment requests:', e);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadNotifications = async () => {
    if (!loggedEmployee) return;
    setLoadingNotifications(true);
    try {
      setNotifications(await fetchNotifications(loggedEmployee.id));
    } catch (e) {
      console.error('Error loading notifications:', e);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedEmployee) return;
    if (!requestAmount || Number(requestAmount) <= 0) {
      setRequestErrorMsg('Ingrese un monto válido mayor a 0');
      return;
    }
    if (!requestReason.trim()) {
      setRequestErrorMsg('El motivo de la solicitud es obligatorio');
      return;
    }

    setIsSubmittingRequest(true);
    setRequestSuccessMsg(null);
    setRequestErrorMsg(null);

    try {
      await createPaymentRequest({
        employeeId: loggedEmployee.id,
        type: requestType,
        amount: Number(requestAmount),
        reason: requestReason.trim(),
      });
      setRequestSuccessMsg(`Solicitud de ${requestType === 'adelanto' ? 'adelanto' : 'comisión'} creada exitosamente.`);
      setRequestAmount('');
      setRequestReason('');
      loadRequests();
    } catch (err: any) {
      setRequestErrorMsg(err?.message || 'Error al enviar la solicitud de pago.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  useEffect(() => {
    if (loggedEmployee) {
      loadRequests();
      loadNotifications();
    }
  }, [loggedEmployee, activeTab]);

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
      setLoginError('Código o PIN incorrecto. Intente nuevamente o use el selector rápido.');
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
  const isCurrentDeviceAuthorized = loggedEmployee?.deviceStatus === 'authorized' && loggedEmployee.deviceId === currentDevice.deviceId;
  const canScanAttendance = isCurrentDeviceAuthorized && !hasClockedInToday && !lastResult?.success;

  const openAttendanceScanner = () => {
    if (!isCurrentDeviceAuthorized) {
      setLastResult({ success: false, message: 'Este celular no está autorizado para registrar la entrada.' });
      return;
    }

    if (hasClockedInToday || lastResult?.success) {
      setLastResult({ success: false, message: 'La entrada de hoy ya fue registrada. No se permite volver a leer el QR.' });
      return;
    }

    setShowScannerModal(true);
  };

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
    if (showScannerModal && canScanAttendance) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [showScannerModal, facingMode, canScanAttendance]);

  // Handle scanned QR Code (e.g. from Admin Terminal)
  const handleQrScanned = async (data: string) => {
    if (isSubmitting || !loggedEmployee || !isCurrentDeviceAuthorized || hasClockedInToday || lastResult?.success) {
      if (!isCurrentDeviceAuthorized) {
        setLastResult({ success: false, message: 'Este celular no está autorizado para registrar la entrada.' });
      } else if (hasClockedInToday || lastResult?.success) {
        setLastResult({ success: false, message: 'La entrada de hoy ya fue registrada. No se permite volver a leer el QR.' });
      }
      setShowScannerModal(false);
      return;
    }

    stopCamera();
    setIsSubmitting(true);
    setLastResult(null);

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
      const res = await onClockIn({
        employeeCodeOrId: loggedEmployee.code,
        branch: scannedBranch,
        location: gpsLoc,
        method: 'QR Cámara',
        deviceId: currentDevice.deviceId,
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
      <div className="min-h-screen bg-cyber-grid text-[#dae2fd] flex flex-col justify-center items-center px-3 sm:px-4 py-6 sm:py-8 relative overflow-y-auto overflow-x-hidden">
        {/* Background Radial Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#4edea3]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full glass-pane rounded-3xl p-5 sm:p-8 border-t-2 border-[#4edea3]/30 text-center space-y-6 relative z-10">
          <div className="inline-flex flex-col items-center">
            <div className="mx-auto flex max-w-xs items-center justify-center gap-3 text-left">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#4edea3] text-[#003824] shadow-lg shadow-[#4edea3]/20">
                <Building2 className="h-8 w-8" />
              </div>
              <div className="font-black leading-tight">
                <div className="text-sm text-white">Inmobiliaria</div>
                <div className="text-xl tracking-tight text-[#4edea3]">CAMBIOS <span className="text-white">de aire</span></div>
              </div>
            </div>
            <span className="mt-2 bg-[#4edea3] text-[#003824] text-[9px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
              App Empleado
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-black text-white tracking-tight font-headline-md">
              Portal de Empleados
            </h2>
            <p className="text-xs text-[#bbcabf] mt-1 font-medium">
              Inmobiliaria CAMBIOS de aire • Fichaje Móvil QR & GPS
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            {loginError && (
              <div className="p-3 bg.error-container/40 border border-red-500/30 text-red-300 text-xs rounded-2xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono font-bold text-[#bbcabf] uppercase tracking-wider mb-1.5">
                PIN de Acceso o Código
              </label>
              <div className="relative">
                <Key className="w-5 h-5 text-[#4edea3] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inputCodeOrPin}
                  onChange={(e) => setInputCodeOrPin(e.target.value)}
                  placeholder="Ej. PIN 1001 o CAMBIO-101"
                  className="w-full pl-11 pr-4 py-3 bg-[#0b1326]/80 border border-[#4edea3]/20 rounded-2xl font-mono text-base font-bold text-white placeholder-slate-500 focus:ring-2 focus:ring-[#4edea3] focus:border-[#4edea3] focus:outline-none transition shadow-inner"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#4edea3] text-[#003824] font-extrabold text-sm rounded-2xl shadow-lg shadow-[#4edea3]/20 hover:bg-[#6ffbbe] transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 btn-pulse"
            >
              <LogIn className="w-5 h-5" />
              <span>Ingresar a Mi Portal</span>
            </button>
          </form>

          {/* Quick Demo Test Logins */}
          <div className="pt-4 border-t border-white/10 text-left space-y-2">
            <span className="text-[10px] font-mono font-bold text-[#bbcabf] uppercase tracking-wider block">
              Seleccionar perfil de prueba rápido:
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {employees.slice(0, 5).map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setLoggedEmployee(emp)}
                  className="w-full p-2.5 bg-[#171f33]/60 hover:bg-[#222a3d] border border-white/5 hover:border-[#4edea3]/40 rounded-2xl transition text-left flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={emp.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250'}
                      alt={emp.name}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-[#4edea3]/30"
                    />
                    <div>
                      <strong className="text-xs font-bold text-white group-hover:text-[#4edea3] block">{emp.name}</strong>
                      <span className="text-[10px] text-[#bbcabf] font-mono">{emp.role} • PIN {emp.pin}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#bbcabf] group-hover:text-[#4edea3]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Formatting date strings nicely
  const timeFormatted = nowTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateFormatted = nowTime.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // --- VIEW 2: LOGGED-IN MOBILE APP INTERFACE ---
  return (
    <div className="min-h-screen bg-cyber-grid text-[#dae2fd] pb-24 sm:pb-32 pt-2 px-2 sm:px-4 relative overflow-x-hidden font-body-md">
      
      {/* Background Decorative Radial Shapes */}
      <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] bg-[radial-gradient(circle,_rgba(78,222,163,0.08)_0%,_transparent_70%)] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[100px] left-[-100px] w-[400px] h-[400px] bg-[radial-gradient(circle,_rgba(173,198,255,0.06)_0%,_transparent_70%)] rounded-full pointer-events-none z-0" />

      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5 relative z-10">
        
        {/* App Top Header Bar */}
        <header className="glass-pane rounded-2xl p-3 sm:p-4 border-b-2 border-[#4edea3]/30 flex items-center justify-between gap-2 sm:gap-3 shadow-xl">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div
              onClick={handleOpenAvatarModal}
              className="relative cursor-pointer group shrink-0"
              title="Haz clic para cambiar foto de perfil"
            >
              <img
                src={loggedEmployee.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250'}
                alt={loggedEmployee.name}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-[#4edea3]/40 p-0.5 transition group-hover:scale-105"
              />
              <span className="absolute -bottom-0.5 -right-0.5 bg-[#0b1326] text-[#4edea3] p-1 rounded-full border border-[#4edea3]/40 shadow flex items-center justify-center">
                <Camera className="w-2.5 h-2.5" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-white font-extrabold text-sm tracking-tight">CAMBIOS<span className="text-[#4edea3]"> de aire</span></span>
                <span className="hidden min-[380px]:inline-block bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20 px-2 py-0.5 rounded text-[9px] font-mono font-bold shrink-0">
                  {loggedEmployee.code}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#bbcabf] font-medium mt-0.5 truncate max-w-[180px] sm:max-w-none">
                {loggedEmployee.name} • <span className="text-white font-bold">{loggedEmployee.branch}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowNotifications(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-[#131b2e] text-[#bbcabf] transition hover:bg-[#222a3d] hover:text-[#4edea3] cursor-pointer"
            title="Notificaciones"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#4edea3] px-1 text-[9px] font-black text-[#003824]">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[#bbcabf] hover:text-[#4edea3] bg-[#131b2e] hover:bg-[#222a3d] px-2 sm:px-3 py-2 rounded-xl border border-white/5 transition active:scale-95 text-xs font-mono font-bold cursor-pointer shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4 text-[#4edea3]" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </header>

        {showNotifications && (
          <div className="fixed inset-0 z-[80] flex items-start justify-end bg-[#060e20]/60 p-3 pt-20 backdrop-blur-sm" onClick={() => setShowNotifications(false)}>
            <section className="glass-pane w-full max-w-sm overflow-hidden rounded-3xl border border-[#4edea3]/20 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-white/10 bg-[#131b2e] p-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-[#4edea3]" />
                  <h2 className="font-bold text-white">Notificaciones</h2>
                </div>
                <button onClick={() => setShowNotifications(false)} className="rounded-lg p-1 text-[#bbcabf] hover:text-white cursor-pointer" title="Cerrar">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
                {loadingNotifications ? (
                  <div className="py-8 text-center text-xs text-[#bbcabf]">Cargando notificaciones...</div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#bbcabf]">
                    <Bell className="mx-auto mb-2 h-8 w-8 text-[#bbcabf]/40" />
                    No tienes notificaciones nuevas.
                  </div>
                ) : notifications.map((notification) => (
                  <article key={notification.id} className={`rounded-2xl border p-3 ${
                    notification.type === 'urgent' ? 'border-rose-400/30 bg-rose-500/10' :
                    notification.type === 'warning' ? 'border-amber-400/30 bg-amber-500/10' :
                    notification.type === 'success' ? 'border-[#4edea3]/30 bg-[#4edea3]/10' : 'border-white/10 bg-[#131b2e]'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-bold text-white">{notification.title}</h3>
                      <span className="shrink-0 text-[9px] font-mono text-[#bbcabf]">{new Date(notification.createdAt).toLocaleDateString('es-AR')}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#bbcabf]">{notification.message}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Header Profile & Live Clock Card */}
        <section className="glass-pane rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-5 border-t-2 border-[#4edea3]/20">
          <div className="flex justify-between items-start flex-wrap gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider">
                  PIN {loggedEmployee.pin}
                </span>
                <span className="text-[#bbcabf]/70 font-mono text-[10px] uppercase tracking-widest">
                  {loggedEmployee.role}
                </span>
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-white leading-tight font-headline-md break-words">
                {loggedEmployee.name}
              </h1>
              <div className="flex items-center gap-1.5 text-[#bbcabf] text-xs">
                <Building2 className="w-4 h-4 text-[#4edea3]" />
                <span>Sucursal {loggedEmployee.branch}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <button
                onClick={fetchGps}
                className="flex items-center gap-1.5 text-[#4edea3] bg-[#4edea3]/10 px-3 py-1 rounded-full border border-[#4edea3]/20 text-[10px] font-mono font-bold hover:bg-[#4edea3]/20 transition cursor-pointer"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-amber-400' : ''}`} />
                <span>{isLocating ? 'LOCATING...' : userLocation ? 'GPS VERIFICADO' : 'VERIFICAR GPS'}</span>
              </button>
            </div>
          </div>

          {/* Digital Clock Section */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
            <div className="flex flex-col">
              <span className="text-3xl sm:text-4xl text-[#4edea3] neon-text-glow font-mono font-black tracking-tighter">
                {timeFormatted}
              </span>
              <span className="text-[#bbcabf]/70 font-mono text-xs mt-1 capitalize">
                {dateFormatted}
              </span>
            </div>

            <div className="text-right">
              <div className="text-[#bbcabf]/50 font-mono text-[10px] uppercase tracking-widest mb-0.5">JORNADA ESPERADA</div>
              <div className="text-white font-mono font-bold text-lg">
                {loggedEmployee.expectedStartTime} <span className="text-[#4edea3]/60 text-xs">HS</span>
              </div>
            </div>
          </div>
        </section>

        {/* --- TAB CONTENT 1: FICHAR / INICIO --- */}
        {activeTab === 'home' && (
          <div className="space-y-5">
            
            {/* Device Security & Single-Phone Lock Card */}
            {(() => {
              const isAuthorizedDevice = loggedEmployee.deviceStatus === 'authorized' && loggedEmployee.deviceId === currentDevice.deviceId;
              const isPendingDevice = loggedEmployee.deviceStatus === 'pending' || loggedEmployee.devicePendingId === currentDevice.deviceId;
              const isDeviceMismatch = loggedEmployee.deviceStatus === 'authorized' && loggedEmployee.deviceId !== currentDevice.deviceId;

              if (isAuthorizedDevice) {
                return (
                  <div className="glass-pane p-4 rounded-2xl border-l-4 border-l-[#4edea3] flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-[#4edea3]/10 rounded-2xl text-[#4edea3] border border-[#4edea3]/20 shrink-0">
                        <ShieldCheck className="w-5 h-5 text-[#4edea3]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-white">
                          <span>Teléfono Vinculado y Autorizado</span>
                          <span className="bg-[#4edea3]/20 text-[#4edea3] text-[9px] font-mono px-2 py-0.5 rounded-full border border-[#4edea3]/30">
                            1 por Empleado
                          </span>
                        </div>
                        <p className="text-[11px] text-[#bbcabf] font-mono mt-0.5">
                          {loggedEmployee.deviceName} • Candado Anti-Fraude Activo
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              if (isPendingDevice) {
                return (
                  <div className="glass-pane p-4 rounded-2xl border-l-4 border-l-amber-400 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/20 shrink-0">
                          <AlertCircle className="w-5 h-5 text-amber-400 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-white text-xs">Solicitud de Celular Pendiente</h4>
                          <p className="text-[11px] text-[#bbcabf] mt-0.5">
                            Solicitaste vincular: <strong className="font-mono text-white">{loggedEmployee.devicePendingName || currentDevice.deviceName}</strong>.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={onRefreshData}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono font-bold text-[10px] rounded-xl transition cursor-pointer border border-amber-500/30 shrink-0"
                      >
                        Actualizar
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-300 font-medium bg-[#0b1326]/60 p-2 rounded-xl border border-amber-500/20">
                      El Administrador debe aprobar este teléfono antes de que puedas fichar tu entrada.
                    </p>
                  </div>
                );
              }

              if (isDeviceMismatch) {
                return (
                  <div className="glass-pane p-4.5 rounded-2xl border-l-4 border-l-red-500 space-y-3 text-xs">
                    <div className="flex items-start space-x-3">
                      <div className="p-2.5 bg-red-500/10 rounded-2xl text-red-400 border border-red-500/20 shrink-0">
                        <Lock className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-white text-xs flex items-center gap-1.5">
                          <span>Dispositivo No Autorizado</span>
                          <span className="bg-red-500/20 text-red-300 text-[9px] px-2 py-0.5 rounded-full border border-red-500/30 font-mono">
                            Bloqueado
                          </span>
                        </h4>
                        <p className="text-[11px] text-[#bbcabf] mt-1 leading-snug">
                          Solo puedes fichar desde tu celular asignado (<strong className="text-white font-mono">{loggedEmployee.deviceName}</strong>).
                          Estás conectado desde: <span className="font-mono text-amber-300">{currentDevice.deviceName}</span>.
                        </p>
                      </div>
                    </div>

                    {deviceRequestMsg ? (
                      <div className="p-2.5 bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3] rounded-2xl text-[11px] font-mono font-bold text-center">
                        {deviceRequestMsg}
                      </div>
                    ) : (
                      <button
                        onClick={handleRequestDevicePairing}
                        disabled={isRequestingDevice}
                        className="w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 font-mono font-bold text-xs rounded-2xl shadow border border-red-500/30 transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <SmartphoneNfc className="w-4 h-4 text-red-300" />
                        <span>{isRequestingDevice ? 'Enviando...' : 'Solicitar Autorización para este Celular al Admin'}</span>
                      </button>
                    )}
                  </div>
                );
              }

              // Unregistered device
              return (
                <div className="glass-pane p-4 rounded-2xl border-l-4 border-l-[#4edea3] space-y-3 text-xs">
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 bg-[#4edea3]/10 rounded-2xl text-[#4edea3] border border-[#4edea3]/20 shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-xs">Vincular Celular Personal (Seguridad 1 Teléfono)</h4>
                      <p className="text-[11px] text-[#bbcabf] mt-0.5">
                        Para prevenir el traspaso de claves entre empleados, debes registrar este teléfono (<strong className="text-white font-mono">{currentDevice.deviceName}</strong>).
                      </p>
                    </div>
                  </div>

                  {deviceRequestMsg ? (
                    <div className="p-2.5 bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3] rounded-2xl text-[11px] font-mono font-bold text-center">
                      {deviceRequestMsg}
                    </div>
                  ) : (
                    <button
                      onClick={handleRequestDevicePairing}
                      disabled={isRequestingDevice}
                      className="w-full py-2.5 bg-[#4edea3] text-[#003824] font-extrabold text-xs rounded-2xl shadow transition cursor-pointer flex items-center justify-center gap-2 hover:bg-[#6ffbbe]"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isRequestingDevice ? 'Enviando...' : 'Vincular y Solicitar Autorización a Admin'}</span>
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Main Status Hero Card */}
            <section className="glass-pane rounded-3xl p-6 overflow-hidden border-r-2 border-r-[#4edea3]/30 relative space-y-5">
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[#bbcabf]/50 font-mono text-[10px] uppercase tracking-[0.2em]">LIVE STATUS</span>
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-3 w-3">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${hasClockedInToday ? 'bg-[#4edea3]' : 'bg-amber-400'} opacity-75`} />
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${hasClockedInToday ? 'bg-[#4edea3]' : 'bg-amber-400'}`} />
                    </div>
                    <h2 className="font-headline-sm text-xl text-white font-extrabold uppercase tracking-tight">
                      {hasClockedInToday ? 'Entrada Registrada' : 'Pendiente de Marcaje'}
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/10">
                  <div className="space-y-1">
                    <span className="text-[#bbcabf]/40 font-mono text-[10px] uppercase tracking-wider block">HORA FICHAJE</span>
                    <p className="font-mono text-white text-lg font-bold">
                      {todayEntryRecord ? todayEntryRecord.timeStr : '--:--:--'} <span className="text-xs text-[#bbcabf]">HS</span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[#bbcabf]/40 font-mono text-[10px] uppercase tracking-wider block">ESTADO / INCIDENCIA</span>
                    {todayEntryRecord ? (
                      <p className={`font-mono font-bold text-sm flex items-center gap-1 ${
                        todayEntryRecord.punctualityStatus === 'Puntual' ? 'text-[#4edea3]' : 'text-amber-400'
                      }`}>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{todayEntryRecord.punctualityStatus}</span>
                      </p>
                    ) : (
                      <p className="text-amber-400 font-mono font-bold text-xs flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Sin Fichar Hoy</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button: Trigger Camera Scanner */}
              <button
                onClick={openAttendanceScanner}
                disabled={!canScanAttendance}
                className="w-full bg-[#4edea3] text-[#003824] font-extrabold px-6 py-4 rounded-2xl flex items-center justify-between group btn-pulse transition-all overflow-hidden relative cursor-pointer active:scale-95 shadow-xl shadow-[#4edea3]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <div className="flex items-center gap-3 relative z-10">
                  <Camera className="w-8 h-8 shrink-0 text-[#003824]" />
                  <div className="text-left">
                    <span className="block text-[10px] font-mono opacity-80 mb-0.5">SCANNER AUTENTICADO</span>
                    <span className="font-headline-sm text-base uppercase tracking-tight">
                      {!isCurrentDeviceAuthorized ? 'Celular no autorizado' : hasClockedInToday ? 'Entrada ya registrada' : 'Escanear QR de Entrada'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 opacity-60 group-hover:translate-x-1 transition-transform" />
              </button>
            </section>

            {/* Quick Action Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                onClick={openAttendanceScanner}
                className={`glass-pane p-5 rounded-2xl flex flex-col justify-between group transition border border-white/5 ${canScanAttendance ? 'cursor-pointer hover:bg-[#222a3d]/50' : 'cursor-not-allowed opacity-60'}`}
              >
                <div className="w-12 h-12 rounded-xl bg-[#4edea3]/10 border border-[#4edea3]/20 flex items-center justify-center text-[#4edea3] mb-4 group-hover:border-[#4edea3]/40 group-hover:bg-[#4edea3]/20 transition-all">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-headline-sm text-base text-white mb-1 group-hover:text-[#4edea3] transition-colors font-bold">Escanear QR</h3>
                  <p className="text-[#bbcabf]/70 text-xs font-light">Cámara para fichar en puntos de control certificados.</p>
                </div>
              </div>

              <div
                onClick={() => setActiveTab('history')}
                className="glass-pane p-5 rounded-2xl flex flex-col justify-between group cursor-pointer hover:bg-[#222a3d]/50 transition border border-white/5"
              >
                <div className="w-12 h-12 rounded-xl bg-[#adc6ff]/10 border border-[#adc6ff]/20 flex items-center justify-center text-[#adc6ff] mb-4 group-hover:border-[#adc6ff]/40 group-hover:bg-[#adc6ff]/20 transition-all">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-headline-sm text-base text-white mb-1 group-hover:text-[#adc6ff] transition-colors font-bold">Mis Marcas</h3>
                  <p className="text-[#bbcabf]/70 text-xs font-light">Historial diario con horarios, GPS y puntajes.</p>
                </div>
              </div>

              <div
                onClick={() => setActiveTab('profile')}
                className="glass-pane p-5 rounded-2xl flex flex-col justify-between group cursor-pointer hover:bg-[#222a3d]/50 transition border border-white/5"
              >
                <div className="w-12 h-12 rounded-xl bg-[#d0bcff]/10 border border-[#d0bcff]/20 flex items-center justify-center text-[#d0bcff] mb-4 group-hover:border-[#d0bcff]/40 group-hover:bg-[#d0bcff]/20 transition-all">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-headline-sm text-base text-white mb-1 group-hover:text-[#d0bcff] transition-colors font-bold">Mi Ficha</h3>
                  <p className="text-[#bbcabf]/70 text-xs font-light">Datos de legajo, PIN y foto de perfil corporativa.</p>
                </div>
              </div>
            </section>

            {/* Quick Stats Banner */}
            <section className="grid grid-cols-3 gap-3">
              <div className="glass-pane p-4 rounded-2xl text-center space-y-1">
                <span className="text-[10px] font-mono font-bold text-[#bbcabf]/60 uppercase block">Asistencias</span>
                <div className="text-lg font-black text-white font-mono">{totalEntries.length} Días</div>
              </div>

              <div className="glass-pane p-4 rounded-2xl text-center space-y-1">
                <span className="text-[10px] font-mono font-bold text-[#bbcabf]/60 uppercase block">Puntualidad</span>
                <div className="text-lg font-black text-[#4edea3] font-mono">{punctualityScore}%</div>
              </div>

              <div className="glass-pane p-4 rounded-2xl text-center space-y-1">
                <span className="text-[10px] font-mono font-bold text-[#bbcabf]/60 uppercase block">Turno</span>
                <div className="text-lg font-black text-white font-mono">{loggedEmployee.expectedStartTime} HS</div>
              </div>
            </section>

          </div>
        )}

        {/* --- TAB CONTENT 2: HISTORIAL --- */}
        {activeTab === 'history' && (
          <div className="glass-pane rounded-3xl p-5 space-y-4 border border-white/10">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-headline-sm text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-[#4edea3]" />
                  <span>Historial de Marcajes</span>
                </h3>
                <p className="text-xs text-[#bbcabf]">Registros en tiempo real sincronizados con la sucursal</p>
              </div>

              <button
                onClick={onRefreshData}
                className="text-xs text-[#4edea3] bg-[#4edea3]/10 hover:bg-[#4edea3]/20 px-3 py-1.5 rounded-xl border border-[#4edea3]/20 flex items-center gap-1.5 font-mono cursor-pointer transition"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
            </div>

            {myRecords.length === 0 ? (
              <div className="p-8 text-center text-[#bbcabf]/60 space-y-2">
                <Calendar className="w-8 h-8 mx-auto text-[#bbcabf]/30" />
                <p className="text-xs font-medium">No posee registros aún en el sistema.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {myRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 bg-[#131b2e]/70 hover:bg-[#222a3d]/80 rounded-2xl border border-white/5 transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        rec.type === 'entry' ? 'bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20' : 'bg-[#adc6ff]/10 text-[#adc6ff] border border-[#adc6ff]/20'
                      }`}>
                        {rec.type === 'entry' ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">
                          {rec.type === 'entry' ? 'Ingreso Registrado' : 'Salida Registrada'}
                        </div>
                        <div className="text-[11px] text-[#bbcabf] font-mono mt-0.5">
                          {rec.dateStr} a las {rec.timeStr} hs
                        </div>
                        <div className="text-[10px] text-[#bbcabf]/70 mt-0.5 flex items-center gap-1 font-mono">
                          <MapPin className="w-3 h-3 text-[#4edea3] shrink-0" />
                          <span>{rec.branch}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {rec.type === 'exit' ? (
                        <span className="font-mono font-bold text-white bg-[#222a3d] px-2.5 py-0.5 rounded-lg border border-white/10 text-[11px]">
                          {rec.shiftDurationFormatted || `${rec.shiftDurationHours}h`}
                        </span>
                      ) : (
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          rec.punctualityStatus === 'Puntual'
                            ? 'bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {rec.punctualityStatus}
                        </span>
                      )}
                      <div className="text-[10px] text-[#bbcabf]/60 font-mono mt-1">{rec.method}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        

        {/* --- TAB CONTENT: ADELANTOS Y COMISIONES --- */}
        {activeTab === 'payments' && (
          <div className="space-y-5">
            <section className="flex flex-col gap-2 px-1">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#4edea3]">Dashboard / Solicitudes</span>
                  <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Solicitar Adelanto</h2>
                </div>
                <div className="shrink-0 rounded-xl border border-white/5 bg-[#222a3d] px-3 py-1.5 text-right">
                  <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#bbcabf]">Jornada esperada</p>
                  <p className="text-lg font-bold text-[#4edea3]">{loggedEmployee.expectedStartTime} <span className="text-[10px] font-normal text-[#bbcabf]">HS</span></p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-[#bbcabf]">
                <span>{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span className="flex items-center gap-1 rounded-full border border-[#4edea3]/20 bg-[#4edea3]/10 px-2.5 py-1 text-[9px] font-mono font-bold uppercase text-[#4edea3]"><MapPin className="h-3.5 w-3.5" /> GPS verificado</span>
              </div>
            </section>
            {/* Solicitar Adelanto/Comisión Card */}
            <section className="glass-pane rounded-3xl p-4 sm:p-6 border border-white/10 space-y-5 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#4edea3]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#4edea3]/10 flex items-center justify-center border border-[#4edea3]/20 shrink-0">
                  <CreditCard className="w-6 h-6 text-[#4edea3]" />
                </div>
                <div className="min-w-0">
                <h3 className="font-headline-sm text-base sm:text-lg font-bold text-white break-words">
                  <span>Solicitar Adelanto o Comisión</span>
                </h3>
                <p className="text-xs text-[#bbcabf]">Envíe una solicitud de adelanto de sueldo o cobro de comisión al Administrador</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[#4edea3] bg-[#4edea3]/10 border border-[#4edea3]/20 rounded-xl px-3 py-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Solicitud segura y vinculada a su legajo</span>
              </div>

              {requestSuccessMsg && (
                <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs rounded-2xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{requestSuccessMsg}</span>
                </div>
              )}

              {requestErrorMsg && (
                <div className="p-3.5 bg-red-500/20 border border-red-500/30 text-red-300 text-xs rounded-2xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{requestErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs relative">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-[#bbcabf] uppercase tracking-wider mb-1.5">
                      Tipo de Solicitud
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bbcabf] pointer-events-none" />
                    <select
                      value={requestType}
                      onChange={(e) => setRequestType(e.target.value as 'adelanto' | 'comision')}
                      className="w-full p-3 pl-10 bg-[#0b1326]/80 border border-white/10 rounded-xl text-white font-bold focus:ring-2 focus:ring-[#4edea3] focus:outline-none"
                    >
                      <option value="adelanto">Adelanto de Sueldo</option>
                      <option value="comision">Cobro de Comisión</option>
                    </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-bold text-[#bbcabf] uppercase tracking-wider mb-1.5">
                      Monto (ARS)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#bbcabf] font-mono font-bold">$</span>
                    <input
                      type="number"
                      value={requestAmount}
                      onChange={(e) => setRequestAmount(e.target.value)}
                      placeholder="Ej. 25000"
                      min="1"
                      className="w-full p-3 pl-9 bg-[#0b1326]/80 border border-white/10 rounded-xl text-white font-mono font-bold focus:ring-2 focus:ring-[#4edea3] focus:outline-none"
                      required
                    />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-[#bbcabf] uppercase tracking-wider mb-1.5">
                    Motivo / Detalle de la Solicitud
                  </label>
                  <textarea
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="Escriba el detalle o motivo (ej: reserva departamento, urgencia médica, etc.)"
                    rows={3}
                    className="w-full p-3 bg-[#0b1326]/80 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#4edea3] focus:outline-none resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="w-full py-4 bg-gradient-to-r from-[#4edea3] to-emerald-500 text-[#003824] font-extrabold text-sm rounded-full shadow-lg shadow-[#4edea3]/20 transition flex items-center justify-center gap-2 hover:shadow-[#4edea3]/40 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingRequest ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#003824] border-t-transparent rounded-full animate-spin" />
                      <span>Enviando Solicitud...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Enviar Solicitud al Administrador</span>
                    </>
                  )}
                </button>
              </form>
            </section>

            {/* Listado de Solicitudes Realizadas */}
            <section className="glass-pane rounded-3xl p-4 sm:p-6 border border-white/10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h4 className="font-headline-sm text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-[#4edea3]" />
                  <span>Historial de Solicitudes</span>
                </h4>
                <button
                  onClick={loadRequests}
                  className="text-[11px] text-[#4edea3] hover:text-[#6ffbbe] flex items-center gap-1 font-mono transition cursor-pointer"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  <span>Actualizar</span>
                </button>
              </div>

              {loadingRequests ? (
                <div className="py-8 text-center text-[#bbcabf] font-mono text-xs">
                  <div className="w-6 h-6 border-2 border-[#4edea3] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Cargando solicitudes...
                </div>
              ) : paymentRequests.length === 0 ? (
                <div className="py-8 text-center text-[#bbcabf]/60 space-y-2">
                  <CreditCard className="w-8 h-8 mx-auto text-[#bbcabf]/30" />
                  <p className="text-xs">No posee solicitudes registradas.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                  {paymentRequests.map((req) => (
                    <div
                      key={req.id}
                      className={`p-4 bg-[#131b2e]/80 rounded-2xl border border-white/5 border-l-4 space-y-3 text-xs ${
                        req.status === 'approved' ? 'border-l-[#4edea3]' : req.status === 'rejected' ? 'border-l-rose-400' : 'border-l-[#d0bcff]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2.5 py-1 rounded-full font-mono font-bold text-[10px] uppercase border ${
                            req.type === 'adelanto' ? 'bg-[#d0bcff]/20 text-[#d0bcff]' : 'bg-[#adc6ff]/20 text-[#adc6ff]'
                          }`}>
                            {req.type === 'adelanto' ? 'Adelanto' : 'Comisión'}
                          </span>
                          <span className="text-white font-mono font-black text-sm">
                            ${req.amount.toLocaleString('es-AR')}
                          </span>
                        </div>

                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border ${
                          req.status === 'approved'
                            ? 'bg-[#4edea3]/20 text-[#4edea3]'
                            : req.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {req.status === 'approved' ? 'Aprobado' : req.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                        </span>
                      </div>

                      <div className="text-slate-300 text-[11px] space-y-1">
                        <strong className="text-[#bbcabf]/60 block text-[10px] uppercase tracking-wider">Motivo</strong>
                        {req.reason}
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 text-[10px] text-[#bbcabf]/60 font-mono">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{new Date(req.requestedAt).toLocaleString('es-AR')}</span>
                        <span className={req.status === 'approved' ? 'text-[#4edea3]' : 'text-[#bbcabf]'}>{req.status === 'approved' ? 'Acreditado' : req.status === 'pending' ? 'En revisión' : 'No aprobado'}</span>
                      </div>

                      {(req.notes || req.receiptUrl) && (
                        <div className="pt-2 border-t border-white/5 space-y-2">
                          {req.notes && (
                            <div className="bg-[#0b1326]/60 p-2.5 rounded-xl border border-white/5 text-[11px] text-[#bbcabf]">
                              <strong className="text-[#4edea3] block mb-0.5">Respuesta de Administración:</strong>
                              {req.notes}
                            </div>
                          )}

                          {req.receiptUrl && req.status === 'approved' && (
                            <button
                              onClick={() => setSelectedReceiptUrl(req.receiptUrl || null)}
                              className="px-3.5 py-1.5 bg-[#4edea3]/10 hover:bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/20 rounded-xl transition flex items-center gap-1.5 font-mono font-extrabold text-[10px] cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Ver Comprobante de Pago</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* --- TAB CONTENT 3: MI PERFIL / CONFIG --- */}
        {activeTab === 'profile' && (
          <div className="glass-pane rounded-3xl p-6 space-y-5 border border-white/10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div className="flex items-center space-x-4">
                <div
                  onClick={handleOpenAvatarModal}
                  className="relative cursor-pointer group shrink-0"
                  title="Haz clic para cambiar tu foto de perfil"
                >
                  <img
                    src={loggedEmployee.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250'}
                    alt={loggedEmployee.name}
                    className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[#4edea3] shadow-lg transition group-hover:opacity-90"
                  />
                  <div className="absolute inset-0 bg-[#0b1326]/60 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[#4edea3]">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 bg-[#4edea3] text-[#003824] p-1.5 rounded-xl shadow-md flex items-center justify-center">
                    <Camera className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white font-headline-md">{loggedEmployee.name}</h3>
                  <p className="text-xs text-[#bbcabf] font-medium">{loggedEmployee.role}</p>
                  <span className="inline-block mt-1.5 bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                    Sede: {loggedEmployee.branch}
                  </span>
                </div>
              </div>

              <button
                onClick={handleOpenAvatarModal}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#4edea3]/10 hover:bg-[#4edea3]/20 border border-[#4edea3]/30 text-[#4edea3] font-mono font-extrabold text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow active:scale-95"
              >
                <Upload className="w-4 h-4 text-[#4edea3]" />
                <span>Cambiar Foto</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-[#131b2e] rounded-2xl border border-white/5">
                <span className="text-[#bbcabf] font-medium">Código de Empleado:</span>
                <span className="font-mono font-bold text-white text-sm">{loggedEmployee.code}</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[#131b2e] rounded-2xl border border-white/5">
                <span className="text-[#bbcabf] font-medium">PIN Personal de Fichaje:</span>
                <span className="font-mono font-bold text-[#4edea3] bg-[#4edea3]/10 px-2.5 py-1 rounded border border-[#4edea3]/20 text-sm">
                  {loggedEmployee.pin}
                </span>
              </div>

              {loggedEmployee.dni && (
                <div className="flex items-center justify-between p-3.5 bg-[#131b2e] rounded-2xl border border-white/5">
                  <span className="text-[#bbcabf] font-medium">Documento (DNI):</span>
                  <span className="font-mono text-white">{loggedEmployee.dni}</span>
                </div>
              )}

              {loggedEmployee.birthDate && (
                <div className="flex items-center justify-between p-3.5 bg-[#131b2e] rounded-2xl border border-white/5">
                  <span className="text-[#bbcabf] font-medium">Fecha de Nacimiento:</span>
                  <span className="font-mono text-white">{loggedEmployee.birthDate}</span>
                </div>
              )}

              {loggedEmployee.profession && (
                <div className="flex items-center justify-between p-3.5 bg-[#131b2e] rounded-2xl border border-white/5">
                  <span className="text-[#bbcabf] font-medium">Profesión:</span>
                  <span className="text-white font-bold">{loggedEmployee.profession}</span>
                </div>
              )}

              {loggedEmployee.residence && (
                <div className="flex items-center justify-between p-3.5 bg-[#131b2e] rounded-2xl border border-white/5">
                  <span className="text-[#bbcabf] font-medium">Lugar de Residencia:</span>
                  <span className="text-white text-right shrink">{loggedEmployee.residence}</span>
                </div>
              )}

              {loggedEmployee.hireDate && (
                <div className="flex items-center justify-between p-3.5 bg-[#131b2e] rounded-2xl border border-white/5">
                  <span className="text-[#bbcabf] font-medium">Fecha de Ingreso:</span>
                  <span className="font-mono text-white">{loggedEmployee.hireDate}</span>
                </div>
              )}

              {loggedEmployee.paymentFrequency && (
                <div className="flex items-center justify-between p-3.5 bg-[#131b2e] rounded-2xl border border-white/5">
                  <span className="text-[#bbcabf] font-medium">Frecuencia de Cobro:</span>
                  <span className="text-[#4edea3] font-bold">{loggedEmployee.paymentFrequency}</span>
                </div>
              )}

              <div className="flex items-center justify-between p-3.5 bg-[#131b2e] rounded-2xl border border-white/5">
                <span className="text-[#bbcabf] font-medium">Horario de Ingreso Previsto:</span>
                <span className="font-mono font-bold text-white">{loggedEmployee.expectedStartTime} hs</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[#131b2e] rounded-2xl border border-white/5">
                <span className="text-[#bbcabf] font-medium">Email Corporativo:</span>
                <span className="font-mono text-[#bbcabf]">{loggedEmployee.email}</span>
              </div>

              {/* Device Lock Info in Profile */}
              <div className="p-4 bg-[#0b1326] text-white rounded-2xl border border-[#4edea3]/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#4edea3]" />
                    <span>Teléfono Asociado (Dispositivo Único):</span>
                  </span>
                  {loggedEmployee.deviceStatus === 'authorized' ? (
                    <span className="bg-[#4edea3]/20 text-[#4edea3] text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-[#4edea3]/30">
                      Autorizado
                    </span>
                  ) : loggedEmployee.deviceStatus === 'pending' ? (
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      Pendiente Admin
                    </span>
                  ) : (
                    <span className="bg-[#222a3d] text-[#bbcabf] text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-white/10">
                      Sin Vincular
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[#bbcabf] font-mono text-[11px]">
                  <span>Modelo Registrado:</span>
                  <span className="font-bold text-white">{loggedEmployee.deviceName || 'Ninguno'}</span>
                </div>

                <div className="flex items-center justify-between text-[#bbcabf]/70 font-mono text-[10px]">
                  <span>Este Dispositivo Actual:</span>
                  <span className="text-[#4edea3]">{currentDevice.deviceName}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Result Feedback Banner */}
        {lastResult && (
          <div className={`p-4 rounded-2xl shadow-xl border text-white ${
            lastResult.success ? 'glass-pane border-[#4edea3] bg-[#0b1326]/90' : 'bg-red-950/90 border-red-500/40'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {lastResult.success ? <CheckCircle2 className="w-6 h-6 text-[#4edea3] shrink-0" /> : <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />}
                <div>
                  <strong className="text-xs font-bold block">{lastResult.message}</strong>
                  {lastResult.duration && (
                    <span className="text-[10px] text-[#adc6ff] font-mono">Duración: {lastResult.duration}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setLastResult(null)}
                className="text-xs text-[#bbcabf] hover:text-white underline cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Modal Camera Scanner for Employee Smartphone */}
        {showScannerModal && (
          <div className="fixed inset-0 bg-[#060e20]/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
            <div className="glass-pane rounded-3xl shadow-2xl max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto border border-[#4edea3]/30 space-y-4">
              
              <div className="bg-[#131b2e] text-white p-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <Camera className="w-5 h-5 text-[#4edea3]" />
                  <h3 className="font-extrabold text-sm font-headline-md">Escáner de Cámara — {loggedEmployee.name}</h3>
                </div>
                <button
                  onClick={() => setShowScannerModal(false)}
                  className="text-[#bbcabf] hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 text-center space-y-4">
                <p className="text-xs text-[#bbcabf] font-medium">
                  Apunte la cámara hacia el código QR de la sucursal para registrar su <strong className="text-[#4edea3] font-mono">ENTRADA DIARIA</strong>.
                </p>

                <div className="relative bg-[#0b1326] rounded-2xl overflow-hidden border-2 border-[#4edea3]/30 min-h-[260px] flex items-center justify-center shadow-inner">
                  <div id={qrRegionId} className="w-full h-full max-w-sm mx-auto min-h-[260px] overflow-hidden" />

                  {!isCameraActive && !cameraError && (
                    <div className="p-6 text-[#bbcabf] space-y-3">
                      <Camera className="w-10 h-10 mx-auto text-[#4edea3] animate-pulse" />
                      <p className="text-xs font-mono font-medium">Iniciando cámara del teléfono...</p>
                    </div>
                  )}

                  {cameraError && (
                    <div className="p-6 text-red-300 space-y-3">
                      <AlertTriangle className="w-8 h-8 mx-auto text-red-400" />
                      <p className="text-xs font-medium">{cameraError}</p>
                    </div>
                  )}

                  {isSubmitting && (
                    <div className="absolute inset-0 bg-[#060e20]/90 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-2 z-20">
                      <div className="w-8 h-8 border-4 border-[#4edea3] border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-bold font-mono">Verificando marca y GPS...</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-[#bbcabf]">
                  <button
                    onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
                    className="text-xs text-[#4edea3] bg-[#4edea3]/10 hover:bg-[#4edea3]/20 px-3 py-1.5 rounded-xl border border-[#4edea3]/20 flex items-center gap-1.5 cursor-pointer font-mono font-bold"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    Girar Cámara ({facingMode === 'environment' ? 'Trasera' : 'Frontal'})
                  </button>

                  <button
                    onClick={() => setShowScannerModal(false)}
                    className="text-xs text-[#bbcabf] hover:text-white underline cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Floating Glass Bottom Navigation Bar */}
        <nav className="fixed bottom-2 sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] sm:w-[480px] rounded-[2rem] z-[70] glass-pane !bg-[#171f33]/80 !border-white/10 py-1.5 sm:py-2">
          <div className="flex justify-around items-center h-14 sm:h-16 px-0.5 sm:px-2">
            {/* Fichar (Active / Inactive) */}
            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center gap-0.5 sm:gap-1.5 rounded-full py-2 px-1 sm:px-3 transition-all cursor-pointer ${
                activeTab === 'home'
                  ? 'text-[#003824] bg-[#4edea3] font-bold shadow-lg shadow-[#4edea3]/20'
                  : 'text-[#bbcabf]/70 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="hidden min-[380px]:inline text-[11px] font-mono font-bold">Inicio</span>
            </button>

            {/* Marcas (Inactive / Active) */}
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-0.5 sm:gap-1.5 rounded-full py-2 px-1 sm:px-3 transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'text-[#003824] bg-[#4edea3] font-bold shadow-lg shadow-[#4edea3]/20'
                  : 'text-[#bbcabf]/70 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span className="hidden min-[380px]:inline text-[11px] font-mono font-bold">Marcas</span>
            </button>

            {/* Quick Camera FAB */}
            <button
              onClick={openAttendanceScanner}
              disabled={!canScanAttendance}
              className="bg-[#4edea3] text-[#003824] p-2.5 sm:p-3 rounded-full shadow-lg shadow-[#4edea3]/30 border-2 border-[#0b1326] transition transform hover:scale-110 active:scale-95 cursor-pointer btn-pulse shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              title="Escanear QR"
            >
              <Camera className="w-5.5 h-5.5" />
            </button>

            {/* Pagos (Inactive / Active) */}
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-0.5 sm:gap-1.5 rounded-full py-2 px-1 sm:px-3 transition-all cursor-pointer ${
                activeTab === 'payments'
                  ? 'text-[#003824] bg-[#4edea3] font-bold shadow-lg shadow-[#4edea3]/20'
                  : 'text-[#bbcabf]/70 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span className="hidden min-[380px]:inline text-[11px] font-mono font-bold">Adelantos</span>
            </button>

            {/* Perfil (Inactive / Active) */}
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-0.5 sm:gap-1.5 rounded-full py-2 px-1 sm:px-3 transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'text-[#003824] bg-[#4edea3] font-bold shadow-lg shadow-[#4edea3]/20'
                  : 'text-[#bbcabf]/70 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span className="hidden min-[380px]:inline text-[11px] font-mono font-bold">Perfil</span>
            </button>
          </div>
        </nav>

        {/* Avatar Change Modal */}
        {showAvatarModal && (
          <div className="fixed inset-0 bg-[#060e20]/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
            <div className="glass-pane rounded-3xl shadow-2xl max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto border border-[#4edea3]/30 space-y-4">
              
              <div className="bg-[#131b2e] text-white p-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <Camera className="w-5 h-5 text-[#4edea3]" />
                  <h3 className="font-extrabold text-sm font-headline-md">Actualizar Foto de Perfil</h3>
                </div>
                <button
                  onClick={() => setShowAvatarModal(false)}
                  className="text-[#bbcabf] hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Preview Current / Selected Avatar */}
                <div className="text-center space-y-2">
                  <div className="relative inline-block">
                    <img
                      src={newAvatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250'}
                      alt="Vista previa de perfil"
                      className="w-28 h-28 rounded-3xl object-cover ring-4 ring-[#4edea3] shadow-xl mx-auto"
                    />
                    <span className="absolute bottom-1 right-1 bg-[#4edea3] text-[#003824] p-1.5 rounded-full border-2 border-[#0b1326] shadow">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <p className="text-xs text-[#bbcabf] font-medium">
                    Seleccione una foto desde su celular o elija una plantilla
                  </p>
                </div>

                {avatarError && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 text-xs rounded-2xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{avatarError}</span>
                  </div>
                )}

                {/* Option 1: Upload from File / Camera on Mobile */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono font-bold text-[#bbcabf] uppercase tracking-wider">
                    Subir Foto de Archivo o Galería
                  </label>
                  <label className="w-full py-3.5 px-4 bg-[#131b2e] hover:bg-[#222a3d] border border-[#4edea3]/30 text-white font-mono font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95">
                    <Upload className="w-4 h-4 text-[#4edea3]" />
                    <span>Seleccionar Imagen o Tomar Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Option 2: Enter URL manually */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold text-[#bbcabf] uppercase tracking-wider">
                    O ingresar enlace URL de foto
                  </label>
                  <div className="relative">
                    <ImageIcon className="w-4 h-4 text-[#bbcabf]/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={newAvatarUrl.startsWith('data:') ? '' : newAvatarUrl}
                      onChange={(e) => setNewAvatarUrl(e.target.value)}
                      placeholder="https://ejemplo.com/mi-foto.jpg"
                      className="w-full pl-10 pr-3 py-2.5 bg-[#0b1326] border border-white/10 rounded-2xl text-xs font-mono text-white placeholder-slate-500 focus:ring-2 focus:ring-[#4edea3] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Option 3: Presets */}
                <div className="space-y-2 pt-1 border-t border-white/10">
                  <span className="text-[10px] font-mono font-bold text-[#bbcabf]/60 uppercase tracking-wider block">
                    Avatares Sugeridos:
                  </span>
                  <div className="flex items-center justify-center gap-2.5">
                    {PRESET_AVATARS.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewAvatarUrl(url)}
                        className={`relative rounded-2xl overflow-hidden border-2 transition transform hover:scale-105 cursor-pointer ${
                          newAvatarUrl === url ? 'border-[#4edea3] ring-2 ring-[#4edea3]/50 scale-105' : 'border-white/10 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Avatar ${idx + 1}`} className="w-11 h-11 object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAvatarModal(false)}
                    className="px-4 py-2.5 bg-[#131b2e] hover:bg-[#222a3d] text-[#bbcabf] font-mono font-bold text-xs rounded-2xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAvatar}
                    disabled={isSavingAvatar || !newAvatarUrl}
                    className="px-6 py-2.5 bg-[#4edea3] text-[#003824] font-mono font-extrabold text-xs rounded-2xl shadow-lg hover:bg-[#6ffbbe] transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingAvatar ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#003824] border-t-transparent rounded-full animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Guardar Foto</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Receipt Viewer Modal */}
        {selectedReceiptUrl && (
          <div className="fixed inset-0 bg-[#060e20]/95 backdrop-blur-xl z-[80] flex items-center justify-center p-4">
            <div className="glass-pane rounded-3xl shadow-2xl max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto border border-[#4edea3]/30 space-y-4">
              
              <div className="bg-[#131b2e] text-white p-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-[#4edea3]" />
                  <h3 className="font-extrabold text-sm font-headline-md">Comprobante de Pago</h3>
                </div>
                <button
                  onClick={() => setSelectedReceiptUrl(null)}
                  className="text-[#bbcabf] hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 text-center space-y-4">
                <div className="relative bg-[#0b1326] rounded-2xl overflow-hidden border border-white/10 min-h-[300px] flex items-center justify-center shadow-inner">
                  {selectedReceiptUrl.startsWith('data:application/pdf') || selectedReceiptUrl.toLowerCase().endsWith('.pdf') ? (
                    <div className="p-6 text-white space-y-3">
                      <FileText className="w-12 h-12 mx-auto text-[#4edea3]" />
                      <p className="text-xs font-mono font-medium">Documento PDF</p>
                      <a
                        href={selectedReceiptUrl}
                        download="comprobante.pdf"
                        className="inline-block px-4 py-2 bg-[#4edea3] text-[#003824] font-bold text-xs rounded-xl"
                      >
                        Descargar PDF
                      </a>
                    </div>
                  ) : (
                    <img
                      src={selectedReceiptUrl}
                      alt="Comprobante de Pago"
                      className="max-w-full max-h-[400px] object-contain rounded-xl mx-auto"
                    />
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setSelectedReceiptUrl(null)}
                    className="px-6 py-2.5 bg-[#4edea3] text-[#003824] font-mono font-extrabold text-xs rounded-2xl shadow-lg hover:bg-[#6ffbbe] transition cursor-pointer"
                  >
                    Cerrar Vista
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
