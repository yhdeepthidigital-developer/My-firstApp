import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmployeeService, LeaveRequest, ShiftChangeDay, ShiftChangeRequest } from '../employee.service';

@Component({
  selector: 'app-leave-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leave-requests.component.html',
  styleUrls: ['./leave-requests.component.scss']
})
export class LeaveRequestsComponent implements OnDestroy {
  private readonly employeeService = inject(EmployeeService);
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private successTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected readonly requests = this.employeeService.leaveRequests;
  protected readonly shiftRequests = this.employeeService.shiftChangeRequests;

  protected readonly rejectingShift = signal<{ requestId: number; dayDate: string } | null>(null);
  protected readonly rejectionReasons = signal<Record<string, string>>({});
  protected readonly approvingDay = signal<{ requestId: number; dayDate: string } | null>(null);
  protected errorMessage = '';
  protected successMessage = '';

  protected approveRequest(request: LeaveRequest): void {
    this.updateStatus(request, 'Approved');
  }

  protected rejectRequest(request: LeaveRequest): void {
    this.updateStatus(request, 'Rejected');
  }

  protected getEmployeeName(employeeId: number): string {
    return this.employeeService.employees().find((employee) => employee.id === employeeId)?.name ?? 'Unknown Employee';
  }

  protected approveShiftDay(requestId: number, dayDate: string): void {
    this.shiftRequests.update((requests) =>
      requests.map((request) => {
        if (request.id !== requestId) return request;
        const days = request.days.map((day) =>
          day.date === dayDate ? { ...day, status: 'Approved' as const, rejectionReason: null } : day
        );
        return { ...request, days, status: this.deriveRequestStatus(days) };
      })
    );
    this.approvingDay.set(null);
    this.showSuccess('The shift change was approved for this date.');
  }

  protected toggleReject(requestId: number, dayDate: string): void {
    const current = this.rejectingShift();
    if (current?.requestId === requestId && current.dayDate === dayDate) {
      this.rejectingShift.set(null);
      return;
    }
    this.rejectingShift.set({ requestId, dayDate });
  }

  protected rejectShiftDay(requestId: number, dayDate: string): void {
    const reason = this.rejectionReasons()[this.reasonKey(requestId, dayDate)]?.trim();
    if (!reason) {
      this.showError('Please enter a reason for rejecting this shift change.');
      return;
    }

    this.shiftRequests.update((requests) =>
      requests.map((request) => {
        if (request.id !== requestId) return request;
        const days = request.days.map((day) =>
          day.date === dayDate ? { ...day, status: 'Rejected' as const, rejectionReason: reason } : day
        );
        return { ...request, days, status: this.deriveRequestStatus(days) };
      })
    );

    this.rejectionReasons.update((reasons) => {
      const next = { ...reasons };
      delete next[this.reasonKey(requestId, dayDate)];
      return next;
    });
    this.rejectingShift.set(null);
    this.approvingDay.set(null);
    this.showSuccess('The shift change request was rejected for this date.');
  }

  protected approveAllShiftDays(requestId: number): void {
    this.shiftRequests.update((requests) =>
      requests.map((request) => {
        if (request.id !== requestId) return request;
        const days = request.days.map((day) => ({ ...day, status: 'Approved' as const, rejectionReason: null }));
        return { ...request, days, status: 'Approved' };
      })
    );
    this.showSuccess('All requested shift change dates were approved.');
  }

  protected rejectAllShiftDays(requestId: number): void {
    this.shiftRequests.update((requests) =>
      requests.map((request) => {
        if (request.id !== requestId) return request;
        const days = request.days.map((day) => ({ ...day, status: 'Rejected' as const, rejectionReason: day.rejectionReason ?? 'Rejected by administrator.' }));
        return { ...request, days, status: 'Rejected' };
      })
    );
    this.showSuccess('The shift change request was rejected for all dates.');
  }

  protected updateRejectionReason(requestId: number, dayDate: string, value: string): void {
    this.rejectionReasons.update((reasons) => ({ ...reasons, [this.reasonKey(requestId, dayDate)]: value }));
  }

  protected cancelReject(): void {
    this.rejectingShift.set(null);
    this.approvingDay.set(null);
  }

  protected getRequestStatusClass(status: ShiftChangeRequest['status']): string {
    return status.toLowerCase();
  }

  protected getDayStatusClass(status: ShiftChangeDay['status']): string {
    return status.toLowerCase();
  }

  protected formatDate(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }

  private updateStatus(request: LeaveRequest, status: LeaveRequest['status']): void {
    this.requests.update((current) => current.map((item) => item.id === request.id ? { ...item, status } : item));
  }

  private reasonKey(requestId: number, dayDate: string): string {
    return `${requestId}:${dayDate}`;
  }

  private deriveRequestStatus(days: ShiftChangeDay[]): ShiftChangeRequest['status'] {
    if (!days.length) return 'Pending';
    if (days.every((day) => day.status === 'Approved')) return 'Approved';
    if (days.every((day) => day.status === 'Rejected')) return 'Rejected';
    return 'Pending';
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.clearSuccessTimeout();
    this.successTimeoutId = setTimeout(() => {
      this.successMessage = '';
      this.successTimeoutId = null;
    }, 4000);
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.clearErrorTimeout();
    this.errorTimeoutId = setTimeout(() => {
      this.errorMessage = '';
      this.errorTimeoutId = null;
    }, 4000);
  }

  private clearSuccessTimeout(): void {
    if (this.successTimeoutId !== null) {
      clearTimeout(this.successTimeoutId);
      this.successTimeoutId = null;
    }
  }

  private clearErrorTimeout(): void {
    if (this.errorTimeoutId !== null) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = null;
    }
  }

  ngOnDestroy(): void {
    this.clearSuccessTimeout();
    this.clearErrorTimeout();
  }
}
