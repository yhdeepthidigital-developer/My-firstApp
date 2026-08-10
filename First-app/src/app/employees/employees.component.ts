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

  protected readonly employees = this.employeeService.employees;
  protected filterStatus: string | null = null;
  protected editingId: number | null = null;
  protected errorMessage: WritableSignal<string> = signal('');
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

    this.clearError();

    const employeeToSave = this.editingId !== null
      ? this.form
      : { ...this.form, status: 'Active' as const };

    if (this.editingId !== null) {
      this.employeeService.updateEmployee(this.editingId, employeeToSave);
    } else {
      this.employeeService.addEmployee(employeeToSave);
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
  }
}
