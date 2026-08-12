import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../employee.service';

@Component({
  selector: 'app-attendance-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-list.component.html',
  styleUrls: ['./attendance-list.component.scss']
})
export class AttendanceListComponent {
  private readonly employeeService = inject(EmployeeService);
  protected readonly attendance = this.employeeService.attendance;
  protected readonly employees = this.employeeService.employees;
  protected employeeIdFilter: number | null = null;
  protected statusFilter = '';
  protected dateFilter = '';
  protected monthFilter = '';

  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly currentMonth = this.today.slice(0, 7);

  protected get baseAttendance() {
    const date = this.dateFilter;
    const month = this.monthFilter;

    return this.attendance().filter((record) => {
      const matchesDate = !date || record.date === date;
      const matchesMonth = !month || record.date.startsWith(month);
      return matchesDate && matchesMonth;
    });
  }

  protected getEmployeeName(employeeId: number): string {
    return this.employeeService.employees().find((employee) => employee.id === employeeId)?.name ?? 'Unknown Employee';
  }

  protected get filteredAttendance() {
    const employeeId = this.employeeIdFilter;
    const status = this.statusFilter;

    return this.baseAttendance.filter((record) => {
      const matchesEmployee = !employeeId || record.employeeId === employeeId;
      const matchesStatus = !status || record.status === status;

      return matchesEmployee && matchesStatus;
    });
  }

  protected get presentCount(): number {
    return this.baseAttendance.filter((record) => record.status === 'Present' || record.status === 'Late' || record.status === 'Half Day').length;
  }

  protected get absentCount(): number {
    return this.baseAttendance.filter((record) => record.status === 'Absent').length;
  }

  protected clearFilters(): void {
    this.employeeIdFilter = null;
    this.statusFilter = '';
    this.dateFilter = '';
    this.monthFilter = '';
  }

  protected onDateChange(date: string): void {
    this.dateFilter = date;
    if (date) {
      this.monthFilter = date.slice(0, 7);
    }
  }

  protected onMonthChange(month: string): void {
    this.monthFilter = month;
    if (month) {
      this.dateFilter = '';
    }
  }
}