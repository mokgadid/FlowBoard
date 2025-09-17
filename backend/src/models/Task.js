const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    label: { type: String, enum: ['work', 'personal', 'urgent'], default: 'work' },
    dueDate: { type: Date },
    status: { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: false },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', TaskSchema);


