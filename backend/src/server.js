const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectToDatabase } = require('./config/db');
const tasksRouter = require('./routes/tasks');
const authRouter = require('./routes/auth');
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

// 404 and error handlers
app.use(notFound);
app.use(errorHandler);

// Start
connectToDatabase()
  .then(() => {
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


