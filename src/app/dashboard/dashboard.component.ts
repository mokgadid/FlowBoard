import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  tasks: any[] = [];
  private apiBase = 'http://localhost:4000/api';

 constructor(private router: Router, private http: HttpClient) { }

 goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  navigateToHome(): void {
    this.router.navigate(['/home']);
  }

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.http.get<any[]>(`${this.apiBase}/tasks`).subscribe((data) => {
      this.tasks = data;
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

  createTask(): void {
    const payload = {
      title: this.newTitle,
      label: this.newLabel,
      dueDate: this.newDueDate || undefined,
      status: 'todo'
    };
    if (!payload.title) return;
    this.http.post<any>(`${this.apiBase}/tasks`, payload).subscribe(() => {
      this.newTitle = '';
      this.newLabel = 'work';
      this.newDueDate = '';
      this.loadTasks();
    });
  }

  deleteTask(id: string): void {
    this.http.delete(`${this.apiBase}/tasks/${id}`).subscribe(() => this.loadTasks());
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

    this.http.put(`${this.apiBase}/tasks/${taskId}`, { status }).subscribe({
      next: () => {},
      error: () => {}
    });
  }
}
