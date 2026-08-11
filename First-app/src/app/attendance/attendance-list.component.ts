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
  protected employeeNameFilter = '';
  protected dateFilter = '';
  protected statusFilter = '';

  protected getEmployeeName(employeeId: number): string {
    return this.employeeService.employees().find((employee) => employee.id === employeeId)?.name ?? 'Unknown Employee';
  }

  protected get filteredAttendance() {
    const name = this.employeeNameFilter.trim().toLowerCase();
    const date = this.dateFilter;
    const status = this.statusFilter;

    return this.attendance().filter((record) => {
      const employeeName = this.getEmployeeName(record.employeeId).toLowerCase();
      const matchesName = !name || employeeName.includes(name);
      const matchesDate = !date || record.date === date;
      const matchesStatus = !status || record.status === status;

      return matchesName && matchesDate && matchesStatus;
    });
  }
}
