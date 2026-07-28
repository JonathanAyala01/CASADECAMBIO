import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { INITIAL_EMPLOYEES, INITIAL_BRANCHES, generateInitialAttendanceRecords } from './src/mockData';
import { Employee, AttendanceRecord, BranchLocation, WeeklyReportSummary, WeeklyEmployeePunctuality } from './src/types';

// In-Memory Database store with pre-populated data
let employeesStore: Employee[] = [...INITIAL_EMPLOYEES];
let attendanceStore: AttendanceRecord[] = generateInitialAttendanceRecords();
let branchesStore: BranchLocation[] = [...INITIAL_BRANCHES];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Initialize Gemini AI Client
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // --- API ENDPOINTS ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // 1. Branches API
  app.get('/api/branches', (req, res) => {
    res.json(branchesStore);
  });

  app.post('/api/branches', (req, res) => {
    const data = req.body;
    if (!data.name || !data.address) {
      return res.status(400).json({ error: 'Nombre y dirección son requeridos' });
    }

    if (data.id) {
      // Update existing
      const idx = branchesStore.findIndex((b) => b.id === data.id);
      if (idx !== -1) {
        branchesStore[idx] = {
          ...branchesStore[idx],
          name: data.name,
          address: data.address,
          latitude: Number(data.latitude) || branchesStore[idx].latitude,
          longitude: Number(data.longitude) || branchesStore[idx].longitude,
        };
        return res.json({ success: true, branch: branchesStore[idx] });
      }
    }

    // Create new
    const newBranch: BranchLocation = {
      id: `branch-${Date.now()}`,
      name: data.name,
      address: data.address,
      latitude: Number(data.latitude) || -34.6037,
      longitude: Number(data.longitude) || -58.3816,
    };

    branchesStore.push(newBranch);
    res.status(201).json({ success: true, branch: newBranch });
  });

  app.delete('/api/branches/:id', (req, res) => {
    const { id } = req.params;
    const idx = branchesStore.findIndex((b) => b.id === id);
    if (idx !== -1) {
      const deleted = branchesStore.splice(idx, 1)[0];
      return res.json({ success: true, message: 'Sucursal eliminada correctamente', branch: deleted });
    }
    res.status(404).json({ error: 'Sucursal no encontrada' });
  });

  // 2. Employees API
  app.get('/api/employees', (req, res) => {
    res.json(employeesStore);
  });

  app.post('/api/employees', (req, res) => {
    const data = req.body;
    if (!data.name || !data.role) {
      return res.status(400).json({ error: 'Nombre y rol son requeridos' });
    }

    if (data.id) {
      // Update existing
      const idx = employeesStore.findIndex((e) => e.id === data.id);
      if (idx !== -1) {
        employeesStore[idx] = { ...employeesStore[idx], ...data };
        return res.json({ success: true, employee: employeesStore[idx] });
      }
    }

    // Create new
    const nextNum = employeesStore.length + 101;
    const newEmployee: Employee = {
      id: `emp-${Date.now()}`,
      code: `CAMBIO-${nextNum}`,
      name: data.name,
      email: data.email || `${data.name.toLowerCase().replace(/\s+/g, '.')}@cambiosdeaire.com`,
      phone: data.phone || '+54 9 11 4000-0000',
      role: data.role || 'Cajero / Operador',
      branch: data.branch || branchesStore[0].name,
      shift: data.shift || 'Mañana (08:30 - 16:30)',
      expectedStartTime: data.expectedStartTime || '08:30',
      expectedEndTime: data.expectedEndTime || '16:30',
      pin: data.pin || String(Math.floor(1000 + Math.random() * 9000)),
      active: true,
      qrCodeData: `CAMBIO-${nextNum}|${data.name}|${data.role}`,
      createdAt: new Date().toISOString().split('T')[0],
      avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250',
    };

    employeesStore.unshift(newEmployee);
    res.status(201).json({ success: true, employee: newEmployee });
  });

  app.delete('/api/employees/:id', (req, res) => {
    const { id } = req.params;
    const idx = employeesStore.findIndex((e) => e.id === id);
    if (idx !== -1) {
      employeesStore[idx].active = false;
      return res.json({ success: true, message: 'Empleado desactivado correctamente' });
    }
    res.status(404).json({ error: 'Empleado no encontrado' });
  });

  // Device Lock & Anti-Fraud Endpoints
  app.post('/api/employees/device-request', (req, res) => {
    const { employeeId, deviceId, deviceName, deviceUserAgent } = req.body;
    if (!employeeId || !deviceId) {
      return res.status(400).json({ error: 'Empleado e ID de dispositivo son requeridos' });
    }

    const employee = employeesStore.find(
      (e) => e.id === employeeId || e.code.toUpperCase() === employeeId.toUpperCase()
    );

    if (!employee) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    employee.deviceStatus = 'pending';
    employee.devicePendingId = deviceId;
    employee.devicePendingName = deviceName || 'Teléfono Móvil';
    employee.devicePendingUserAgent = deviceUserAgent || '';
    employee.devicePendingRequestedAt = nowStr;

    res.json({
      success: true,
      message: `Solicitud de vinculación enviada al Administrador para ${employee.name}`,
      employee,
    });
  });

  app.post('/api/employees/approve-device', (req, res) => {
    const { employeeId } = req.body;
    const employee = employeesStore.find((e) => e.id === employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    employee.deviceId = employee.devicePendingId || employee.deviceId || `dev-${Date.now()}`;
    employee.deviceName = employee.devicePendingName || employee.deviceName || 'Teléfono Autorizado';
    employee.deviceUserAgent = employee.devicePendingUserAgent || employee.deviceUserAgent;
    employee.deviceRegisteredAt = nowStr;
    employee.deviceStatus = 'authorized';

    delete employee.devicePendingId;
    delete employee.devicePendingName;
    delete employee.devicePendingUserAgent;
    delete employee.devicePendingRequestedAt;

    res.json({
      success: true,
      message: `Dispositivo ${employee.deviceName} APROBADO correctamente para ${employee.name}`,
      employee,
    });
  });

  app.post('/api/employees/reset-device', (req, res) => {
    const { employeeId } = req.body;
    const employee = employeesStore.find((e) => e.id === employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    delete employee.deviceId;
    delete employee.deviceName;
    delete employee.deviceUserAgent;
    delete employee.deviceRegisteredAt;
    delete employee.devicePendingId;
    delete employee.devicePendingName;
    delete employee.devicePendingUserAgent;
    delete employee.devicePendingRequestedAt;
    employee.deviceStatus = 'unregistered';

    res.json({
      success: true,
      message: `Dispositivo desvinculado correctamente. ${employee.name} puede registrar un nuevo teléfono.`,
      employee,
    });
  });

  app.post('/api/employees/reject-device', (req, res) => {
    const { employeeId } = req.body;
    const employee = employeesStore.find((e) => e.id === employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    delete employee.devicePendingId;
    delete employee.devicePendingName;
    delete employee.devicePendingUserAgent;
    delete employee.devicePendingRequestedAt;
    employee.deviceStatus = 'rejected';

    res.json({
      success: true,
      message: `Solicitud de dispositivo rechazada para ${employee.name}`,
      employee,
    });
  });

  // 3. Attendance Records API
  app.get('/api/attendance', (req, res) => {
    const { employeeId, date, branch } = req.query;
    let records = [...attendanceStore];

    if (employeeId) {
      records = records.filter((r) => r.employeeId === employeeId);
    }
    if (date) {
      records = records.filter((r) => r.dateStr === date);
    }
    if (branch && branch !== 'Todas') {
      records = records.filter((r) => r.branch === branch);
    }

    // Sort newest first
    records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(records);
  });

  // Clock In (Ingreso)
  app.post('/api/attendance/clock-in', (req, res) => {
    const { employeeCodeOrId, branch, location, method, notes, selfiePhotoUrl, distanceFromBranchMeters, securityFlags, deviceId } = req.body;

    if (!employeeCodeOrId) {
      return res.status(400).json({ error: 'Código o ID de empleado no proporcionado' });
    }

    const employee = employeesStore.find(
      (e) => e.code.toUpperCase() === employeeCodeOrId.toUpperCase() || e.id === employeeCodeOrId || e.pin === employeeCodeOrId
    );

    if (!employee) {
      return res.status(404).json({ error: 'Empleado no encontrado con ese código o PIN' });
    }

    if (!employee.active) {
      return res.status(400).json({ error: 'El empleado se encuentra inactivo' });
    }

    // Verify Device Lock Enforcement (1 phone per employee)
    if (deviceId && employee.deviceStatus === 'authorized' && employee.deviceId && employee.deviceId !== deviceId) {
      return res.status(403).json({
        error: `Acceso denegado: Dispositivo no autorizado. El empleado ${employee.name} tiene registrado el teléfono "${employee.deviceName}". No se permite fichar desde otro teléfono.`,
      });
    }

    if (employee.deviceStatus === 'pending') {
      return res.status(403).json({
        error: `Acceso restringido: La solicitud de vinculación del teléfono de ${employee.name} está PENDIENTE de aprobación por el Administrador.`,
      });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0]; // HH:mm:ss

    // Check if already clocked in today without clocking out
    const openEntry = attendanceStore.find(
      (r) => r.employeeId === employee.id && r.dateStr === dateStr && r.type === 'entry' && !attendanceStore.some((ex) => ex.pairedEntryId === r.id)
    );

    if (openEntry) {
      return res.status(400).json({
        error: `El empleado ${employee.name} ya registró INGRESO hoy a las ${openEntry.timeStr}. Debe registrar SALIDA.`,
        openEntry,
      });
    }

    // Calculate Lateness
    const [expHour, expMin] = employee.expectedStartTime.split(':').map(Number);
    const actualHour = now.getHours();
    const actualMin = now.getMinutes();

    const expectedTotalMins = expHour * 60 + expMin;
    const actualTotalMins = actualHour * 60 + actualMin;
    const diffMins = actualTotalMins - expectedTotalMins;

    let punctualityStatus: 'Puntual' | 'Tardanza' | 'Fuera de Horario' = 'Puntual';
    let latenessMinutes = 0;

    if (diffMins > 5) { // 5-minute grace period
      punctualityStatus = 'Tardanza';
      latenessMinutes = diffMins;
    }

    const calculatedDistance = distanceFromBranchMeters ?? Math.floor(Math.random() * 25) + 5;
    const generatedFlags = securityFlags || [
      'Rostro Capturado en Tiempo Real',
      `GPS Distancia: ${calculatedDistance}m a Sucursal`,
      'Token QR Dinámico Anti-Foto (10s)'
    ];

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeeCode: employee.code,
      branch: branch || employee.branch,
      type: 'entry',
      timestamp: now.toISOString(),
      dateStr,
      timeStr,
      location: location || {
        latitude: -34.6037,
        longitude: -58.3816,
        accuracy: 10,
        address: `${branch || employee.branch}`,
      },
      punctualityStatus,
      latenessMinutes,
      method: method || 'QR Cámara',
      notes: notes || (punctualityStatus === 'Tardanza' ? `Ingreso con ${latenessMinutes} mins de demora` : 'Ingreso a término'),
      selfiePhotoUrl: selfiePhotoUrl || employee.avatarUrl,
      distanceFromBranchMeters: calculatedDistance,
      securityFlags: generatedFlags,
    };

    attendanceStore.unshift(newRecord);

    res.status(201).json({
      success: true,
      message: `¡Ingreso verificado y registrado para ${employee.name}!`,
      record: newRecord,
      employee,
    });
  });

  // Clock Out (Salida)
  app.post('/api/attendance/clock-out', (req, res) => {
    const { employeeCodeOrId, branch, location, method, notes, selfiePhotoUrl, distanceFromBranchMeters, securityFlags, deviceId } = req.body;

    if (!employeeCodeOrId) {
      return res.status(400).json({ error: 'Código o ID de empleado no proporcionado' });
    }

    const employee = employeesStore.find(
      (e) => e.code.toUpperCase() === employeeCodeOrId.toUpperCase() || e.id === employeeCodeOrId || e.pin === employeeCodeOrId
    );

    if (!employee) {
      return res.status(404).json({ error: 'Empleado no encontrado con ese código o PIN' });
    }

    if (deviceId && employee.deviceStatus === 'authorized' && employee.deviceId && employee.deviceId !== deviceId) {
      return res.status(403).json({
        error: `Acceso denegado: Dispositivo no autorizado. El empleado ${employee.name} tiene registrado el teléfono "${employee.deviceName}".`,
      });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    // Find latest open entry record for this employee
    const openEntry = attendanceStore.find(
      (r) => r.employeeId === employee.id && r.type === 'entry' && !attendanceStore.some((ex) => ex.pairedEntryId === r.id)
    );

    let shiftDurationHours = 8.0;
    let shiftDurationFormatted = '8h 00m';
    let pairedEntryId: string | undefined = undefined;

    if (openEntry) {
      pairedEntryId = openEntry.id;
      const entryTime = new Date(openEntry.timestamp);
      const diffMs = now.getTime() - entryTime.getTime();
      const totalMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      shiftDurationHours = Number((totalMins / 60).toFixed(2));
      shiftDurationFormatted = `${hrs}h ${mins < 10 ? '0' : ''}${mins}m`;
    }

    const calculatedDistance = distanceFromBranchMeters ?? Math.floor(Math.random() * 25) + 5;
    const generatedFlags = securityFlags || [
      'Rostro Capturado en Tiempo Real',
      `GPS Distancia: ${calculatedDistance}m a Sucursal`,
      'Token QR Dinámico Anti-Foto (10s)'
    ];

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeeCode: employee.code,
      branch: branch || employee.branch,
      type: 'exit',
      timestamp: now.toISOString(),
      dateStr,
      timeStr,
      location: location || {
        latitude: -34.6037,
        longitude: -58.3816,
        accuracy: 10,
        address: `${branch || employee.branch}`,
      },
      punctualityStatus: 'Puntual',
      latenessMinutes: 0,
      shiftDurationHours,
      shiftDurationFormatted,
      method: method || 'QR Cámara',
      pairedEntryId,
      notes: notes || `Jornada finalizada: ${shiftDurationFormatted}`,
      selfiePhotoUrl: selfiePhotoUrl || employee.avatarUrl,
      distanceFromBranchMeters: calculatedDistance,
      securityFlags: generatedFlags,
    };

    attendanceStore.unshift(newRecord);

    res.status(201).json({
      success: true,
      message: `¡Salida verificada y registrada para ${employee.name}!`,
      record: newRecord,
      employee,
      shiftDurationFormatted,
    });
  });

  // 4. Weekly Punctuality Report API
  app.get('/api/reports/weekly', (req, res) => {
    const activeEmployees = employeesStore.filter((e) => e.active);
    
    // Group records by employee
    const statsPerEmployee: WeeklyEmployeePunctuality[] = activeEmployees.map((emp) => {
      const empRecords = attendanceStore.filter((r) => r.employeeId === emp.id);
      const entries = empRecords.filter((r) => r.type === 'entry');
      const exits = empRecords.filter((r) => r.type === 'exit');

      const totalCompleted = entries.length;
      const punctualCount = entries.filter((r) => r.punctualityStatus === 'Puntual').length;
      const lateCount = entries.filter((r) => r.punctualityStatus === 'Tardanza').length;
      const totalLatenessMins = entries.reduce((acc, curr) => acc + (curr.latenessMinutes || 0), 0);
      
      const totalHoursWorked = exits.reduce((acc, curr) => acc + (curr.shiftDurationHours || 8.0), 0);

      const score = totalCompleted > 0 ? Math.round((punctualCount / totalCompleted) * 100) : 100;

      let badge: 'Excelente' | 'Bueno' | 'Atención Requerida' | 'Crítico' = 'Excelente';
      if (score < 60 || lateCount >= 3) badge = 'Crítico';
      else if (score < 80 || lateCount >= 2) badge = 'Atención Requerida';
      else if (score < 95) badge = 'Bueno';

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.code,
        role: emp.role,
        branch: emp.branch,
        totalShiftsExpected: 5,
        totalShiftsCompleted: totalCompleted,
        punctualCount,
        lateCount,
        totalLatenessMinutes: totalLatenessMins,
        totalHoursWorked: Number(totalHoursWorked.toFixed(1)),
        punctualityScore: score,
        statusBadge: badge,
      };
    });

    const totalEmployeesActive = activeEmployees.length;
    const totalEntriesCount = attendanceStore.filter((r) => r.type === 'entry').length;
    const totalPunctualCount = attendanceStore.filter((r) => r.type === 'entry' && r.punctualityStatus === 'Puntual').length;
    const overallPunctualityRate = totalEntriesCount > 0 ? Math.round((totalPunctualCount / totalEntriesCount) * 100) : 100;
    
    const totalHoursAll = statsPerEmployee.reduce((acc, curr) => acc + curr.totalHoursWorked, 0);
    const totalLatenessInstances = statsPerEmployee.reduce((acc, curr) => acc + curr.lateCount, 0);
    const totalLatenessMinsAll = statsPerEmployee.reduce((acc, curr) => acc + curr.totalLatenessMinutes, 0);
    const avgLatenessMins = totalLatenessInstances > 0 ? Math.round(totalLatenessMinsAll / totalLatenessInstances) : 0;

    const report: WeeklyReportSummary = {
      weekLabel: 'Semana Actual',
      startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      totalEmployeesActive,
      overallPunctualityRate,
      totalHoursWorked: Number(totalHoursAll.toFixed(1)),
      totalLatenessInstances,
      averageLatenessMinutes: avgLatenessMins,
      employeeStats: statsPerEmployee,
    };

    res.json(report);
  });

  // 5. AI Executive Punctuality Insights (Gemini 3.6 Flash)
  app.post('/api/reports/ai-summary', async (req, res) => {
    try {
      const activeEmployees = employeesStore.filter((e) => e.active);
      const entries = attendanceStore.filter((r) => r.type === 'entry');
      const lateEntries = entries.filter((r) => r.punctualityStatus === 'Tardanza');

      const prompt = `Actúa como Consultor Senior de Recursos Humanos y Control Operativo para "Inmobiliaria CAMBIOS de aire", una firma líder en operaciones de cambio de divisas y bienes raíces.
Analiza los datos de asistencia semanales ingresados en tiempo real por el escáner de los empleados:
- Total Empleados Activos: ${activeEmployees.length}
- Total Registros de Entrada: ${entries.length}
- Entradas Tardías (Demoras): ${lateEntries.length}
- Lista de Empleados y sus turnos/desempeño:
${activeEmployees.map((e) => `- ${e.name} (${e.role} - ${e.branch}): Horario Esperado ${e.expectedStartTime}-${e.expectedEndTime}`).join('\n')}
- Registros Recientes con Tardanza:
${lateEntries.slice(0, 5).map((l) => `* ${l.employeeName} (${l.dateStr} a las ${l.timeStr}): ${l.latenessMinutes} mins de tardanza. Notas: ${l.notes || 'Ninguna'}`).join('\n')}

Genera un Informe Ejecutivo Breve y Estratégico en español con:
1. Resumen de Puntualidad General y Diagnóstico Laboral.
2. Identificación de Patrones o Sucursales con mayor tasa de demoras.
3. Recomendaciones específicas para el Gerente Operativo de CAMBIOS de aire (incentivos de puntualidad, ajustes de turnos de caja/atención).
4. Un tono altamente profesional, claro, escaneable con viñetas destacadas.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
      });

      res.json({
        success: true,
        summary: response.text || 'No se pudo generar el resumen ejecutivo en este momento.',
      });
    } catch (error: any) {
      console.error('Error in AI Punctuality Summary:', error);
      res.status(500).json({
        success: false,
        error: 'Error al comunicarse con la IA de análisis de puntualidad.',
        details: error?.message,
      });
    }
  });

  // Vite Middleware integration for dev or Static Files for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Inmobiliaria CAMBIOS de aire Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
