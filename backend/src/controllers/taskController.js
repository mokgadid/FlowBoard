const Task = require('../models/Task');

async function listTasks(req, res, next) {
  try {
    const tasks = await Task.find().sort({ createdAt: 1 });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
}

async function createTask(req, res, next) {
  try {
    const { title, label, dueDate, status } = req.body;
    const task = await Task.create({ title, label, dueDate, status });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const { title, label, dueDate, status } = req.body;
    const updated = await Task.findByIdAndUpdate(
      id,
      { title, label, dueDate, status },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Task not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteTask(req, res, next) {
  try {
    const { id } = req.params;
    const removed = await Task.findByIdAndDelete(id);
    if (!removed) return res.status(404).json({ message: 'Task not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTasks,
  createTask,
  updateTask,
  deleteTask
};


