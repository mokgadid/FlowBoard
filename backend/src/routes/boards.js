const express = require('express');
const router = express.Router();
const { listBoards, createBoard, deleteBoard } = require('../controllers/boardController');
const { authRequired } = require('../middleware/auth');

router.get('/', authRequired, listBoards);
router.post('/', authRequired, createBoard);
router.delete('/:id', authRequired, deleteBoard);

module.exports = router;


