import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, of } from 'rxjs';
import { environment } from '../environments/environment';

export interface Employee {
  id: number;
  name: string;
  role: string;
  department: string;
  email: string;
  phone?: string;
  password?: string;
  birthDate?: string;
  shiftStart?: string;
  shiftEnd?: string;
  status: 'Active' | 'On Leave' | 'Remote';
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Holiday';
  clockIn: string | null;
  clockOut: string | null;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface ShiftChangeDay {
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason: string | null;
}

export interface ShiftChangeRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  currentShift: string;
  requestedStart: string;
  requestedEnd: string;
  reason: string;
  startDate: string;
  endDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  days: ShiftChangeDay[];
}

export interface Task {
  id: number;
  employeeId: number;
  title: string;
  detail: string;
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  startedAt: string | null;
  completedAt: string | null;
  durationMinutes: number | null;
  attachmentName: string | null;
  attachmentData: string | null;
}

export type NewTask = Pick<Task, 'employeeId' | 'title' | 'detail' | 'dueDate'> & {
  status: Task['status'];
};

const seedEmployees: Employee[] = [
  { id: 1, name: 'Ava Carter', role: 'Project Manager', department: 'Operations', email: 'ava.carter@company.com', birthDate: '1991-08-12', shiftStart: '09:00', shiftEnd: '18:00', status: 'Active' },
  { id: 2, name: 'Noah Brooks', role: 'Frontend Developer', department: 'Engineering', email: 'noah.brooks@company.com', birthDate: '1994-08-18', shiftStart: '09:00', shiftEnd: '18:00', status: 'Remote' },
  { id: 3, name: 'Emma Walker', role: 'HR Specialist', department: 'People Ops', email: 'emma.walker@company.com', birthDate: '1992-09-03', shiftStart: '09:30', shiftEnd: '18:30', status: 'Active' },
  { id: 4, name: 'Liam Phillips', role: 'QA Engineer', department: 'Engineering', email: 'liam.phillips@company.com', birthDate: '1990-10-22', shiftStart: '09:00', shiftEnd: '18:00', status: 'On Leave' },
  { id: 5, name: 'Sophia Turner', role: 'Business Analyst', department: 'Sales', email: 'sophia.turner@company.com', birthDate: '1995-12-07', shiftStart: '10:00', shiftEnd: '19:00', status: 'Active' },
  { id: 6, name: 'Mason Reed', role: 'Backend Developer', department: 'Engineering', email: 'mason.reed@company.com', birthDate: '1993-01-15', shiftStart: '09:00', shiftEnd: '18:00', status: 'Remote' }
];

function buildDemoAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const cursor = new Date(2026, 6, 1);
  const end = new Date();
  let id = 1;
  let workday = 0;
  while (cursor <= end) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) {
      const date = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      const timestamp = (time: string) => `${date}T${time}:00.000Z`;
      records.push({ id: id++, employeeId: 1, date, status: 'Present', clockIn: timestamp('08:55'), clockOut: timestamp('17:30') });
      records.push({ id: id++, employeeId: 2, date, status: workday % 5 === 0 ? 'Late' : 'Present', clockIn: timestamp(workday % 5 === 0 ? '09:20' : '08:58'), clockOut: timestamp('17:35') });
      records.push({ id: id++, employeeId: 3, date, status: workday % 7 === 0 ? 'Absent' : 'Present', clockIn: workday % 7 === 0 ? null : timestamp('09:20'), clockOut: workday % 7 === 0 ? null : timestamp('18:10') });
      records.push({ id: id++, employeeId: 5, date, status: 'Present', clockIn: timestamp('09:52'), clockOut: timestamp('18:55') });
      records.push({ id: id++, employeeId: 6, date, status: workday % 6 === 0 ? 'Absent' : 'Present', clockIn: workday % 6 === 0 ? null : timestamp('08:57'), clockOut: workday % 6 === 0 ? null : timestamp('17:40') });
      workday++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return records;
}

const seedAttendance: AttendanceRecord[] = buildDemoAttendance();

const seedTasks: Task[] = [
  { id: 1, employeeId: 1, title: 'Review project priorities', detail: 'Prepare the operations update for the team meeting.', dueDate: '2026-08-12', status: 'Pending', startedAt: null, completedAt: null, durationMinutes: null, attachmentName: null, attachmentData: null },
  { id: 2, employeeId: 2, title: 'Fix responsive navigation', detail: 'Resolve the mobile navigation issues in the dashboard.', dueDate: '2026-08-11', status: 'In Progress', startedAt: '2026-08-10T08:30:00.000Z', completedAt: null, durationMinutes: null, attachmentName: null, attachmentData: null },
  { id: 3, employeeId: 3, title: 'Prepare onboarding checklist', detail: 'Share the updated checklist with People Ops.', dueDate: '2026-08-14', status: 'Pending', startedAt: null, completedAt: null, durationMinutes: null, attachmentName: null, attachmentData: null }
];

const seedLeaveRequests: LeaveRequest[] = [
  { id: 1, employeeId: 4, employeeName: 'Liam Phillips', startDate: '2026-08-10', endDate: '2026-08-12', reason: 'Medical appointment', status: 'Pending' },
  { id: 2, employeeId: 2, employeeName: 'Noah Brooks', startDate: '2026-08-15', endDate: '2026-08-16', reason: 'Personal work', status: 'Pending' }
];

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);

  readonly employees = signal<Employee[]>(seedEmployees);
  readonly attendance = signal<AttendanceRecord[]>(seedAttendance);
  readonly tasks = signal<Task[]>(seedTasks);
  readonly leaveRequests = signal<LeaveRequest[]>(seedLeaveRequests);
  readonly shiftChangeRequests = signal<ShiftChangeRequest[]>([]);
  private readonly notificationsRead = signal(false);
  readonly pendingNotificationCount = computed(() => this.notificationsRead() ? 0 : this.leaveRequests().filter((request) => request.status === 'Pending').length + this.shiftChangeRequests().filter((request) => request.status === 'Pending').length);
  readonly totals = computed(() => {
    const currentEmployees = this.employees();
    return {
      totalEmployees: currentEmployees.length,
      activeEmployees: currentEmployees.filter((employee) => employee.status === 'Active').length,
      remoteEmployees: currentEmployees.filter((employee) => employee.status === 'Remote').length,
      onLeaveEmployees: currentEmployees.filter((employee) => employee.status === 'On Leave').length
    };
  });

  constructor() {
    this.loadAll();
  }

  markNotificationsRead(): void { this.notificationsRead.set(true); }
  markNotificationsUnread(): void { this.notificationsRead.set(false); }

  private readonly apiBaseUrl = `${environment.apiUrl}/api`;

  loadAll(): void {
    forkJoin({
      employees: this.http.get<Employee[]>(`${this.apiBaseUrl}/employees`).pipe(catchError(() => of(seedEmployees))),
      attendance: this.http.get<AttendanceRecord[]>(`${this.apiBaseUrl}/attendance`).pipe(catchError(() => of(seedAttendance))),
      tasks: this.http.get<Task[]>(`${this.apiBaseUrl}/tasks`).pipe(catchError(() => of(seedTasks)))
    }).subscribe((response) => {
      this.employees.set(response.employees);
      this.attendance.set(response.attendance);
      this.tasks.set(response.tasks);
    });
  }

  addTask(task: NewTask): void {
    this.http.post<Task>(`${this.apiBaseUrl}/tasks`, task).pipe(
      catchError(() => of({
        id: Date.now(),
        ...task,
        startedAt: null,
        completedAt: null,
        durationMinutes: null,
        attachmentName: null,
        attachmentData: null
      }))
    ).subscribe((savedTask) => this.tasks.update((current) => [...current, savedTask]));
  }

  updateTask(id: number, status: Task['status'], attachmentName: string | null = null, attachmentData: string | null = null): void {
    const currentTask = this.tasks().find((task) => task.id === id);
    const now = new Date().toISOString();
    const startedAt = status === 'In Progress' ? currentTask?.startedAt ?? now : currentTask?.startedAt ?? null;
    const completedAt = status === 'Completed' ? currentTask?.completedAt ?? now : null;
    const durationMinutes = startedAt && completedAt
      ? Math.max(0, Math.floor((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000))
      : null;
    const changes = { status, startedAt, completedAt, durationMinutes, attachmentName, attachmentData };

    this.http.put<Task>(`${this.apiBaseUrl}/tasks/${id}`, changes).pipe(
      catchError(() => of(currentTask ? { ...currentTask, ...changes } : undefined))
    ).subscribe((updatedTask) => {
      if (!updatedTask) return;
      this.tasks.update((current) => current.map((task) => task.id === id ? { ...task, ...updatedTask } : task));
    });
  }

  updateTaskStatus(id: number, status: Task['status']): void {
    this.updateTask(id, status);
  }

  clock(employeeId: number, clockIn: boolean): void {
    const now = new Date().toISOString();
    const date = now.slice(0, 10);
    const existingRecord = this.attendance().find((record) => record.employeeId === employeeId && record.date === date);
    const employee = this.employees().find((item) => item.id === employeeId);
    const scheduledStart = employee?.shiftStart ?? '09:00';
    const [hours, minutes] = scheduledStart.split(':').map(Number);
    const shiftStart = new Date();
    shiftStart.setHours(hours, minutes + 15, 0, 0);
    const status = clockIn && new Date() > shiftStart ? 'Half Day' : existingRecord?.status ?? 'Present';
    const fallbackRecord: AttendanceRecord = {
      id: existingRecord?.id ?? Date.now(),
      employeeId,
      date,
      status,
      clockIn: clockIn ? now : existingRecord?.clockIn ?? null,
      clockOut: clockIn ? null : now
    };

    this.attendance.update((current) => {
      const existing = current.findIndex((item) => item.employeeId === employeeId && item.date === date);
      if (existing < 0) return [fallbackRecord, ...current];
      return current.map((item, index) => index === existing ? fallbackRecord : item);
    });

    this.http.post<AttendanceRecord>(`${this.apiBaseUrl}/attendance/clock`, { employeeId, clockIn, status }).pipe(
      catchError(() => of(fallbackRecord))
    ).subscribe((record) => {
      this.attendance.update((current) => {
        const existing = current.findIndex((item) => item.employeeId === employeeId && item.date === record.date);
        if (existing < 0) return [record, ...current];
        return current.map((item, index) => index === existing ? { ...item, ...record } : item);
      });
    });
  }

  addEmployee(employee: Omit<Employee, 'id'>): void {
    this.http.post<Employee | { message: string; data: Employee }>(`${this.apiBaseUrl}/employees`, employee).pipe(
      catchError(() => of({ id: Date.now(), ...employee }))
    ).subscribe((savedEmployee) => {
      const normalizedEmployee = this.normalizeEmployeeResponse(savedEmployee, employee);
      this.employees.update((current) => [...current, normalizedEmployee]);
    });
  }

  updateEmployee(id: number, employee: Omit<Employee, 'id'>): void {
    this.http.put<Employee | { message: string; data: Employee }>(`${this.apiBaseUrl}/employees/${id}`, employee).pipe(
      catchError(() => of({ id, ...employee }))
    ).subscribe((updatedEmployee) => {
      const normalizedEmployee = this.normalizeEmployeeResponse(updatedEmployee, employee);
      this.employees.update((current) =>
        current.map((record) => (record.id === id ? { ...record, ...normalizedEmployee } : record))
      );
    });
  }

  deleteEmployee(id: number): void {
    this.http.delete(`${this.apiBaseUrl}/employees/${id}`).pipe(
      catchError(() => of({}))
    ).subscribe(() => {
      this.employees.update((current) => current.filter((record) => record.id !== id));
      this.attendance.update((current) => current.filter((record) => record.employeeId !== id));
    });
  }

  private normalizeEmployeeResponse(
    response: Employee | { message?: string; data?: Employee } | null | undefined,
    fallbackEmployee: Omit<Employee, 'id'>
  ): Employee {
    const payload = this.isEmployee(response)
      ? response
      : response && typeof response === 'object' && 'data' in response && this.isEmployee(response.data)
        ? response.data
        : null;

    return {
      id: payload?.id ?? Date.now(),
      name: payload?.name ?? fallbackEmployee.name,
      role: payload?.role ?? fallbackEmployee.role,
      department: payload?.department ?? fallbackEmployee.department,
      email: payload?.email ?? fallbackEmployee.email,
        phone: payload?.phone ?? fallbackEmployee.phone ?? '',
        password: payload?.password ?? fallbackEmployee.password ?? 'employee123',
        birthDate: payload?.birthDate ?? fallbackEmployee.birthDate ?? '',
        shiftStart: payload?.shiftStart ?? fallbackEmployee.shiftStart ?? '09:00',
        shiftEnd: payload?.shiftEnd ?? fallbackEmployee.shiftEnd ?? '18:00',
        status: payload?.status ?? fallbackEmployee.status
    };
  }

  private isEmployee(value: unknown): value is Employee {
    return !!value && typeof value === 'object' && 'id' in value && 'name' in value && 'role' in value && 'department' in value && 'email' in value && 'status' in value;
  }
}
