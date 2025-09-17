const Board = require('../models/Board');

async function listBoards(req, res, next) {
  try {
    const boards = await Board.find({ ownerId: req.userId }).sort({ createdAt: 1 });
    res.json(boards);
  } catch (err) {
    next(err);
  }
}

async function createBoard(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const existing = await Board.findOne({ name, ownerId: req.userId });
    if (existing) return res.status(409).json({ message: 'Board already exists' });
    const board = await Board.create({ name, ownerId: req.userId });
    res.status(201).json(board);
  } catch (err) {
    if (err && (err.code === 11000)) return res.status(409).json({ message: 'Board already exists' });
    next(err);
  }
}

module.exports = { listBoards, createBoard };
// ... existing code ...
async function deleteBoard(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await Board.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Board not found' });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports.deleteBoard = deleteBoard;


