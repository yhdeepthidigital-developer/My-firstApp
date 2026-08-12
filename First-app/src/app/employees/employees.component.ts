import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Employee, EmployeeService } from '../employee.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss']
})
export class EmployeeManagementComponent implements OnInit, OnDestroy {
  private readonly employeeService = inject(EmployeeService);
  private readonly route = inject(ActivatedRoute);
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private successTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected readonly employees = this.employeeService.employees;
  protected readonly attendance = this.employeeService.attendance;
  private readonly today = new Date().toISOString().slice(0, 10);
  protected readonly todayAttendance = computed(() => {
    const presentIds = new Set(this.attendance()
      .filter((record) => record.date === this.today && (record.status === 'Present' || record.status === 'Late' || record.status === 'Half Day'))
      .map((record) => record.employeeId));
    return {
      present: this.employees().filter((employee) => presentIds.has(employee.id)),
      absent: this.employees().filter((employee) => employee.status !== 'On Leave' && !presentIds.has(employee.id) && this.isPastShiftGrace(employee))
    };
  });
  protected readonly employeesOnLeave = computed(() => this.employees().filter((employee) => employee.status === 'On Leave'));
  protected readonly birthdaysToday = computed(() => this.employees().filter((employee) => this.isBirthdayToday(employee.birthDate)));
  protected readonly upcomingBirthdays = computed(() => this.employees()
    .filter((employee) => employee.birthDate && !this.isBirthdayToday(employee.birthDate))
    .map((employee) => ({ employee, daysUntil: this.daysUntilBirthday(employee.birthDate!) }))
    .filter(({ daysUntil }) => daysUntil <= 90)
    .sort((first, second) => first.daysUntil - second.daysUntil));
  protected filterStatus: string | null = null;
  protected editingId: number | null = null;
  protected showForm = false;
  protected errorMessage: WritableSignal<string> = signal('');
  protected readonly successMessage: WritableSignal<string> = signal('');
  protected form: Omit<Employee, 'id'> = {
    name: '',
    role: '',
    department: '',
    email: '',
    birthDate: '',
    shiftStart: '09:00',
    shiftEnd: '18:00',
    status: 'Active'
  };

  get displayedEmployees(): Employee[] {
    const currentEmployees = this.employees();

    return this.filterStatus
      ? currentEmployees.filter((employee) => employee.status === this.filterStatus)
      : currentEmployees;
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.filterStatus = params.get('status');
      if (params.get('action') === 'add') {
        this.resetForm();
        this.showForm = true;
      }
    });
  }

  protected saveEmployee(): void {
    this.clearSuccess();
    if (!this.form.name || !this.form.role || !this.form.department || !this.form.email) {
      this.errorMessage.set('Please fill in all required fields before saving.');
      this.scheduleErrorClear();
      return;
    }

    if (!this.isValidEmail(this.form.email)) {
      this.errorMessage.set('Please enter a valid email address.');
      this.scheduleErrorClear();
      return;
    }

    const duplicateEmail = this.employees().some((employee) =>
      employee.email.toLowerCase() === this.form.email.trim().toLowerCase() && employee.id !== this.editingId
    );
    if (duplicateEmail) {
      this.errorMessage.set('An employee with this email already exists.');
      this.scheduleErrorClear();
      return;
    }

    this.clearError();

    const employeeToSave = this.editingId !== null
      ? this.form
      : { ...this.form, status: 'Active' as const };

    if (this.editingId !== null) {
      this.employeeService.updateEmployee(this.editingId, employeeToSave);
      this.showSuccess(`${this.form.name.trim()} was updated successfully.`);
    } else {
      this.employeeService.addEmployee(employeeToSave);
      this.showSuccess(`${this.form.name.trim()} was added. Share the employee portal password: employee123.`);
    }

    this.resetForm();
    this.showForm = false;
  }

  protected editEmployee(employee: Employee): void {
    this.editingId = employee.id;
    this.form = { ...employee };
    this.showForm = true;
  }

  protected deleteEmployee(id: number): void {
    this.employeeService.deleteEmployee(id);
    this.resetForm();
  }

  protected resetForm(): void {
    this.editingId = null;
    this.clearError();
    this.form = {
      name: '',
      role: '',
      department: '',
      email: '',
      birthDate: '',
      shiftStart: '09:00',
      shiftEnd: '18:00',
      status: 'Active'
    };
  }

  protected clearSuccess(): void {
    this.successMessage.set('');
    if (this.successTimeoutId !== null) {
      clearTimeout(this.successTimeoutId);
      this.successTimeoutId = null;
    }
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    this.successTimeoutId = window.setTimeout(() => {
      this.successMessage.set('');
      this.successTimeoutId = null;
    }, 4000);
  }

  private isValidEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email.trim());
  }

  protected closeForm(): void {
    this.resetForm();
    this.showForm = false;
  }

  protected birthdayLabel(birthDate: string): string {
    return new Date(`${birthDate}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  protected employeeCode(id: number): string {
    return `YH${String(id).padStart(3, '0')}`;
  }

  private isPastShiftGrace(employee: Employee): boolean {
    const [hours, minutes] = (employee.shiftStart || '09:00').split(':').map(Number);
    const cutoff = new Date();
    cutoff.setHours(hours, minutes + 15, 0, 0);
    return new Date() > cutoff;
  }

  private isBirthdayToday(birthDate: string | undefined): boolean {
    return !!birthDate && birthDate.slice(5) === this.today.slice(5);
  }

  private daysUntilBirthday(birthDate: string): number {
    const today = new Date(`${this.today}T00:00:00`);
    const birthday = new Date(`${today.getFullYear()}-${birthDate.slice(5)}T00:00:00`);
    if (birthday < today) birthday.setFullYear(today.getFullYear() + 1);
    return Math.round((birthday.getTime() - today.getTime()) / 86400000);
  }

  private scheduleErrorClear(): void {
    this.clearErrorTimeout();
    this.errorTimeoutId = window.setTimeout(() => {
      this.errorMessage.set('');
      this.errorTimeoutId = null;
    }, 4000);
  }

  private clearErrorTimeout(): void {
    if (this.errorTimeoutId !== null) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = null;
    }
  }

  protected clearError(): void {
    this.errorMessage.set('');
    this.clearErrorTimeout();
  }

  ngOnDestroy(): void {
    this.clearErrorTimeout();
    this.clearSuccess();
  }
}
