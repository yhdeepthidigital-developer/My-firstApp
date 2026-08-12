import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EmployeeService } from '../employee.service';

@Component({
  selector: 'app-employee-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './employee-login.component.html',
  styleUrls: ['./employee-login.component.scss']
})
export class EmployeeLoginComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeService);
  protected email = '';
  protected password = '';
  protected errorMessage = '';
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected login(): void {
    const employee = this.employeeService.employees().find((item) => item.email.toLowerCase() === this.email.trim().toLowerCase());
    if (employee && this.password === (employee.password ?? 'employee123')) {
      localStorage.setItem('userRole', 'employee');
      localStorage.setItem('employeeId', String(employee.id));
      localStorage.setItem('employeeName', employee.name);
      this.router.navigateByUrl('/employee-dashboard');
      return;
    }
    this.showError('Use an employee email and the employee portal password.');
  }

  ngOnDestroy(): void {
    this.clearError();
  }

  private showError(message: string): void {
    this.clearError();
    this.errorMessage = message;
    this.errorTimeoutId = setTimeout(() => {
      this.errorMessage = '';
      this.errorTimeoutId = null;
    }, 4000);
  }

  private clearError(): void {
    this.errorMessage = '';
    if (this.errorTimeoutId !== null) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = null;
    }
  }
}