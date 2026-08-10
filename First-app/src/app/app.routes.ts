import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AttendanceListComponent } from './attendance/attendance-list.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EmployeeManagementComponent } from './employees/employees.component';
import { LeaveRequestsComponent } from './leave-requests/leave-requests.component';
import { LoginComponent } from './login/login.component';

const authGuard = () => {
  const router = inject(Router);
  const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';

  if (isLoggedIn) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
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
    path: '**',
    redirectTo: 'login'
  }
];
