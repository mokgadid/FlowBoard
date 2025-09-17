import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

interface AuthResponse {
  token: string;
  user: { id: string; username: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiBase = 'http://localhost:4000/api/auth';
  private tokenKey = 'flowboard_token';

  constructor(private http: HttpClient) {}

  register(payload: { username: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiBase}/register`, payload).pipe(
      tap((res) => this.setToken(res.token))
    );
  }

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiBase}/login`, payload).pipe(
      tap((res) => this.setToken(res.token))
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
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}


