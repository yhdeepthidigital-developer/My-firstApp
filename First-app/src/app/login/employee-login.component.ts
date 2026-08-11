import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
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
export class EmployeeLoginComponent {
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeService);
  protected email = '';
  protected password = '';
  protected errorMessage = '';

  protected login(): void {
    const employee = this.employeeService.employees().find((item) => item.email.toLowerCase() === this.email.trim().toLowerCase());
    if (employee && this.password.trim() === 'employee123') {
      localStorage.setItem('userRole', 'employee');
      localStorage.setItem('employeeId', String(employee.id));
      localStorage.setItem('employeeName', employee.name);
      this.router.navigateByUrl('/employee-dashboard');
      return;
    }
    this.errorMessage = 'Use an employee email and the employee portal password.';
  }
}
