import { Employee, AttendanceRecord, BranchLocation, WeeklyReportSummary, PaymentRequest } from '../types';

export const fetchBranches = async (): Promise<BranchLocation[]> => {
  try {
    const res = await fetch('/api/branches');
    if (!res.ok) throw new Error('Error al cargar sucursales');
    return await res.json();
  } catch (e) {
    console.warn('Usando respaldo local para sucursales:', e);
    return [];
  }
};

export const saveBranch = async (branchData: Partial<BranchLocation>): Promise<BranchLocation> => {
  const res = await fetch('/api/branches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(branchData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error al guardar sucursal');
  }
  const data = await res.json();
  return data.branch;
};

export const deleteBranch = async (id: string): Promise<boolean> => {
  const res = await fetch(`/api/branches/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error al eliminar sucursal');
  }
  return true;
};

export const fetchEmployees = async (): Promise<Employee[]> => {
  try {
    const res = await fetch('/api/employees');
    if (!res.ok) throw new Error('Error al cargar empleados');
    return await res.json();
  } catch (e) {
    console.warn('Usando respaldo local para empleados:', e);
    return [];
  }
};

export const saveEmployee = async (employeeData: Partial<Employee>): Promise<Employee> => {
  const res = await fetch('/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(employeeData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error al guardar empleado');
  }
  const data = await res.json();
  return data.employee;
};

export const fetchAttendanceRecords = async (branch?: string, date?: string): Promise<AttendanceRecord[]> => {
  try {
    const params = new URLSearchParams();
    if (branch && branch !== 'Todas') params.append('branch', branch);
    if (date) params.append('date', date);

    const res = await fetch(`/api/attendance?${params.toString()}`);
    if (!res.ok) throw new Error('Error al obtener registros de asistencia');
    return await res.json();
  } catch (e) {
    console.warn('Usando respaldo local para asistencia:', e);
    return [];
  }
};

export const recordClockIn = async (payload: {
  employeeCodeOrId: string;
  branch?: string;
  location?: { latitude: number; longitude: number; accuracy: number; address?: string };
  method?: 'QR Cámara' | 'Código PIN' | 'Manual Admin';
  notes?: string;
  deviceId?: string;
}): Promise<{ success: boolean; message: string; record: AttendanceRecord; employee: Employee }> => {
  const res = await fetch('/api/attendance/clock-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al registrar ingreso');
  }
  return data;
};

export const recordClockOut = async (payload: {
  employeeCodeOrId: string;
  branch?: string;
  location?: { latitude: number; longitude: number; accuracy: number; address?: string };
  method?: 'QR Cámara' | 'Código PIN' | 'Manual Admin';
  notes?: string;
  deviceId?: string;
}): Promise<{ success: boolean; message: string; record: AttendanceRecord; employee: Employee; shiftDurationFormatted: string }> => {
  const res = await fetch('/api/attendance/clock-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al registrar salida');
  }
  return data;
};

// --- Device Authorization API ---
export const requestDevicePairing = async (payload: {
  employeeId: string;
  deviceId: string;
  deviceName: string;
  deviceUserAgent?: string;
}): Promise<Employee> => {
  const res = await fetch('/api/employees/device-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al solicitar vinculación de dispositivo');
  return data.employee;
};

export const approveDevicePairing = async (employeeId: string): Promise<Employee> => {
  const res = await fetch('/api/employees/approve-device', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al aprobar dispositivo');
  return data.employee;
};

export const resetDevicePairing = async (employeeId: string): Promise<Employee> => {
  const res = await fetch('/api/employees/reset-device', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al desvincular dispositivo');
  return data.employee;
};

export const rejectDevicePairing = async (employeeId: string): Promise<Employee> => {
  const res = await fetch('/api/employees/reject-device', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al rechazar solicitud');
  return data.employee;
};

export const fetchWeeklyReport = async (): Promise<WeeklyReportSummary> => {
  const res = await fetch('/api/reports/weekly');
  if (!res.ok) throw new Error('Error al obtener informe semanal');
  return await res.json();
};

export const generateAIPunctualitySummary = async (): Promise<string> => {
  const res = await fetch('/api/reports/ai-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error al solicitar resumen IA');
  }
  const data = await res.json();
  return data.summary;
};

export const fetchPaymentRequests = async (employeeId?: string): Promise<PaymentRequest[]> => {
  try {
    const url = employeeId ? `/api/payment-requests?employeeId=${employeeId}` : '/api/payment-requests';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al cargar solicitudes de pago');
    return await res.json();
  } catch (e) {
    console.warn('Error fetching payment requests:', e);
    return [];
  }
};

export const createPaymentRequest = async (payload: {
  employeeId: string;
  type: 'adelanto' | 'comision';
  amount: number;
  reason: string;
}): Promise<PaymentRequest> => {
  const res = await fetch('/api/payment-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear solicitud de pago');
  return data.paymentRequest;
};

export const resolvePaymentRequest = async (
  id: string,
  payload: { status: 'approved' | 'rejected'; notes?: string; receiptUrl?: string }
): Promise<PaymentRequest> => {
  const res = await fetch(`/api/payment-requests/${id}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al resolver la solicitud de pago');
  return data.paymentRequest;
};
