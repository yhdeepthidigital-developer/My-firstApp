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
}

const seedEmployees: Employee[] = [
  { id: 1, name: 'Ava Carter', role: 'Project Manager', department: 'Operations', email: 'ava.carter@company.com', status: 'Active' },
  { id: 2, name: 'Noah Brooks', role: 'Frontend Developer', department: 'Engineering', email: 'noah.brooks@company.com', status: 'Remote' },
  { id: 3, name: 'Emma Walker', role: 'HR Specialist', department: 'People Ops', email: 'emma.walker@company.com', status: 'Active' },
  { id: 4, name: 'Liam Phillips', role: 'QA Engineer', department: 'Engineering', email: 'liam.phillips@company.com', status: 'On Leave' },
  { id: 5, name: 'Sophia Turner', role: 'Business Analyst', department: 'Sales', email: 'sophia.turner@company.com', status: 'Active' },
  { id: 6, name: 'Mason Reed', role: 'Backend Developer', department: 'Engineering', email: 'mason.reed@company.com', status: 'Remote' }
];

const seedAttendance: AttendanceRecord[] = [
  { id: 1, employeeId: 1, date: '2026-08-05', status: 'Present' },
  { id: 2, employeeId: 2, date: '2026-08-05', status: 'Present' },
  { id: 3, employeeId: 3, date: '2026-08-05', status: 'Late' },
  { id: 4, employeeId: 4, date: '2026-08-05', status: 'Absent' },
  { id: 5, employeeId: 5, date: '2026-08-05', status: 'Present' },
  { id: 6, employeeId: 6, date: '2026-08-05', status: 'Present' },
  { id: 7, employeeId: 1, date: '2026-08-04', status: 'Present' },
  { id: 8, employeeId: 2, date: '2026-08-04', status: 'Late' },
  { id: 9, employeeId: 3, date: '2026-08-04', status: 'Holiday' },
  { id: 10, employeeId: 4, date: '2026-08-04', status: 'Absent' }
];

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);

  readonly employees = signal<Employee[]>(seedEmployees);
  readonly attendance = signal<AttendanceRecord[]>(seedAttendance);
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
      attendance: this.http.get<AttendanceRecord[]>(`${this.apiBaseUrl}/attendance`).pipe(catchError(() => of(seedAttendance)))
    }).subscribe((response) => {
      this.employees.set(response.employees);
      this.attendance.set(response.attendance);
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
