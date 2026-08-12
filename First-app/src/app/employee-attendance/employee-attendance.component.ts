import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AttendanceRecord, EmployeeService, LeaveRequest } from '../employee.service';

@Component({
  selector: 'app-employee-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-attendance.component.html',
  styleUrls: ['./employee-attendance.component.scss']
})
export class EmployeeAttendanceComponent implements OnDestroy {
  private readonly employeeService = inject(EmployeeService);
  private successTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;
  protected readonly attendance = this.employeeService.attendance;
  protected readonly leaveRequests = this.employeeService.leaveRequests;
  protected readonly employeeId = Number(localStorage.getItem('employeeId'));
  protected selectedMonth = new Date().toISOString().slice(0, 7);
  protected readonly minLeaveDate = new Date().toISOString().slice(0, 10);
  protected startDate = '';
  protected endDate = '';
  protected reason = '';
  protected errorMessage = '';
  protected successMessage = '';

  protected get employeeName(): string {
    return this.employeeService.employees().find((employee) => employee.id === this.employeeId)?.name ?? 'Employee';
  }

  protected get filteredAttendance(): AttendanceRecord[] {
    return this.attendance()
      .filter((record) => record.employeeId === this.employeeId && record.date.startsWith(this.selectedMonth))
      .sort((first, second) => second.date.localeCompare(first.date));
  }

  protected get presentCount(): number {
    return this.filteredAttendance.filter((record) => record.status === 'Present').length;
  }

  protected get lateCount(): number {
    return this.filteredAttendance.filter((record) => record.status === 'Late').length;
  }

  protected get leaveRequestsForEmployee(): LeaveRequest[] {
    return this.leaveRequests()
      .filter((request) => request.employeeId === this.employeeId)
      .sort((first, second) => second.startDate.localeCompare(first.startDate));
  }

  protected applyLeave(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.startDate || !this.endDate || !this.reason.trim()) {
      this.showError('Choose the leave dates and add a reason.');
      return;
    }
    if (this.startDate < this.minLeaveDate) {
      this.showError('Leave requests can start only from today.');
      return;
    }
    if (this.endDate < this.startDate) {
      this.showError('The end date must be on or after the start date.');
      return;
    }

    this.leaveRequests.update((current) => [...current, {
      id: Date.now(),
      employeeId: this.employeeId,
      employeeName: this.employeeName,
      startDate: this.startDate,
      endDate: this.endDate,
      reason: this.reason.trim(),
      status: 'Pending'
    }]);
    this.employeeService.markNotificationsUnread();
    this.startDate = '';
    this.endDate = '';
    this.reason = '';
    this.successMessage = 'Leave request submitted for admin review.';
    this.clearSuccessTimeout();
    this.successTimeoutId = setTimeout(() => {
      this.successMessage = '';
      this.successTimeoutId = null;
    }, 4000);
  }

  protected getStatusClass(status: AttendanceRecord['status']): string {
    return status.toLowerCase();
  }

  ngOnDestroy(): void {
    this.clearSuccessTimeout();
    if (this.errorTimeoutId !== null) clearTimeout(this.errorTimeoutId);
  }

  private clearSuccessTimeout(): void {
    if (this.successTimeoutId !== null) {
      clearTimeout(this.successTimeoutId);
      this.successTimeoutId = null;
    }
  }

  private showError(message: string): void {
    this.errorMessage = message;
    if (this.errorTimeoutId !== null) clearTimeout(this.errorTimeoutId);
    this.errorTimeoutId = setTimeout(() => { this.errorMessage = ''; this.errorTimeoutId = null; }, 4000);
  }
}
