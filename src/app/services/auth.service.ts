import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

interface AuthResponse {
  token: string;
  user: { id: string; username: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiBase = 'http://localhost:4000/api/auth';
  private tokenKey = 'flowboard_token';
  private userKey = 'flowboard_user';

  constructor(private http: HttpClient) {}

  register(payload: { username: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiBase}/register`, payload).pipe(
      tap((res) => { this.setToken(res.token); this.setUser(res.user); })
    );
  }

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiBase}/login`, payload).pipe(
      tap((res) => { this.setToken(res.token); this.setUser(res.user); })
    );
  }

  updateProfile(payload: { username?: string; email?: string; password?: string }): Observable<AuthResponse> {
    const token = this.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    return this.http.put<AuthResponse>(`${this.apiBase}/update`, payload, { headers }).pipe(
      tap((res) => { this.setToken(res.token); this.setUser(res.user); })
    );
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  clear(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  setUser(user: { id: string; username: string; email: string } | null): void {
    if (user) localStorage.setItem(this.userKey, JSON.stringify(user));
    else localStorage.removeItem(this.userKey);
  }

  getUser(): { id: string; username: string; email: string } | null {
    const raw = localStorage.getItem(this.userKey);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
}


