import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../employee.service';

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

@Component({
  selector: 'app-leave-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leave-requests.component.html',
  styleUrls: ['./leave-requests.component.scss']
})
export class LeaveRequestsComponent {
  private readonly employeeService = inject(EmployeeService);

  protected requests: LeaveRequest[] = [
    {
      id: 1,
      employeeId: 4,
      employeeName: 'Liam Phillips',
      startDate: '2026-08-10',
      endDate: '2026-08-12',
      reason: 'Medical appointment',
      status: 'Pending'
    },
    {
      id: 2,
      employeeId: 2,
      employeeName: 'Noah Brooks',
      startDate: '2026-08-15',
      endDate: '2026-08-16',
      reason: 'Personal work',
      status: 'Pending'
    }
  ];

  protected approveRequest(request: LeaveRequest): void {
    request.status = 'Approved';
  }

  protected rejectRequest(request: LeaveRequest): void {
    request.status = 'Rejected';
  }

  protected getEmployeeName(employeeId: number): string {
    return this.employeeService.employees().find((employee) => employee.id === employeeId)?.name ?? 'Unknown Employee';
  }
}
