const express = require('express');
const router = express.Router();

const { 
    getTermRank, 
    getOverallRank 
} = require('../controllers/rankController');

router.get('/class-rank/:studentId', getTermRank);

router.get('/overall-rank/:studentId', getOverallRank);

module.exports = router;