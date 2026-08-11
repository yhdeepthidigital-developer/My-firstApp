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
  status: 'Active' | 'On Leave' | 'Remote';
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Holiday';
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
  { id: 1, name: 'Ava Carter', role: 'Project Manager', department: 'Operations', email: 'ava.carter@company.com', status: 'Active' },
  { id: 2, name: 'Noah Brooks', role: 'Frontend Developer', department: 'Engineering', email: 'noah.brooks@company.com', status: 'Remote' },
  { id: 3, name: 'Emma Walker', role: 'HR Specialist', department: 'People Ops', email: 'emma.walker@company.com', status: 'Active' },
  { id: 4, name: 'Liam Phillips', role: 'QA Engineer', department: 'Engineering', email: 'liam.phillips@company.com', status: 'On Leave' },
  { id: 5, name: 'Sophia Turner', role: 'Business Analyst', department: 'Sales', email: 'sophia.turner@company.com', status: 'Active' },
  { id: 6, name: 'Mason Reed', role: 'Backend Developer', department: 'Engineering', email: 'mason.reed@company.com', status: 'Remote' }
];

const seedAttendance: AttendanceRecord[] = [
  { id: 1, employeeId: 1, date: '2026-08-05', status: 'Present', clockIn: '2026-08-05T08:57:00.000Z', clockOut: '2026-08-05T17:12:00.000Z' },
  { id: 2, employeeId: 2, date: '2026-08-05', status: 'Present', clockIn: '2026-08-05T09:04:00.000Z', clockOut: '2026-08-05T17:36:00.000Z' },
  { id: 3, employeeId: 3, date: '2026-08-05', status: 'Late', clockIn: '2026-08-05T09:42:00.000Z', clockOut: '2026-08-05T18:01:00.000Z' },
  { id: 4, employeeId: 4, date: '2026-08-05', status: 'Absent', clockIn: null, clockOut: null },
  { id: 5, employeeId: 5, date: '2026-08-05', status: 'Present', clockIn: '2026-08-05T08:49:00.000Z', clockOut: '2026-08-05T17:05:00.000Z' },
  { id: 6, employeeId: 6, date: '2026-08-05', status: 'Present', clockIn: '2026-08-05T09:00:00.000Z', clockOut: '2026-08-05T17:22:00.000Z' },
  { id: 7, employeeId: 1, date: '2026-08-04', status: 'Present', clockIn: null, clockOut: null },
  { id: 8, employeeId: 2, date: '2026-08-04', status: 'Late', clockIn: null, clockOut: null },
  { id: 9, employeeId: 3, date: '2026-08-04', status: 'Holiday', clockIn: null, clockOut: null },
  { id: 10, employeeId: 4, date: '2026-08-04', status: 'Absent', clockIn: null, clockOut: null }
];

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
    const fallbackRecord: AttendanceRecord = {
      id: existingRecord?.id ?? Date.now(),
      employeeId,
      date,
      status: 'Present',
      clockIn: clockIn ? now : existingRecord?.clockIn ?? null,
      clockOut: clockIn ? null : now
    };

    this.attendance.update((current) => {
      const existing = current.findIndex((item) => item.employeeId === employeeId && item.date === date);
      if (existing < 0) return [fallbackRecord, ...current];
      return current.map((item, index) => index === existing ? fallbackRecord : item);
    });

    this.http.post<AttendanceRecord>(`${this.apiBaseUrl}/attendance/clock`, { employeeId, clockIn }).pipe(
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
      status: payload?.status ?? fallbackEmployee.status
    };
  }

  private isEmployee(value: unknown): value is Employee {
    return !!value && typeof value === 'object' && 'id' in value && 'name' in value && 'role' in value && 'department' in value && 'email' in value && 'status' in value;
  }
}
