import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  // Form fields
  username = '';
  email = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  isSaving = false;
  message: string | null = null;
  messageKind: 'success' | 'danger' | null = null;

  constructor(private router: Router, private auth: AuthService) {
    const me = this.auth.getUser();
    if (me) {
      this.username = me.username;
      this.email = me.email;
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  save(): void {
    this.message = null;
    this.messageKind = null;

    // Basic validation
    if (!this.username || !this.email) {
      this.showMsg('Username and Email are required', 'danger');
      return;
    }
    if (this.newPassword || this.confirmPassword) {
      if (this.newPassword !== this.confirmPassword) {
        this.showMsg('New password and confirmation do not match', 'danger');
        return;
      }
      if (this.newPassword.length < 6) {
        this.showMsg('New password must be at least 6 characters', 'danger');
        return;
      }
    }

    const payload: { username?: string; email?: string; password?: string } = {};
    payload.username = this.username.trim();
    payload.email = this.email.trim();
    if (this.newPassword) payload.password = this.newPassword;

    this.isSaving = true;
    this.auth.updateProfile(payload).subscribe({
      next: (res) => {
        // AuthService already stores new token and user
        this.isSaving = false;
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.showMsg('Profile updated. You are now logged in with the new details.', 'success');
      },
      error: (err) => {
        this.isSaving = false;
        const msg = err?.error?.message || 'Failed to update profile';
        this.showMsg(msg, 'danger');
      }
    });
  }

  private showMsg(msg: string, kind: 'success' | 'danger') {
    this.message = msg;
    this.messageKind = kind;
    setTimeout(() => {
      this.message = null;
      this.messageKind = null;
    }, 2500);
  }
}
