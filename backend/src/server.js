const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectToDatabase } = require('./config/db');
const tasksRouter = require('./routes/tasks');
const authRouter = require('./routes/auth');
const boardsRouter = require('./routes/boards');
// Models for index sync
const Board = require('./models/Board');
const Task = require('./models/Task');
const { errorHandler, notFound } = require('./middleware/errorHandler');

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const corsOrigin = process.env.ORIGIN || 'http://localhost:4200';

// Middleware (relaxed CORS for simplicity)
app.use(cors({ origin: corsOrigin, methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/auth', authRouter);
app.use('/api/boards', boardsRouter);

// 404 and error handlers
app.use(notFound);
app.use(errorHandler);

// Start
connectToDatabase()
  .then(() => {
    // Ensure indexes match current schema (drops outdated ones like a global unique name on boards)
    Promise.all([Board.syncIndexes(), Task.syncIndexes()])
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('Index sync warning:', err?.message || err);
      });
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`FlowBoard backend listening on port ${port}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });


