const express = require('express');
const router = express.Router();
const { getTerms, createTerm, updateTerm, deleteTerm } = require('../controllers/termController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/', getTerms);
router.post('/', createTerm);
router.put('/:id', updateTerm);
router.delete('/:id', deleteTerm);

module.exports = router;
