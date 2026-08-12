import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmployeeService, NewTask, Task } from '../employee.service';

@Component({
  selector: 'app-task-assignment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-assignment.component.html',
  styleUrls: ['./task-assignment.component.scss']
})
export class TaskAssignmentComponent implements OnInit, OnDestroy {
  private readonly employeeService = inject(EmployeeService);
  private successTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private trackingTimerId: ReturnType<typeof setInterval> | null = null;
  protected readonly employees = this.employeeService.employees;
  protected readonly tasks = this.employeeService.tasks;
  protected errorMessage = '';
  protected readonly successMessage = signal('');
  protected now = Date.now();
  protected form: Omit<NewTask, 'status'> = {
    employeeId: 0,
    title: '',
    detail: '',
    dueDate: ''
  };

  protected getEmployeeName(employeeId: number): string {
    return this.employees().find((employee) => employee.id === employeeId)?.name ?? 'Unknown employee';
  }

  protected get employeeTaskCount(): number {
    return this.tasks().length;
  }

  protected get pendingTaskCount(): number {
    return this.tasks().filter((task) => task.status === 'Pending').length;
  }

  protected get activeTaskCount(): number {
    return this.tasks().filter((task) => task.status === 'In Progress').length;
  }

  protected get completedTaskCount(): number {
    return this.tasks().filter((task) => task.status === 'Completed').length;
  }

  protected get overdueTaskCount(): number {
    const today = new Date().toISOString().slice(0, 10);
    return this.tasks().filter((task) => task.status !== 'Completed' && task.dueDate < today).length;
  }

  protected getDueState(task: Task): 'overdue' | 'today' | 'upcoming' {
    if (task.status === 'Completed') return 'upcoming';
    const today = new Date().toISOString().slice(0, 10);
    if (task.dueDate < today) return 'overdue';
    if (task.dueDate === today) return 'today';
    return 'upcoming';
  }

  protected getDueLabel(task: Task): string {
    const dueState = this.getDueState(task);
    if (dueState === 'overdue') return 'Overdue';
    if (dueState === 'today') return 'Due today';
    return `Due ${task.dueDate}`;
  }

  protected getTaskDuration(task: Task): string {
    if (!task.startedAt) return 'Not started';
    const end = task.completedAt ? new Date(task.completedAt).getTime() : this.now;
    const minutes = task.durationMinutes ?? Math.max(0, Math.floor((end - new Date(task.startedAt).getTime()) / 60000));
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  protected assignTask(): void {
    this.errorMessage = '';
    this.successMessage.set('');
    if (!this.form.employeeId || !this.form.title.trim() || !this.form.dueDate) {
      this.showError('Choose an employee, add a task title, and select a due date.');
      return;
    }

    this.employeeService.addTask({ ...this.form, title: this.form.title.trim(), detail: this.form.detail.trim(), status: 'Pending' });
    this.successMessage.set(`Task assigned to ${this.getEmployeeName(this.form.employeeId)}.`);
    this.clearSuccessTimeout();
    this.successTimeoutId = setTimeout(() => {
      this.successMessage.set('');
      this.successTimeoutId = null;
    }, 4000);
    this.form = { employeeId: 0, title: '', detail: '', dueDate: '' };
  }

  ngOnDestroy(): void {
    this.clearSuccessTimeout();
    if (this.trackingTimerId !== null) clearInterval(this.trackingTimerId);
    if (this.errorTimeoutId !== null) clearTimeout(this.errorTimeoutId);
  }

  ngOnInit(): void {
    this.trackingTimerId = setInterval(() => this.now = Date.now(), 30000);
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
