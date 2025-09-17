# FlowBoard Backend

Node.js + Express + MongoDB backend for FlowBoard. Serves REST APIs for tasks.

## Setup

1. Create a `.env` file in `backend/` with:
```bash
PORT=4000
MONGODB_URI=mongodb://localhost:27017/flowboard
ORIGIN=http://localhost:4200
```

2. Install dependencies:
```bash
npm install
```

3. Start in dev mode:
```bash
npm run dev
```

Server runs on PORT (default 4000) and expects MongoDB at `MONGODB_URI`.

## Endpoints
- GET `/api/tasks` – list tasks
- POST `/api/tasks` – create task
- PUT `/api/tasks/:id` – update task
- DELETE `/api/tasks/:id` – delete task

## Task schema
- title: string (required)
- label: `work | personal | urgent`
- dueDate: ISO date
- status: `todo | inprogress | done`
