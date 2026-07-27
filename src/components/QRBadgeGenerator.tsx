import React, { useState } from 'react';
import { QrCode, X, Printer, Download, User, Building2, ShieldCheck, CreditCard } from 'lucide-react';
import { Employee } from '../types';

interface QRBadgeGeneratorProps {
  employees: Employee[];
  onClose: () => void;
}

export const QRBadgeGenerator: React.FC<QRBadgeGeneratorProps> = ({ employees, onClose }) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');

  const employee = employees.find((e) => e.id === selectedEmpId) || employees[0];

  const handlePrint = () => {
    window.print();
  };

  // Generate SVG QR Code visualization
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    employee ? employee.code : 'CAMBIO-101'
  )}`;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden space-y-0">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Credencial Digital QR de Empleado</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {/* Employee Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Seleccionar Empleado:
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.code} - {emp.role})
                </option>
              ))}
            </select>
          </div>

          {/* Printable Badge Card Preview */}
          {employee && (
            <div className="bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 text-slate-900 rounded-2xl p-6 shadow-md border border-slate-300 relative overflow-hidden space-y-4 print:shadow-none print:border-slate-900 print:text-slate-900 print:bg-white">
              
              {/* Badge Top Header */}
              <div className="flex items-center justify-between border-b border-slate-300 pb-3">
                <div className="flex items-center space-x-2">
                  <img
                    src="/loguito.png"
                    alt="Logo Inmobiliaria CAMBIOS de aire"
                    className="h-10 w-auto object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <span className="font-black text-xs tracking-tight block text-slate-900">
                      CAMBIOS de aire
                    </span>
                    <span className="text-[9px] text-emerald-900 uppercase tracking-widest font-mono font-bold block">
                      Inmobiliaria & Finanzas
                    </span>
                  </div>
                </div>

                <span className="bg-emerald-800/15 text-emerald-950 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-700/30 font-bold">
                  {employee.code}
                </span>
              </div>

              {/* Employee Photo & Data */}
              <div className="flex items-center space-x-4">
                <img
                  src={employee.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                  alt={employee.name}
                  className="w-16 h-16 rounded-xl object-cover ring-2 ring-emerald-500/50 shadow-md"
                />

                <div>
                  <h4 className="font-bold text-lg text-white leading-snug">{employee.name}</h4>
                  <p className="text-xs text-emerald-400 font-medium">{employee.role}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{employee.branch}</p>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-4 rounded-xl flex flex-col items-center justify-center space-y-2 shadow-inner border border-slate-200 text-slate-900">
                <img
                  src={qrSvgUrl}
                  alt={`QR Badge ${employee.code}`}
                  className="w-40 h-40 object-contain"
                />
                <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">
                  {employee.code} • PIN: {employee.pin}
                </span>
              </div>

              <div className="text-[10px] text-center text-slate-400 flex items-center justify-center gap-1 pt-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Presente este código frente a la cámara para marcar ingreso/salida
              </div>

            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handlePrint}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Imprimir Credencial</span>
            </button>

            <button
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 px-4 rounded-xl transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
