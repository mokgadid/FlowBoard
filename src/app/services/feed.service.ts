import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class FeedService {
  private _count = new BehaviorSubject<number>(0);
  readonly count$: Observable<number> = this._count.asObservable();

  private apiBase = 'http://localhost:4000/api';
  private sub?: Subscription;
  private suppressed = new Set<string>(); // taskIds suppressed by user deletion in UI

  constructor(private http: HttpClient, private auth: AuthService) {}

  start(): void {
    if (this.sub) return; // already started
    this.sub = interval(5000).subscribe(() => this.refresh());
    // kick off immediately
    this.refresh();
  }

  stop(): void {
    this.sub?.unsubscribe();
    this.sub = undefined;
  }

  addSuppressed(taskId: string): void {
    if (taskId) {
      this.suppressed.add(taskId);
      // immediately reflect suppression in count
      this.refresh();
    }
  }

  clearSuppressed(taskId?: string): void {
    if (taskId) this.suppressed.delete(taskId);
    else this.suppressed.clear();
  }

  setCount(n: number): void {
    if (typeof n !== 'number' || isNaN(n) || n < 0) n = 0;
    this._count.next(n);
  }

  private authHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  refresh(): void {
    this.http.get<any[]>(`${this.apiBase}/tasks`, { headers: this.authHeaders() }).subscribe({
      next: (tasks) => {
        const pending = (tasks || []).filter(t => t && t.status !== 'done');
        const effective = pending.filter(t => !this.suppressed.has(t._id));
        this.setCount(effective.length);
      },
      error: () => {
        // On error, do not drop count abruptly; keep last value
      }
    });
  }
}
