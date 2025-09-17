const express = require('express');
const router = express.Router();
const {
  listTasks,
  createTask,
  updateTask,
  deleteTask
} = require('../controllers/taskController');

router.get('/', listTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;


