const express = require('express');
const router = express.Router();
const {
  listTasks,
  createTask,
  updateTask,
  deleteTask
} = require('../controllers/taskController');
const { authRequired } = require('../middleware/auth');

router.get('/', authRequired, listTasks);
router.post('/', authRequired, createTask);
router.put('/:id', authRequired, updateTask);
router.delete('/:id', authRequired, deleteTask);

module.exports = router;


