import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
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
  protected filterStatus: string | null = null;
  protected editingId: number | null = null;
  protected errorMessage: WritableSignal<string> = signal('');
  protected readonly successMessage: WritableSignal<string> = signal('');
  protected form: Omit<Employee, 'id'> = {
    name: '',
    role: '',
    department: '',
    email: '',
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
  }

  protected editEmployee(employee: Employee): void {
    this.editingId = employee.id;
    this.form = { ...employee };
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

  private scheduleErrorClear(): void {
    this.clearErrorTimeout();
    this.errorTimeoutId = window.setTimeout(() => {
      this.errorMessage.set('');
      this.errorTimeoutId = null;
    }, 5000);
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
