import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  private readonly router = inject(Router);
  protected readonly title = signal('Employee Management');

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
