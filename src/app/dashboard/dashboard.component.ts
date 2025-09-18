import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FeedService } from '../services/feed.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  tasks: any[] = [];
  boards: any[] = [];
  selectedBoardId: string = '';
  newBoardName: string = '';
  // NOTE: Hard-coded API base for local dev; consider moving to environment.ts
  // e.g., environment.apiBase = 'http://localhost:4000/api'
  private apiBase = 'http://localhost:4000/api';
  isLoadingBoard: boolean = false;
  toastMessage: string | null = null;
  toastKind: 'success' | 'danger' | null = null;
  private toastTimer: any; // NOTE: used with a fixed 2000ms toast duration below
  showBalloon: boolean = false;
  showBalloonMessage: boolean = false;
  private pendingPayload: any | null = null;

  feedCount$: Observable<number>;

  constructor(private http: HttpClient, private router: Router, private feedSvc: FeedService) { 
    this.feedCount$ = this.feedSvc.count$;
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  navigateToHome(): void {
    this.router.navigate(['/home']);
  }

  ngOnInit(): void {
    this.loadBoards();
    // ensure global feed counter starts polling immediately
    this.feedSvc.start();
  }

  loadBoards(): void {
    this.http.get<any[]>(`${this.apiBase}/boards`, { headers: this.authHeaders() }).subscribe((data) => {
      this.boards = data;
      if (!this.selectedBoardId && this.boards.length) {
        this.selectedBoardId = this.boards[0]._id;
      }
      this.loadTasks();
    });
  }

  loadTasks(): void {
    const params = this.selectedBoardId ? `?boardId=${this.selectedBoardId}` : '';
    this.isLoadingBoard = true;
    this.http.get<any[]>(`${this.apiBase}/tasks${params}`, { headers: this.authHeaders() }).subscribe((data) => {
      this.tasks = data;
      setTimeout(() => (this.isLoadingBoard = false), 2000);
    }, () => {
      setTimeout(() => (this.isLoadingBoard = false), 2000);
    });
  }

  // Convenience getters to use in template instead of inline .filter()
  get todoTasks() {
    return this.tasks.filter((x) => x.status === 'todo');
  }

  get inProgressTasks() {
    return this.tasks.filter((x) => x.status === 'inprogress');
  }

  get doneTasks() {
    return this.tasks.filter((x) => x.status === 'done');
  }

  // Simple create bound to the To Do column inputs
  newTitle = '';
  newLabel = 'work';
  newDueDate: string = '';
  newDueTime: string = '';
  today: string = this.formatDate(new Date());

  createTask(): void {
    // Build ISO datetime if a date is selected (combine with time if provided)
    let dueDateIso: string | undefined = undefined;
    if (this.newDueDate) {
      const time = this.newDueTime && /^\d{2}:\d{2}$/.test(this.newDueTime) ? this.newDueTime : '00:00';
      // Use local time composition for clarity; backend stores as Date
      dueDateIso = `${this.newDueDate}T${time}:00`;
    }

    const payload = {
      title: this.newTitle,
      label: this.newLabel,
      dueDate: dueDateIso,
      status: 'todo',
      boardId: this.selectedBoardId || undefined
    };
    if (!payload.title) return;
    // prevent past due date/time
    if (dueDateIso) {
      const selected = new Date(dueDateIso);
      const now = new Date();
      if (selected.getTime() < now.getTime()) {
        this.showToast('Due date/time cannot be in the past', 'danger');
        return;
      }
    }
    // hold payload until user pops the balloon
    this.pendingPayload = payload;
    this.triggerBalloon();
  }

  createBoard(): void {
    const name = this.newBoardName.trim();
    if (!name) return;
    this.http.post<any>(`${this.apiBase}/boards`, { name }, { headers: this.authHeaders() }).subscribe({
      next: (board) => {
        this.newBoardName = '';
        this.boards.push(board);
        this.selectedBoardId = board._id;
        this.loadTasks();
        this.showToast('Board created', 'success');
      },
      error: (err) => {
        if (err?.status === 409) this.showToast('Board already exists', 'danger');
        else this.showToast('Failed to create board', 'danger');
      }
    });
  }

  deleteBoard(id: string): void {
    if (!confirm('Delete this board? This will not delete tasks in this demo.')) return;
    this.http.delete(`${this.apiBase}/boards/${id}`, { headers: this.authHeaders() }).subscribe({
      next: () => {
        this.boards = this.boards.filter(b => b._id !== id);
        if (this.selectedBoardId === id) {
          this.selectedBoardId = this.boards[0]?._id || '';
          this.loadTasks();
        }
        this.showToast('Board deleted', 'success');
      },
      error: () => this.showToast('Failed to delete board', 'danger')
    });
  }

  deleteTask(id: string): void {
    this.http.delete(`${this.apiBase}/tasks/${id}`, { headers: this.authHeaders() }).subscribe({
      next: () => {
        this.loadTasks();
        this.showToast('Task successfully deleted', 'danger');
        // update feed counter as pending items may reduce
        this.feedSvc.refresh();
      },
      error: () => this.showToast('Failed to delete task', 'danger')
    });
  }

  onDragStart(event: DragEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const draggableCard = target.closest('.task-card') as HTMLElement | null;
    if (!draggableCard) return;
    if (event.dataTransfer) {
      // ensure a stable id using the data-task-id
      const taskId = draggableCard.getAttribute('data-task-id');
      if (taskId) draggableCard.id = `task-${taskId}`;
      else if (!draggableCard.id) draggableCard.id = 'task-' + Math.random().toString(36).slice(2);
      event.dataTransfer.setData('text/plain', draggableCard.id);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const dropTarget = (event.target as HTMLElement | null);
    const dropZone = dropTarget?.closest('.dropzone') as HTMLElement | null;
    if (!dropZone) return;

    const draggedId = event.dataTransfer?.getData('text/plain');
    if (!draggedId) return;
    const draggedEl = document.getElementById(draggedId);
    if (!draggedEl) return;

    // If column is empty and has a placeholder, replace it so the card lands right on the text
    const placeholder = dropZone.querySelector('.drop-placeholder') as HTMLElement | null;
    if (placeholder) {
      dropZone.replaceChild(draggedEl, placeholder);
      this.persistStatusChange(draggedEl, dropZone);
      return;
    }

    // If dropped on a task card, insert before it; otherwise append to the zone
    const maybeCard = dropTarget?.closest('.task-card') as HTMLElement | null;
    if (maybeCard && maybeCard.parentElement === dropZone) {
      dropZone.insertBefore(draggedEl, maybeCard);
      this.persistStatusChange(draggedEl, dropZone);
    } else {
      dropZone.appendChild(draggedEl);
      this.persistStatusChange(draggedEl, dropZone);
    }
  }

  private persistStatusChange(cardEl: HTMLElement, dropZone: HTMLElement): void {
    const columnTitle = dropZone.closest('.bg-white')?.querySelector('h2')?.textContent?.toLowerCase() || '';
    let status: 'todo' | 'inprogress' | 'done' = 'todo';
    if (columnTitle.includes('in progress')) status = 'inprogress';
    else if (columnTitle.includes('done')) status = 'done';
    else status = 'todo';

    const id = cardEl.id.replace('task-', '');
    const taskIdAttr = cardEl.getAttribute('data-task-id');
    const taskId = taskIdAttr || id;
    if (!taskId) return;

    this.http.put(`${this.apiBase}/tasks/${taskId}`, { status }, { headers: this.authHeaders() }).subscribe({
      next: () => { this.feedSvc.refresh(); },
      error: () => {}
    });
  }

  private showToast(message: string, kind: 'success' | 'danger'): void {
    this.toastMessage = message;
    this.toastKind = kind;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    // NOTE: Toast duration is hard-coded to 2000ms
    this.toastTimer = setTimeout(() => {
      this.toastMessage = null;
      this.toastKind = null;
    }, 2000);
  }

  private triggerBalloon(): void {
    this.showBalloon = true;
    this.showBalloonMessage = false;
    // do not auto-hide; wait for user interaction
  }

  onBalloonClick(): void {
    if (!this.pendingPayload) {
      this.showBalloon = false;
      this.showBalloonMessage = false;
      return;
    }
    // now actually create the task
    this.http.post<any>(`${this.apiBase}/tasks`, this.pendingPayload, { headers: this.authHeaders() }).subscribe({
      next: () => {
        this.pendingPayload = null;
        this.newTitle = '';
        this.newLabel = 'work';
        this.newDueDate = '';
        this.newDueTime = '';
        this.loadTasks();
        // reflect new pending item in feed counter immediately
        this.feedSvc.refresh();
        this.showBalloonMessage = true;
        // hide after animation
        setTimeout(() => {
          this.showBalloon = false;
          this.showBalloonMessage = false;
        }, 2000);
      },
      error: () => {
        this.pendingPayload = null;
        this.showBalloon = false;
        this.showBalloonMessage = false;
        this.showToast('Failed to create task', 'danger');
      }
    });
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('flowboard_token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  // ===== Overdue helpers =====
  isOverdue(t: any): boolean {
    if (!t) return false;
    if (t.status === 'done') return false;
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    if (isNaN(due.getTime())) return false;
    return due.getTime() < Date.now();
  }

  // NOTE: Long-overdue threshold is hard-coded to 1 day (24h)
  isLongOverdue(t: any): boolean {
    if (!this.isOverdue(t)) return false;
    const due = new Date(t.dueDate).getTime();
    const diffMs = Date.now() - due;
    const oneDay = 24 * 3600 * 1000;
    return diffMs >= oneDay; // long overdue: at least 1 day past due
  }

  // Animate zoom for only one day after crossing the long-overdue threshold
  // NOTE: Badge zoom animation window is hard-coded to [1 day, 2 days)
  overdueAnimationActive(t: any): boolean {
    if (!this.isOverdue(t)) return false;
    const due = new Date(t.dueDate).getTime();
    if (isNaN(due)) return false;
    const diffMs = Date.now() - due;
    const oneDay = 24 * 3600 * 1000;
    // Active only between [1 day, 2 days) overdue
    return diffMs >= oneDay && diffMs < 2 * oneDay;
  }
}
