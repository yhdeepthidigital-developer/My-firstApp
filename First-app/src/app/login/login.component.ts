import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EmployeeService } from '../employee.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeService);

  protected email = '';
  protected password = '';
  protected errorMessage = '';
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected login(): void {
    this.clearError();
    const email = this.email.trim().toLowerCase();
    const password = this.password;

    if (email === 'admin@company.com' && password === 'admin123') {
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('adminLoggedIn', 'true');
      localStorage.removeItem('employeeId');
      localStorage.removeItem('employeeName');
      this.router.navigateByUrl('/');
      return;
    }

    const employee = this.employeeService.employees().find((item) =>
      item.email.toLowerCase() === email
    );
    if (employee && password === (employee.password || 'employee123')) {
      localStorage.setItem('userRole', 'employee');
      localStorage.removeItem('adminLoggedIn');
      localStorage.setItem('employeeId', String(employee.id));
      localStorage.setItem('employeeName', employee.name);
      this.router.navigateByUrl('/employee-dashboard');
      return;
    }

    this.errorMessage = 'Invalid email or password.';
    this.errorTimeoutId = setTimeout(() => {
      this.errorMessage = '';
      this.errorTimeoutId = null;
    }, 4000);
  }

  ngOnDestroy(): void { this.clearError(); }

  private clearError(): void {
    this.errorMessage = '';
    if (this.errorTimeoutId !== null) { clearTimeout(this.errorTimeoutId); this.errorTimeoutId = null; }
  }
}
