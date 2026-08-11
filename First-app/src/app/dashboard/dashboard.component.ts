import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmployeeService, Task } from '../employee.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  private readonly employeeService = inject(EmployeeService);
  protected readonly totals = this.employeeService.totals;
  protected readonly employees = this.employeeService.employees;
  protected readonly attendance = this.employeeService.attendance;
  protected readonly tasks = this.employeeService.tasks;
  protected readonly leaveRequests = this.employeeService.leaveRequests;

  protected readonly taskSummary = computed(() => {
    const currentTasks = this.tasks();
    return {
      total: currentTasks.length,
      pending: currentTasks.filter((task) => task.status === 'Pending').length,
      inProgress: currentTasks.filter((task) => task.status === 'In Progress').length,
      completed: currentTasks.filter((task) => task.status === 'Completed').length
    };
  });

  protected readonly latestAttendanceDate = computed(() => {
    return this.attendance().reduce((latest, record) => record.date > latest ? record.date : latest, '');
  });

  protected readonly latestAttendance = computed(() => {
    const latestDate = this.latestAttendanceDate();
    return this.attendance().filter((record) => record.date === latestDate);
  });

  protected readonly pendingLeaveCount = computed(() => this.leaveRequests().filter((request) => request.status === 'Pending').length);

  protected get recentTasks(): Task[] {
    return this.tasks().slice(-4).reverse();
  }

  protected getEmployeeName(employeeId: number): string {
    return this.employees().find((employee) => employee.id === employeeId)?.name ?? 'Unknown employee';
  }
}
