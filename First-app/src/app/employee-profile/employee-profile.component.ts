import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Employee, EmployeeService } from '../employee.service';

@Component({
  selector: 'app-employee-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-profile.component.html',
  styleUrls: ['./employee-profile.component.scss']
})
export class EmployeeProfileComponent {
  private readonly employeeService = inject(EmployeeService);
  protected readonly employeeId = Number(localStorage.getItem('employeeId'));
  protected errorMessage = '';
  protected successMessage = '';
  protected newPassword = '';
  protected confirmPassword = '';
  protected showPasswordFields = false;
  protected showShiftRequest = false;
  protected requestedShiftStart = '';
  protected requestedShiftEnd = '';
  protected shiftRequestReason = '';
  private successTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected get employee(): Employee | undefined {
    return this.employeeService.employees().find((item) => item.id === this.employeeId);
  }

  protected get form(): Employee | undefined {
    return this.employee;
  }

  protected get isBirthdayToday(): boolean {
    const birthDate = this.employee?.birthDate;
    if (!birthDate) return false;
    const birthday = new Date(birthDate);
    const today = new Date();
    return birthday.getMonth() === today.getMonth() && birthday.getDate() === today.getDate();
  }

  protected saveProfile(): void {
    const employee = this.employee;
    if (!employee) return;

    this.errorMessage = '';
    this.successMessage = '';
    if (!employee.email.trim() || !this.isValidEmail(employee.email)) {
      this.showError('Enter a valid work email.');
      return;
    }
    if (!employee.phone?.trim()) {
      this.showError('Enter a phone number.');
      return;
    }
    if (this.newPassword && this.newPassword.length < 8) {
      this.showError('Your new password must be at least 8 characters.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.showError('The password confirmation does not match.');
      return;
    }

    this.employeeService.updateEmployee(employee.id, {
      name: employee.name,
      role: employee.role,
      department: employee.department,
      email: employee.email.trim(),
      phone: employee.phone.trim(),
      password: this.newPassword || employee.password || 'employee123',
      birthDate: employee.birthDate,
      shiftStart: employee.shiftStart,
      shiftEnd: employee.shiftEnd,
      status: employee.status
    });
    localStorage.setItem('employeeName', employee.name);
    this.newPassword = '';
    this.confirmPassword = '';
    this.showPasswordFields = false;
    this.successMessage = 'Profile updated successfully.';
    this.clearSuccessTimeout();
    this.successTimeoutId = setTimeout(() => {
      this.successMessage = '';
      this.successTimeoutId = null;
    }, 4000);
  }

  ngOnDestroy(): void {
    this.clearSuccessTimeout();
    this.clearErrorTimeout();
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  private clearSuccessTimeout(): void {
    if (this.successTimeoutId !== null) {
      clearTimeout(this.successTimeoutId);
      this.successTimeoutId = null;
    }
  }

  protected requestShiftChange(): void {
    const employee = this.employee;
    if (!employee) return;
    if (!this.requestedShiftStart || !this.requestedShiftEnd || !this.shiftRequestReason.trim()) {
      this.showError('Select the requested shift times and provide a reason.');
      return;
    }
    this.employeeService.shiftChangeRequests.update((current) => [...current, {
      id: Date.now(), employeeId: employee.id, employeeName: employee.name,
      currentShift: `${employee.shiftStart || '09:00'}-${employee.shiftEnd || '18:00'}`,
      requestedStart: this.requestedShiftStart, requestedEnd: this.requestedShiftEnd,
      reason: this.shiftRequestReason.trim(), status: 'Pending'
    }]);
    this.employeeService.markNotificationsUnread();
    this.requestedShiftStart = ''; this.requestedShiftEnd = ''; this.shiftRequestReason = ''; this.showShiftRequest = false;
    this.successMessage = 'Shift change request sent to your administrator.';
    this.clearSuccessTimeout();
    this.successTimeoutId = setTimeout(() => this.successMessage = '', 4000);
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.clearErrorTimeout();
    this.errorTimeoutId = setTimeout(() => {
      this.errorMessage = '';
      this.errorTimeoutId = null;
    }, 4000);
  }

  private clearErrorTimeout(): void {
    if (this.errorTimeoutId !== null) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = null;
    }
  }
}
