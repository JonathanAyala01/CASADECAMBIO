import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Building2, 
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  MapPin, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  Users,
  Radio,
  Copy,
  Check
} from 'lucide-react';
import { BranchLocation, AttendanceRecord, Employee } from '../types';

interface BranchTerminalQRViewProps {
  branches: BranchLocation[];
  selectedBranch: string;
  onBranchChange: (branchName: string) => void;
  attendanceRecords: AttendanceRecord[];
  employees: Employee[];
}

export const BranchTerminalQRView: React.FC<BranchTerminalQRViewProps> = ({
  branches,
  selectedBranch,
  onBranchChange,
  attendanceRecords,
  employees,
}) => {
  const [mode, setMode] = useState<'entry' | 'exit' | 'dual'>('entry');
  const [qrToken, setQrToken] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const currentBranchObj = branches.find((b) => b.name === selectedBranch) || branches[0] || {
    name: 'Sucursal Central - Microcentro',
    address: 'Av. Corrientes 500, CABA',
    latitude: -34.6037,
    longitude: -58.3816,
  };

  // Update clock & dynamic QR token
  useEffect(() => {
    const updateQR = () => {
      const now = new Date();
      setCurrentTime(now);
      const timestamp = Math.floor(now.getTime() / 10000); // changes every 10 seconds
      const token = `CAMBIOS|BRANCH|${currentBranchObj.name}|MODE:${mode.toUpperCase()}|TS:${timestamp}`;
      setQrToken(token);
    };

    updateQR();
    const interval = setInterval(updateQR, 1000);
    return () => clearInterval(interval);
  }, [currentBranchObj.name, mode]);

  // Recent scans for this branch today
  const todayStr = new Date().toISOString().split('T')[0];
  const recentBranchScans = attendanceRecords
    .filter((r) => r.dateStr === todayStr && (selectedBranch === 'Todas' || r.branch === selectedBranch))
    .slice(0, 6);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrToken)}&color=0f172a&bgcolor=ffffff`;

  const handleCopyToken = () => {
    navigator.clipboard.writeText(qrToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 text-slate-900 rounded-2xl p-6 shadow-md border border-slate-400 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <img
            src="/loguito.png"
            alt="Logo Inmobiliaria CAMBIOS de aire"
            className="h-14 sm:h-16 w-auto object-contain shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-black uppercase tracking-wider">
              <Radio className="w-4 h-4 animate-pulse text-emerald-800" />
              Tótem Terminal Admin de Sucursal — Registro de Entrada Diaria
            </div>
            <h2 className="text-2xl font-black text-slate-900 mt-1">
              Pantalla de Marcaje de Entrada Diaria
            </h2>
            <p className="text-xs text-slate-700 mt-1 font-medium">
              Los empleados deben escanear este código QR usando la cámara de la <strong className="text-emerald-900 font-bold">App Empleado</strong> para registrar su entrada diaria.
            </p>
          </div>
        </div>

        {/* Branch Selector & Clock */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] text-slate-700 uppercase font-extrabold mb-1">Seleccionar Sucursal:</label>
            <select
              value={selectedBranch}
              onChange={(e) => onBranchChange(e.target.value)}
              className="bg-slate-100 text-slate-900 border border-slate-400 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none w-full shadow-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-100 border border-slate-400 rounded-xl p-2.5 text-center shrink-0 min-w-[140px] shadow-sm">
            <span className="text-[10px] text-slate-700 uppercase block font-extrabold">Hora de Sucursal</span>
            <span className="font-mono text-lg font-black text-emerald-900">
              {currentTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Display: QR Scanner Box + Live Branch Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Big QR Terminal Display (8 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-md border border-slate-200 space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                {currentBranchObj.name}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                {currentBranchObj.address}
              </p>
            </div>

            {/* Mode Indicator */}
            <div className="flex bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-800 items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Modo Exclusivo: Ingreso Diario</span>
            </div>
          </div>

          {/* Central QR Frame Container */}
          <div className="bg-slate-900 rounded-3xl p-8 text-center text-white space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700 text-[11px] text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>TOKEN VIVO (Refresco 10s)</span>
            </div>

            <div className="pt-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-500/30 inline-block">
                {mode === 'dual' ? 'ESCANEAR PARA ENTRADA O SALIDA' : mode === 'entry' ? 'ESCANEAR PARA ENTRADA' : 'ESCANEAR PARA SALIDA'}
              </span>
            </div>

            {/* QR Code Graphic Box */}
            <div className="relative mx-auto w-64 h-64 bg-white rounded-2xl p-4 shadow-2xl ring-4 ring-emerald-500/40 flex items-center justify-center">
              <img
                src={qrImageUrl}
                alt="QR Asistencia Sucursal Admin"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-100">
                Abra la App Empleado y presione "Escanear QR"
              </p>
              <p className="text-xs text-slate-400">
                Registra la marca instantáneamente asociando la ubicación GPS de {currentBranchObj.name}.
              </p>
            </div>

            {/* Manual Token Copy bar for testing */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <span className="truncate max-w-[280px]">Token: {qrToken}</span>
              <button
                onClick={handleCopyToken}
                className="text-emerald-400 hover:text-emerald-300 font-sans font-semibold flex items-center gap-1 shrink-0 cursor-pointer ml-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar Token'}</span>
              </button>
            </div>

          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <p>
              <strong>Seguridad Antifraude Activada:</strong> El token QR se regenera dinámicamente y valida las coordenadas geográficas reales del dispositivo móvil antes de guardar la marca.
            </p>
          </div>

        </div>

        {/* Right Column: Live Feed of Recent Clock-ins (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Últimos Marcajes en {selectedBranch === 'Todas' ? 'Sucursales' : selectedBranch}
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                En vivo
              </span>
            </div>

            {recentBranchScans.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Clock className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-medium">Aún no hay marcajes registrados hoy en esta sucursal.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBranchScans.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex items-center justify-between transition"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs text-slate-900 font-bold">{rec.employeeName}</strong>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          rec.type === 'entry' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {rec.type === 'entry' ? 'Ingreso' : 'Salida'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {rec.timeStr} • {rec.branch}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        rec.punctualityStatus === 'Puntual' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {rec.punctualityStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Helper Info */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" /> ¿Cómo usan los empleados la App?
            </h4>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Ingresan a la <strong>App Empleado</strong> e inician sesión con su PIN o código.</li>
              <li>Tocan el botón verde <strong>"Escanear QR de Asistencia"</strong>.</li>
              <li>Apuntan la cámara de su teléfono celular hacia esta pantalla.</li>
              <li>¡El sistema valida su GPS y registra la entrada instantáneamente!</li>
            </ol>
          </div>

        </div>

      </div>

    </div>
  );
};
