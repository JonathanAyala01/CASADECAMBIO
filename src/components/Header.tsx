import React from 'react';
import { Building2, ShieldCheck, QrCode, RefreshCw, Clock, MapPin, Users, Award, Smartphone, Monitor } from 'lucide-react';
import { BranchLocation } from '../types';

interface HeaderProps {
  currentView: 'portal' | 'terminal' | 'admin';
  onNavigate: (view: 'portal' | 'terminal' | 'admin') => void;
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  branches: BranchLocation[];
  isSyncing: boolean;
  onManualSync: () => void;
  lastSyncedTime: string;
  activeEmployeesCount: number;
  presentTodayCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  selectedBranch,
  setSelectedBranch,
  branches,
  isSyncing,
  onManualSync,
  lastSyncedTime,
  activeEmployeesCount,
  presentTodayCount,
}) => {
  return (
    <header className="bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 text-slate-900 shadow-md border-b border-slate-400/80 sticky top-0 z-40">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-3 border-b border-slate-400/60">
          
          {/* Logo & Brand Title */}
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-800 text-white shadow-md sm:h-14 sm:w-14" aria-hidden="true">
              <Building2 className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg tracking-tight text-slate-900 font-sans">
                  Inmobiliaria <span className="text-emerald-800 uppercase tracking-wider font-black">CAMBIOS</span> de aire
                </h1>
                <span className="bg-emerald-800/15 text-emerald-950 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-emerald-700/30">
                  Control & Asistencia
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-800" />
                Sistema Centralizado de Control de Personal y Jornada Laboral
              </p>
            </div>
          </div>

          {/* Sync status & Branch selector */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Branch Selector */}
            <div className="flex items-center bg-slate-100/90 rounded-lg px-2.5 py-1.5 border border-slate-400/80 shadow-sm">
              <MapPin className="w-4 h-4 text-emerald-800 mr-2 shrink-0" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-transparent text-xs text-slate-900 font-bold focus:outline-none cursor-pointer pr-1"
              >
                <option value="Todas" className="bg-white text-slate-900">Todas las Sucursales</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.name} className="bg-white text-slate-900">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sync Indicator */}
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              title="Sincronizar datos en tiempo real con servidor central"
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-white text-xs text-slate-800 font-bold px-2.5 py-1.5 rounded-lg border border-slate-400 shadow-sm transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-800 ${isSyncing ? 'animate-spin text-emerald-700' : ''}`} />
              <span className="hidden sm:inline">Sincronizado:</span>
              <span className="text-emerald-900 font-mono text-[11px] font-bold">{lastSyncedTime}</span>
            </button>
          </div>
        </div>

        {/* View Switch Navigation Tabs */}
        <div className="flex items-center justify-between py-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center space-x-2">
            <a
              href="/empleado"
              onClick={(event) => { event.preventDefault(); onNavigate('portal'); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                currentView === 'portal'
                  ? 'bg-emerald-700 text-white shadow-md ring-1 ring-emerald-600 font-bold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>App Empleado</span>
              <span className="bg-emerald-900/20 text-[10px] px-1.5 py-0.5 rounded font-bold text-emerald-950 ml-1">
                Login & Cámara
              </span>
            </a>

            <a
              href="/terminal"
              onClick={(event) => { event.preventDefault(); onNavigate('terminal'); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                currentView === 'terminal'
                  ? 'bg-emerald-800 text-white shadow-md ring-1 ring-emerald-700 font-bold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Monitor className="w-4 h-4 text-emerald-800" />
              <span>Tótem QR Admin</span>
              <span className="bg-emerald-800/20 text-emerald-950 text-[10px] px-1.5 py-0.5 rounded font-bold ml-1">
                Pantalla Sucursal
              </span>
            </a>

            <a
              href="/admin"
              onClick={(event) => { event.preventDefault(); onNavigate('admin'); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-slate-800 text-white shadow-md ring-1 ring-slate-700 font-bold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-800" />
              <span>Panel Administrador</span>
              <span className="bg-emerald-800/20 text-emerald-950 text-[10px] px-1.5 py-0.5 rounded font-bold ml-1">
                Gestión
              </span>
            </a>
          </div>

          {/* Quick Stats Pill */}
          <div className="hidden lg:flex items-center gap-4 text-xs text-slate-800 bg-slate-100/90 px-3 py-1.5 rounded-lg border border-slate-400/80 shadow-sm">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-700" />
              <span>Personal: <strong className="text-slate-900">{activeEmployeesCount}</strong></span>
            </div>
            <div className="h-3 w-px bg-slate-400" />
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-800" />
              <span>Presentes hoy: <strong className="text-emerald-900 font-bold">{presentTodayCount}</strong></span>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};
