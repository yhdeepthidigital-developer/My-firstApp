import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmployeeService, Task } from '../employee.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnDestroy {
  private readonly employeeService = inject(EmployeeService);
  private uploadMessageTimeoutId: ReturnType<typeof setTimeout> | null = null;
  protected readonly tasks = this.employeeService.tasks;
  protected readonly employeeId = Number(localStorage.getItem('employeeId'));
  protected uploadMessage = '';

  protected get assignedTasks(): Task[] {
    return this.tasks().filter((task) => task.employeeId === this.employeeId);
  }

  protected get completedCount(): number {
    return this.assignedTasks.filter((task) => task.status === 'Completed').length;
  }

  protected get inProgressCount(): number {
    return this.assignedTasks.filter((task) => task.status === 'In Progress').length;
  }

  protected get pendingCount(): number {
    return this.assignedTasks.filter((task) => task.status === 'Pending').length;
  }

  protected get attentionCount(): number {
    return this.assignedTasks.filter((task) => task.status !== 'Completed' && this.getDueState(task) !== 'upcoming').length;
  }

  protected get nextTask(): Task | undefined {
    return this.assignedTasks.find((task) => task.status !== 'Completed');
  }

  protected get completionPercent(): number {
    return this.assignedTasks.length ? Math.round((this.completedCount / this.assignedTasks.length) * 100) : 0;
  }

  protected getDueState(task: Task): 'overdue' | 'today' | 'upcoming' {
    if (task.status === 'Completed') return 'upcoming';
    const today = new Date().toISOString().slice(0, 10);
    if (task.dueDate < today) return 'overdue';
    if (task.dueDate === today) return 'today';
    return 'upcoming';
  }

  protected formatDueDate(task: Task): string {
    const dueState = this.getDueState(task);
    if (dueState === 'overdue') return 'Overdue';
    if (dueState === 'today') return 'Due today';
    return `Due ${task.dueDate}`;
  }

  protected setStatus(task: Task, status: Task['status']): void {
    this.employeeService.updateTask(task.id, status, task.attachmentName, task.attachmentData);
  }

  protected onFileSelected(task: Task, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && file.size > 5 * 1024 * 1024) {
      this.uploadMessage = 'Files must be 5 MB or smaller.';
      input.value = '';
      return;
    }
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.employeeService.updateTask(task.id, task.status, file.name, String(reader.result));
      this.uploadMessage = `${file.name} uploaded for ${task.title}.`;
      this.clearUploadMessageTimeout();
      this.uploadMessageTimeoutId = setTimeout(() => {
        this.uploadMessage = '';
        this.uploadMessageTimeoutId = null;
      }, 4000);
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  ngOnDestroy(): void {
    this.clearUploadMessageTimeout();
  }

  private clearUploadMessageTimeout(): void {
    if (this.uploadMessageTimeoutId !== null) {
      clearTimeout(this.uploadMessageTimeoutId);
      this.uploadMessageTimeoutId = null;
    }
  }
}
