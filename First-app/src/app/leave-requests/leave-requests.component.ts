import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmployeeService, LeaveRequest } from '../employee.service';

@Component({
  selector: 'app-leave-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leave-requests.component.html',
  styleUrls: ['./leave-requests.component.scss']
})
export class LeaveRequestsComponent {
  private readonly employeeService = inject(EmployeeService);

  protected readonly requests = this.employeeService.leaveRequests;

  protected approveRequest(request: LeaveRequest): void {
    this.updateStatus(request, 'Approved');
  }

  protected rejectRequest(request: LeaveRequest): void {
    this.updateStatus(request, 'Rejected');
  }

  protected getEmployeeName(employeeId: number): string {
    return this.employeeService.employees().find((employee) => employee.id === employeeId)?.name ?? 'Unknown Employee';
  }

  private updateStatus(request: LeaveRequest, status: LeaveRequest['status']): void {
    this.requests.update((current) => current.map((item) => item.id === request.id ? { ...item, status } : item));
  }
}
