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
    return localStorage.getItem('adminLoggedIn') === 'true';
  }

  protected logout(): void {
    localStorage.removeItem('adminLoggedIn');
    this.router.navigateByUrl('/login');
  }
}
