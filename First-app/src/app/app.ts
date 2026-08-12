import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EmployeeService } from './employee.service';

@Component({
  selector: 'app-root',
  imports: [DatePipe, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeService);
  protected readonly title = signal('Employee Management');
  protected readonly today = new Date();
  protected readonly notificationCount = this.employeeService.pendingNotificationCount;
  protected readonly leaveRequests = this.employeeService.leaveRequests;
  protected readonly shiftRequests = this.employeeService.shiftChangeRequests;
  protected notificationsOpen = false;

  protected openNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) this.employeeService.markNotificationsRead();
  }

  protected get isLoggedIn(): boolean {
    return localStorage.getItem('userRole') === 'admin' || localStorage.getItem('adminLoggedIn') === 'true';
  }

  protected get isEmployee(): boolean {
    return localStorage.getItem('userRole') === 'employee';
  }

  protected get employeeName(): string {
    return localStorage.getItem('employeeName') ?? 'Employee';
  }

  protected logout(): void {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('employeeId');
    localStorage.removeItem('employeeName');
    this.router.navigateByUrl('/login');
  }
}
