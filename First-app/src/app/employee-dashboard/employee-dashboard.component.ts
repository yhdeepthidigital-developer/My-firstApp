import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AttendanceRecord, EmployeeService } from '../employee.service';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './employee-dashboard.component.html',
  styleUrls: ['./employee-dashboard.component.scss']
})
export class EmployeeDashboardComponent implements OnInit, OnDestroy {
  private readonly employeeService = inject(EmployeeService);
  protected readonly attendance = this.employeeService.attendance;
  protected readonly employee = this.employeeService.employees;
  protected employeeId = Number(localStorage.getItem('employeeId'));
  protected readonly now = signal(Date.now());
  private readonly localSessionStart = signal<string | null>(null);
  private timerId: ReturnType<typeof setInterval> | null = null;

  protected get currentRecord(): AttendanceRecord | undefined {
    const today = new Date().toISOString().slice(0, 10);
    const record = this.attendance().find((item) => item.employeeId === this.employeeId && item.date === today);
    if (record) return record;
    const shiftStart = this.employeeDetails?.shiftStart ?? '09:00';
    const [hours, minutes] = shiftStart.split(':').map(Number);
    const cutoff = new Date();
    cutoff.setHours(hours, minutes + 15, 0, 0);
    return new Date() > cutoff
      ? { id: 0, employeeId: this.employeeId, date: today, status: 'Absent', clockIn: null, clockOut: null }
      : undefined;
  }

  protected get employeeDetails() { return this.employee().find((item) => item.id === this.employeeId); }
  protected get isBirthdayToday(): boolean {
    const birthDate = this.employeeDetails?.birthDate;
    if (!birthDate) return false;
    const birthday = new Date(birthDate);
    const today = new Date();
    return birthday.getMonth() === today.getMonth() && birthday.getDate() === today.getDate();
  }
  protected get isClockedIn(): boolean { return !!this.currentRecord?.clockIn && !this.currentRecord.clockOut; }
  protected get elapsedSeconds(): number {
    if (!this.currentRecord?.clockIn) return 0;
    const start = this.localSessionStart() ?? this.currentRecord.clockIn;
    const end = this.currentRecord.clockOut ? new Date(this.currentRecord.clockOut).getTime() : this.now();
    return Math.max(0, Math.floor((end - new Date(start).getTime()) / 1000));
  }
  protected clock(): void {
    const clockIn = !this.isClockedIn;
    const timestamp = new Date().toISOString();
    this.now.set(Date.now());
    this.localSessionStart.set(clockIn ? timestamp : null);
    this.employeeService.clock(this.employeeId, clockIn);
  }
  protected formatElapsedTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  ngOnInit(): void { this.timerId = setInterval(() => this.now.set(Date.now()), 1000); }
  ngOnDestroy(): void { if (this.timerId) clearInterval(this.timerId); }
}
