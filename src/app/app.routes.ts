import { Routes } from '@angular/router';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component'; 
import { DashboardComponent } from './dashboard/dashboard.component';
import { SettingsComponent } from './settings/settings.component';// Add this import
import { ActivityComponent } from './activity/activity.component';


export const routes: Routes = [
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
{path : 'activity', component: ActivityComponent}, // Add this route
  {path : 'settings', component: SettingsComponent}, // Add this route
  { path: 'home', component: HomeComponent }, // Add this route
  {path : 'dashboard', component: DashboardComponent}, // Add this route
  { path: '', redirectTo: 'register', pathMatch: 'full' }
];