import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FeedService } from '../services/feed.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity.component.html',
  styleUrls: ['./activity.component.css']
})
export class ActivityComponent implements OnInit, OnDestroy {
  // Completion percent drives the donut CSS variable --percent
  completionPercent = 68; // initial target percent; you can set this from data later
  private _current = 0; // animated current value

  private frameId?: number;
  private pollId?: any;
  private computeTickId?: any;
  private onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.loadTasks();
      this.computeInsights();
    }
  };

  // Backend data and computed insights
  // NOTE: apiBase is hard-coded for local dev. Consider moving to environment.ts
  // e.g., environment.apiBase = 'http://localhost:4000/api'
  private apiBase = 'http://localhost:4000/api';
  boards: any[] = [];
  selectedBoardId = '';
  tasks: any[] = [];
  completedCount = 0;
  uncompletedCount = 0;
  completedSharePercent = 0;   // for mini progress widths
  uncompletedSharePercent = 0; // for mini progress widths

  // Activity feed (in-memory)
  feedItems: Array<{
    id: string;
    kind: 'pending' | 'overdue';
    taskId: string;
    title: string;
    when: Date;
    message: string;
  }> = [];

  // Past-due by weekday for the most recent 7 days (Mon-Sun order)
  weekData: { label: string; count: number; percent: number }[] = [
    { label: 'Mon', count: 0, percent: 0 },
    { label: 'Tue', count: 0, percent: 0 },
    { label: 'Wed', count: 0, percent: 0 },
    { label: 'Thu', count: 0, percent: 0 },
    { label: 'Fri', count: 0, percent: 0 },
    { label: 'Sat', count: 0, percent: 0 },
    { label: 'Sun', count: 0, percent: 0 },
  ];

  constructor(private http: HttpClient, private router: Router, private feedSvc: FeedService) {}

  ngOnInit(): void {
    // Load boards and tasks, then compute insights
    this.loadBoards();
    // Periodic refresh to keep data fresh from backend
    // NOTE: 5s poll is a UX choice. For production, consider SSE/WebSocket or a larger interval
    this.pollId = setInterval(() => this.loadTasks(), 5000);
    // Periodic recompute using current tasks so time-based transitions (e.g., overdue at due time) reflect without fetch
    // NOTE: 2s compute tick ensures timely UI updates without requesting the server
    this.computeTickId = setInterval(() => this.computeInsights(), 2000);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    if (this.frameId) cancelAnimationFrame(this.frameId);
    if (this.pollId) clearInterval(this.pollId);
    if (this.computeTickId) clearInterval(this.computeTickId);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  // Public API to set the completion percentage programmatically
  setCompletion(target: number, durationMs = 1000) {
    target = Math.max(0, Math.min(100, Math.round(target)));
    this.animateTo(target, durationMs);
  }

  private animateTo(target: number, durationMs: number) {
    if (this.frameId) cancelAnimationFrame(this.frameId);
    const start = performance.now();
    const from = this._current;
    const delta = target - from;

    const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeInOutCubic(t);
      this._current = from + delta * eased;
      // Assign the rounded current value to the CSS-driven percent
      this.completionPercent = Math.max(0, Math.min(100, Math.round(this._current)));
      if (t < 1) {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    this.frameId = requestAnimationFrame(tick);
  }

  // ===== Data Loading =====
  private loadBoards(): void {
    this.http.get<any[]>(`${this.apiBase}/boards`, { headers: this.authHeaders() }).subscribe({
      next: (boards) => {
        this.boards = boards || [];
        if (!this.selectedBoardId && this.boards.length) {
          this.selectedBoardId = this.boards[0]._id;
        }
        this.loadTasks();
      },
      error: () => {
        // still try to compute with empty data
        this.computeInsights();
      }
    });
  }

  loadTasks(): void {
    // Aggregate across ALL boards for Activity insights; do not pass boardId filter
    // NOTE: If you want per-board Activity, add a toggle and include ?boardId
    this.http.get<any[]>(`${this.apiBase}/tasks`, { headers: this.authHeaders() }).subscribe({
      next: (tasks) => {
        this.tasks = tasks || [];
        this.computeInsights();
      },
      error: () => {
        // still try to compute with empty data
        this.tasks = [];
        this.computeInsights();
      }
    });
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('flowboard_token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  // ===== Computations for graphs =====
  private computeInsights(): void {
    const completed = this.tasks.filter(t => t.status === 'done').length;
    const uncompleted = this.tasks.length - completed; // todo + inprogress (and any others)
    this.completedCount = completed;
    this.uncompletedCount = Math.max(0, uncompleted);

    const denom = this.completedCount + this.uncompletedCount;
    const pct = denom > 0 ? Math.round((this.completedCount / denom) * 100) : 0;
    this.setCompletion(pct, 900);

    this.completedSharePercent = denom > 0 ? Math.round((this.completedCount / denom) * 100) : 0;
    this.uncompletedSharePercent = 100 - this.completedSharePercent;

    // Past-due buckets for last 7 days by weekday
    // NOTE: Window is fixed to 7 days (Mon–Sun). Make configurable if needed
    const now = new Date();
    // Start from Monday index 0 ... Sunday index 6 for display order
    const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7; // JS: Sun=0 -> 6

    const counts = new Array(7).fill(0);
    for (const t of this.tasks) {
      if (t.status === 'done') continue;
      if (!t.dueDate) continue;
      const due = new Date(t.dueDate);
      // Consider only items up to now
      if (isNaN(due.getTime())) continue;
      if (due <= now) {
        // if within last 7 days, count by its weekday
        const daysDiff = Math.floor((now.getTime() - new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()) / (24 * 3600 * 1000));
        if (daysDiff <= 6) {
          counts[weekdayIndex(due)] += 1;
        }
      }
    }
    const max = Math.max(1, ...counts);
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    this.weekData = counts.map((c, i) => ({ label: labels[i], count: c, percent: Math.round((c / max) * 100) }));

    // Rebuild feed after metrics
    this.buildFeed();
  }

  private buildFeed(): void {
    const now = new Date();
    const items: typeof this.feedItems = [];

    for (const t of this.tasks) {
      if (!t) continue;
      const title = t.title || 'Untitled';
      if (t.status !== 'done') {
        const created = t?.createdAt ? new Date(t.createdAt) : undefined;
        const due = t?.dueDate ? new Date(t.dueDate) : undefined;
        const isOverdue = !!(due && !isNaN(due.getTime()) && due <= now);
        const when = created && !isNaN(created.getTime()) ? created : (due && !isNaN(due.getTime()) ? due : now);
        const overdueSuffix = isOverdue && due ? ` It is overdue (due ${due.toLocaleDateString()} ${due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).` : '';
        items.push({
          id: `pending-${t._id}`,
          kind: 'pending',
          taskId: t._id,
          title,
          when,
          message: `Task "${title}" is pending.${overdueSuffix}`
        });
      }
    }

    // Sort by recency (most recent first) and limit to 30 items
    items.sort((a, b) => (b.when?.getTime?.() || 0) - (a.when?.getTime?.() || 0));
    this.feedItems = items.slice(0, 30);
    this.feedSvc.setCount(this.feedItems.length);
  }

  // Allow user to delete a feed item (in-memory only)
  deleteFeedItem(id: string): void {
    const item = this.feedItems.find(x => x.id === id);
    this.feedItems = this.feedItems.filter(x => x.id !== id);
    if (item?.taskId) this.feedSvc.addSuppressed(item.taskId);
    this.feedSvc.setCount(this.feedItems.length);
  }
}
