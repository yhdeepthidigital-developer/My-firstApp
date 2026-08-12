import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AttendanceListComponent } from './attendance/attendance-list.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EmployeeManagementComponent } from './employees/employees.component';
import { LeaveRequestsComponent } from './leave-requests/leave-requests.component';
import { LoginComponent } from './login/login.component';
import { EmployeeDashboardComponent } from './employee-dashboard/employee-dashboard.component';
import { TasksComponent } from './tasks/tasks.component';
import { TaskAssignmentComponent } from './task-assignment/task-assignment.component';
import { EmployeeAttendanceComponent } from './employee-attendance/employee-attendance.component';
import { EmployeeProfileComponent } from './employee-profile/employee-profile.component';

const authGuard = () => {
  const router = inject(Router);
  const isLoggedIn = localStorage.getItem('userRole') === 'admin' || localStorage.getItem('adminLoggedIn') === 'true';

  if (isLoggedIn) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

const employeeGuard = () => {
  const router = inject(Router);
  if (localStorage.getItem('userRole') === 'employee') return true;
  router.navigate(['/login']);
  return false;
};

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  { path: 'employee-login', redirectTo: 'login', pathMatch: 'full' },
  {
    path: '',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'employees',
    component: EmployeeManagementComponent,
    canActivate: [authGuard]
  },
  {
    path: 'attendance',
    component: AttendanceListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'leave-requests',
    component: LeaveRequestsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'task-assignment',
    component: TaskAssignmentComponent,
    canActivate: [authGuard]
  },
  { path: 'employee-dashboard', component: EmployeeDashboardComponent, canActivate: [employeeGuard] },
  { path: 'employee-attendance', component: EmployeeAttendanceComponent, canActivate: [employeeGuard] },
    { path: 'employee-profile', component: EmployeeProfileComponent, canActivate: [employeeGuard] },
  { path: 'tasks', component: TasksComponent, canActivate: [employeeGuard] },
  {
    path: '**',
    redirectTo: 'login'
  }
];
