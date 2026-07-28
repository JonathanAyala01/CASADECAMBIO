import { Employee, BranchLocation, AttendanceRecord } from './types';

export const INITIAL_BRANCHES: BranchLocation[] = [
  {
    id: 'branch-1',
    name: 'Sucursal Central - Microcentro',
    address: 'Av. Corrientes 1250, CABA',
    latitude: -34.6037,
    longitude: -58.3816
  },
  {
    id: 'branch-2',
    name: 'Sucursal Barrio Norte',
    address: 'Av. Santa Fe 2840, CABA',
    latitude: -34.5889,
    longitude: -58.4061
  },
  {
    id: 'branch-3',
    name: 'Sucursal Belgrano Inmobiliaria',
    address: 'Av. Cabildo 2100, CABA',
    latitude: -34.5621,
    longitude: -58.4552
  },
  {
    id: 'branch-4',
    name: 'Sucursal Puerto Madero',
    address: 'Juana Manso 1050, CABA',
    latitude: -34.6112,
    longitude: -58.3620
  }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-101',
    code: 'CAMBIO-101',
    name: 'Carlos Benítez',
    email: 'carlos.benitez@cambiosdeaire.com',
    phone: '+54 9 11 4589-1234',
    role: 'Supervisor de Caja',
    branch: 'Sucursal Central - Microcentro',
    shift: 'Mañana (08:30 - 16:30)',
    expectedStartTime: '08:30',
    expectedEndTime: '16:30',
    pin: '1001',
    active: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    qrCodeData: 'CAMBIO-101|Carlos Benítez|Supervisor',
    createdAt: '2025-01-15',
    deviceStatus: 'authorized',
    deviceId: 'device-carlos-101',
    deviceName: 'iPhone 15 Pro (Safari)',
    deviceRegisteredAt: '2026-07-20 10:00',
  },
  {
    id: 'emp-102',
    code: 'CAMBIO-102',
    name: 'Mariana Gómez',
    email: 'mariana.gomez@cambiosdeaire.com',
    phone: '+54 9 11 5122-8890',
    role: 'Cajero / Operador',
    branch: 'Sucursal Central - Microcentro',
    shift: 'Mañana (08:30 - 16:30)',
    expectedStartTime: '08:30',
    expectedEndTime: '16:30',
    pin: '1002',
    active: true,
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=250',
    qrCodeData: 'CAMBIO-102|Mariana Gómez|Cajero',
    createdAt: '2025-02-01',
    deviceStatus: 'pending',
    devicePendingId: 'device-mariana-req',
    devicePendingName: 'Samsung Galaxy A54 (Chrome Mobile)',
    devicePendingRequestedAt: '2026-07-27 09:15',
  },
  {
    id: 'emp-103',
    code: 'CAMBIO-103',
    name: 'Lucas Peralta',
    email: 'lucas.peralta@cambiosdeaire.com',
    phone: '+54 9 11 6788-3411',
    role: 'Asesor Inmobiliario',
    branch: 'Sucursal Belgrano Inmobiliaria',
    shift: 'Completo (09:00 - 18:00)',
    expectedStartTime: '09:00',
    expectedEndTime: '18:00',
    pin: '1003',
    active: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    qrCodeData: 'CAMBIO-103|Lucas Peralta|Asesor',
    createdAt: '2025-03-10'
  },
  {
    id: 'emp-104',
    code: 'CAMBIO-104',
    name: 'Sofía Rossi',
    email: 'sofia.rossi@cambiosdeaire.com',
    phone: '+54 9 11 4410-9988',
    role: 'Cajero / Operador',
    branch: 'Sucursal Barrio Norte',
    shift: 'Tarde (12:30 - 20:30)',
    expectedStartTime: '12:30',
    expectedEndTime: '20:30',
    pin: '1004',
    active: true,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
    qrCodeData: 'CAMBIO-104|Sofía Rossi|Cajero',
    createdAt: '2025-04-05'
  },
  {
    id: 'emp-105',
    code: 'CAMBIO-105',
    name: 'Gonzalo Martínez',
    email: 'gonzalo.martinez@cambiosdeaire.com',
    phone: '+54 9 11 3321-7766',
    role: 'Gerente de Sucursal',
    branch: 'Sucursal Puerto Madero',
    shift: 'Completo (09:00 - 18:00)',
    expectedStartTime: '09:00',
    expectedEndTime: '18:00',
    pin: '1005',
    active: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
    qrCodeData: 'CAMBIO-105|Gonzalo Martínez|Gerente',
    createdAt: '2025-01-02'
  }
];

// Helper to construct recent attendance records for demonstration
export const generateInitialAttendanceRecords = (): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const now = new Date();
  
  // Format YYYY-MM-DD for recent days
  const getPastDateStr = (daysAgo: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const todayStr = getPastDateStr(0);
  const yesterdayStr = getPastDateStr(1);
  const daysAgo2Str = getPastDateStr(2);
  const daysAgo3Str = getPastDateStr(3);

  // Carlos Benítez - Today Entry
  records.push({
    id: 'att-001',
    employeeId: 'emp-101',
    employeeName: 'Carlos Benítez',
    employeeCode: 'CAMBIO-101',
    branch: 'Sucursal Central - Microcentro',
    type: 'entry',
    timestamp: `${todayStr}T08:26:15.000Z`,
    dateStr: todayStr,
    timeStr: '08:26:15',
    location: {
      latitude: -34.6037,
      longitude: -58.3816,
      accuracy: 8,
      address: 'Av. Corrientes 1250, CABA (Sede Central)'
    },
    punctualityStatus: 'Puntual',
    latenessMinutes: 0,
    method: 'QR Cámara'
  });

  // Mariana Gómez - Today Entry (Late by 12 mins)
  records.push({
    id: 'att-002',
    employeeId: 'emp-102',
    employeeName: 'Mariana Gómez',
    employeeCode: 'CAMBIO-102',
    branch: 'Sucursal Central - Microcentro',
    type: 'entry',
    timestamp: `${todayStr}T08:42:00.000Z`,
    dateStr: todayStr,
    timeStr: '08:42:00',
    location: {
      latitude: -34.6039,
      longitude: -58.3814,
      accuracy: 12,
      address: 'Av. Corrientes 1252, CABA'
    },
    punctualityStatus: 'Tardanza',
    latenessMinutes: 12,
    method: 'QR Cámara',
    notes: 'Tráfico en Subte B'
  });

  // Lucas Peralta - Today Entry & Exit
  records.push({
    id: 'att-003',
    employeeId: 'emp-103',
    employeeName: 'Lucas Peralta',
    employeeCode: 'CAMBIO-103',
    branch: 'Sucursal Belgrano Inmobiliaria',
    type: 'entry',
    timestamp: `${todayStr}T08:58:10.000Z`,
    dateStr: todayStr,
    timeStr: '08:58:10',
    location: {
      latitude: -34.5621,
      longitude: -58.4552,
      accuracy: 6,
      address: 'Av. Cabildo 2100, Belgrano'
    },
    punctualityStatus: 'Puntual',
    latenessMinutes: 0,
    method: 'Código PIN'
  });

  // Yesterday Records (Full shifts for Carlos and Mariana)
  records.push({
    id: 'att-010',
    employeeId: 'emp-101',
    employeeName: 'Carlos Benítez',
    employeeCode: 'CAMBIO-101',
    branch: 'Sucursal Central - Microcentro',
    type: 'entry',
    timestamp: `${yesterdayStr}T08:28:00.000Z`,
    dateStr: yesterdayStr,
    timeStr: '08:28:00',
    location: { latitude: -34.6037, longitude: -58.3816, accuracy: 5, address: 'Av. Corrientes 1250, CABA' },
    punctualityStatus: 'Puntual',
    latenessMinutes: 0,
    method: 'QR Cámara'
  });

  records.push({
    id: 'att-011',
    employeeId: 'emp-101',
    employeeName: 'Carlos Benítez',
    employeeCode: 'CAMBIO-101',
    branch: 'Sucursal Central - Microcentro',
    type: 'exit',
    timestamp: `${yesterdayStr}T16:32:00.000Z`,
    dateStr: yesterdayStr,
    timeStr: '16:32:00',
    location: { latitude: -34.6037, longitude: -58.3816, accuracy: 5, address: 'Av. Corrientes 1250, CABA' },
    punctualityStatus: 'Puntual',
    latenessMinutes: 0,
    shiftDurationHours: 8.07,
    shiftDurationFormatted: '8h 04m',
    method: 'QR Cámara',
    pairedEntryId: 'att-010'
  });

  records.push({
    id: 'att-012',
    employeeId: 'emp-104',
    employeeName: 'Sofía Rossi',
    employeeCode: 'CAMBIO-104',
    branch: 'Sucursal Barrio Norte',
    type: 'entry',
    timestamp: `${yesterdayStr}T12:29:10.000Z`,
    dateStr: yesterdayStr,
    timeStr: '12:29:10',
    location: { latitude: -34.5889, longitude: -58.4061, accuracy: 7, address: 'Av. Santa Fe 2840, CABA' },
    punctualityStatus: 'Puntual',
    latenessMinutes: 0,
    method: 'QR Cámara'
  });

  records.push({
    id: 'att-013',
    employeeId: 'emp-104',
    employeeName: 'Sofía Rossi',
    employeeCode: 'CAMBIO-104',
    branch: 'Sucursal Barrio Norte',
    type: 'exit',
    timestamp: `${yesterdayStr}T20:30:00.000Z`,
    dateStr: yesterdayStr,
    timeStr: '20:30:00',
    location: { latitude: -34.5889, longitude: -58.4061, accuracy: 7, address: 'Av. Santa Fe 2840, CABA' },
    punctualityStatus: 'Puntual',
    latenessMinutes: 0,
    shiftDurationHours: 8.01,
    shiftDurationFormatted: '8h 01m',
    method: 'QR Cámara',
    pairedEntryId: 'att-012'
  });

  // 2 days ago (Gonzalo and Lucas)
  records.push({
    id: 'att-020',
    employeeId: 'emp-105',
    employeeName: 'Gonzalo Martínez',
    employeeCode: 'CAMBIO-105',
    branch: 'Sucursal Puerto Madero',
    type: 'entry',
    timestamp: `${daysAgo2Str}T08:55:00.000Z`,
    dateStr: daysAgo2Str,
    timeStr: '08:55:00',
    location: { latitude: -34.6112, longitude: -58.3620, accuracy: 10, address: 'Juana Manso 1050, Puerto Madero' },
    punctualityStatus: 'Puntual',
    latenessMinutes: 0,
    method: 'QR Cámara'
  });

  records.push({
    id: 'att-021',
    employeeId: 'emp-105',
    employeeName: 'Gonzalo Martínez',
    employeeCode: 'CAMBIO-105',
    branch: 'Sucursal Puerto Madero',
    type: 'exit',
    timestamp: `${daysAgo2Str}T18:05:00.000Z`,
    dateStr: daysAgo2Str,
    timeStr: '18:05:00',
    location: { latitude: -34.6112, longitude: -58.3620, accuracy: 10, address: 'Juana Manso 1050, Puerto Madero' },
    punctualityStatus: 'Puntual',
    latenessMinutes: 0,
    shiftDurationHours: 9.16,
    shiftDurationFormatted: '9h 10m',
    method: 'QR Cámara',
    pairedEntryId: 'att-020'
  });

  // 3 days ago (Mariana Gomez late 18 mins)
  records.push({
    id: 'att-030',
    employeeId: 'emp-102',
    employeeName: 'Mariana Gómez',
    employeeCode: 'CAMBIO-102',
    branch: 'Sucursal Central - Microcentro',
    type: 'entry',
    timestamp: `${daysAgo3Str}T08:48:00.000Z`,
    dateStr: daysAgo3Str,
    timeStr: '08:48:00',
    location: { latitude: -34.6037, longitude: -58.3816, accuracy: 6, address: 'Av. Corrientes 1250, CABA' },
    punctualityStatus: 'Tardanza',
    latenessMinutes: 18,
    method: 'QR Cámara'
  });

  records.push({
    id: 'att-031',
    employeeId: 'emp-102',
    employeeName: 'Mariana Gómez',
    employeeCode: 'CAMBIO-102',
    branch: 'Sucursal Central - Microcentro',
    type: 'exit',
    timestamp: `${daysAgo3Str}T16:30:00.000Z`,
    dateStr: daysAgo3Str,
    timeStr: '16:30:00',
    location: { latitude: -34.6037, longitude: -58.3816, accuracy: 6, address: 'Av. Corrientes 1250, CABA' },
    punctualityStatus: 'Puntual',
    latenessMinutes: 0,
    shiftDurationHours: 7.70,
    shiftDurationFormatted: '7h 42m',
    method: 'QR Cámara',
    pairedEntryId: 'att-030'
  });

  return records;
};
