import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private readonly router = inject(Router);

  protected email = '';
  protected password = '';
  protected errorMessage = '';

  protected login(): void {
    if (this.email.trim() === 'admin@company.com' && this.password.trim() === 'admin123') {
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('adminLoggedIn', 'true');
      this.router.navigateByUrl('/');
      return;
    }

    this.errorMessage = 'Invalid admin credentials.';
  }
}
