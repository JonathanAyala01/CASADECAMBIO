export type EmployeeRole = 'Cajero / Operador' | 'Asesor Inmobiliario' | 'Supervisor de Caja' | 'Gerente de Sucursal' | 'Atención al Cliente';

export type ShiftType = 'Mañana (08:30 - 16:30)' | 'Tarde (12:30 - 20:30)' | 'Completo (09:00 - 18:00)' | 'Personalizado';

export interface Employee {
  id: string;
  code: string; // e.g. EMP-001
  name: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  branch: string;
  shift: ShiftType;
  expectedStartTime: string; // "08:30"
  expectedEndTime: string;   // "16:30"
  pin: string;
  active: boolean;
  avatarUrl?: string;
  qrCodeData: string;
  createdAt: string;

  // Legajo y datos de ingreso
  hireDate?: string;
  paymentFrequency?: string;

  // Datos personales
  dni?: string;
  birthDate?: string;
  residence?: string;
  profession?: string;

  // Device Lock & Anti-Fraud Security
  deviceId?: string; // Authorized device UUID
  deviceStatus?: 'authorized' | 'pending' | 'unregistered' | 'rejected';
  deviceName?: string; // Friendly name e.g. "Samsung Galaxy S23 (Chrome)"
  deviceUserAgent?: string;
  deviceRegisteredAt?: string;
  devicePendingId?: string; // Pending device ID waiting for admin approval
  devicePendingName?: string;
  devicePendingUserAgent?: string;
  devicePendingRequestedAt?: string;
}

export interface PaymentRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  type: 'adelanto' | 'comision';
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string; // ISO String
  resolvedAt?: string; // ISO String
  receiptUrl?: string; // Base64 or image URL
  notes?: string;
}

export type AttendanceType = 'entry' | 'exit';

export interface GeoLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  branch: string;
  type: AttendanceType;
  timestamp: string; // ISO string
  dateStr: string;   // YYYY-MM-DD
  timeStr: string;   // HH:mm:ss
  location: GeoLocationData;
  punctualityStatus: 'Puntual' | 'Tardanza' | 'Salida Anticipada' | 'Fuera de Horario';
  latenessMinutes: number; // 0 if punctual or ahead
  shiftDurationHours?: number; // calculated on exit
  shiftDurationFormatted?: string; // e.g. "7h 45m"
  method: 'QR Cámara' | 'Código PIN' | 'Manual Admin';
  notes?: string;
  selfiePhotoUrl?: string; // Captured photo during scan for identity audit
  distanceFromBranchMeters?: number; // Distance in meters to branch GPS
  securityFlags?: string[]; // Anti-fraud flags e.g. "Rostro Verificado", "GPS Validado", "Riesgo de Clave Compartida"
  pairedEntryId?: string; // Links exit record to entry record
}

export interface BranchLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface WeeklyEmployeePunctuality {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  role: EmployeeRole;
  branch: string;
  totalShiftsExpected: number;
  totalShiftsCompleted: number;
  punctualCount: number;
  lateCount: number;
  totalLatenessMinutes: number;
  totalHoursWorked: number;
  punctualityScore: number; // 0 to 100%
  statusBadge: 'Excelente' | 'Bueno' | 'Atención Requerida' | 'Crítico';
}

export interface WeeklyReportSummary {
  weekLabel: string;
  startDate: string;
  endDate: string;
  totalEmployeesActive: number;
  overallPunctualityRate: number; // percentage
  totalHoursWorked: number;
  totalLatenessInstances: number;
  averageLatenessMinutes: number;
  employeeStats: WeeklyEmployeePunctuality[];
  aiExecutiveSummary?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncedAt: string | null;
  pendingSyncCount: number;
}
