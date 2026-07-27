import React, { useState } from 'react';
import { 
  UserPlus, 
  Users, 
  CreditCard, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Building2, 
  Clock, 
  Phone, 
  Mail, 
  Keyboard,
  QrCode
} from 'lucide-react';
import { Employee, EmployeeRole, ShiftType, BranchLocation } from '../types';
import { saveEmployee } from '../services/api';
import { QRBadgeGenerator } from './QRBadgeGenerator';

interface EmployeeManagementProps {
  employees: Employee[];
  branches: BranchLocation[];
  onRefresh: () => void;
}

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  employees,
  branches,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedBadgeEmp, setSelectedBadgeEmp] = useState<Employee | null>(null);

  // Form fields
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<EmployeeRole>('Cajero / Operador');
  const [branch, setBranch] = useState<string>(branches[0]?.name || 'Sucursal Central - Microcentro');
  const [shift, setShift] = useState<ShiftType>('Mañana (08:30 - 16:30)');
  const [expectedStart, setExpectedStart] = useState<string>('08:30');
  const [expectedEnd, setExpectedEnd] = useState<string>('16:30');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [pin, setPin] = useState<string>('1234');

  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setRole('Cajero / Operador');
    setBranch(branches[0]?.name || 'Sucursal Central - Microcentro');
    setShift('Mañana (08:30 - 16:30)');
    setExpectedStart('08:30');
    setExpectedEnd('16:30');
    setEmail('');
    setPhone('');
    setPin(String(Math.floor(1000 + Math.random() * 9000)));
    setErrorMsg(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingEmployee(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setRole(emp.role);
    setBranch(emp.branch);
    setShift(emp.shift);
    setExpectedStart(emp.expectedStartTime);
    setExpectedEnd(emp.expectedEndTime);
    setEmail(emp.email);
    setPhone(emp.phone);
    setPin(emp.pin);
    setErrorMsg(null);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('El nombre del empleado es obligatorio');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      await saveEmployee({
        id: editingEmployee ? editingEmployee.id : undefined,
        name: name.trim(),
        role,
        branch,
        shift,
        expectedStartTime: expectedStart,
        expectedEndTime: expectedEnd,
        email: email.trim(),
        phone: phone.trim(),
        pin,
      });

      setShowAddModal(false);
      resetForm();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar el empleado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Personal y Empleados</h3>
          <p className="text-xs text-slate-500">Gestione el nómina de la casa de cambios e inmobiliaria</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Agregar Nuevo Empleado</span>
        </button>
      </div>

      {/* Employees Grid / Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-semibold uppercase tracking-wider border-b border-slate-800">
                <th className="py-3 px-4">Empleado / Código</th>
                <th className="py-3 px-4">Cargo / Rol</th>
                <th className="py-3 px-4">Sucursal Asignada</th>
                <th className="py-3 px-4">Horario Esperado</th>
                <th className="py-3 px-4">PIN Acceso</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={emp.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250'}
                        alt={emp.name}
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                      />
                      <div>
                        <strong className="text-slate-900 font-bold block">{emp.name}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">{emp.code}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    {emp.role}
                  </td>

                  <td className="py-3.5 px-4 text-slate-600">
                    {emp.branch}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                    {emp.expectedStartTime} - {emp.expectedEndTime}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="bg-slate-100 text-slate-800 font-mono text-[11px] px-2 py-0.5 rounded border border-slate-200">
                      PIN {emp.pin}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => setSelectedBadgeEmp(emp)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-2 rounded-lg border border-emerald-200 transition cursor-pointer"
                      title="Ver Credencial QR"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOpenEdit(emp)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg border border-slate-200 transition cursor-pointer"
                      title="Editar Empleado"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-8">
            
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-sm">
                {editingEmployee ? 'Editar Ficha de Empleado' : 'Registrar Nuevo Empleado'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Juan Manuel Pérez"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cargo / Puesto</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as EmployeeRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Cajero / Operador">Cajero / Operador</option>
                    <option value="Asesor Inmobiliario">Asesor Inmobiliario</option>
                    <option value="Supervisor de Caja">Supervisor de Caja</option>
                    <option value="Gerente de Sucursal">Gerente de Sucursal</option>
                    <option value="Atención al Cliente">Atención al Cliente</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sucursal Asignada</label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hora Entrada Esperada</label>
                  <input
                    type="time"
                    value={expectedStart}
                    onChange={(e) => setExpectedStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hora Salida Esperada</label>
                  <input
                    type="time"
                    value={expectedEnd}
                    onChange={(e) => setExpectedEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PIN Acceso Rápido (4 dígitos)</label>
                  <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={6}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+54 9 11 0000-0000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition cursor-pointer"
                >
                  {saving ? 'Guardando...' : 'Guardar Empleado'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Individual QR Badge Modal */}
      {selectedBadgeEmp && (
        <QRBadgeGenerator
          employees={[selectedBadgeEmp]}
          onClose={() => setSelectedBadgeEmp(null)}
        />
      )}

    </div>
  );
};
