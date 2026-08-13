import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
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
  private readonly currentUrl = signal(this.router.url);

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.currentUrl.set(this.router.url));
  }

  protected openNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) this.employeeService.markNotificationsRead();
  }

  private get isAuthRoute(): boolean {
    const url = this.currentUrl().split('?')[0];
    return url === '/login' || url === '/employee-login';
  }

  protected get isLoggedIn(): boolean {
    if (this.isAuthRoute) return false;
    return localStorage.getItem('userRole') === 'admin' || localStorage.getItem('adminLoggedIn') === 'true';
  }

  protected get isEmployee(): boolean {
    if (this.isAuthRoute) return false;
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
