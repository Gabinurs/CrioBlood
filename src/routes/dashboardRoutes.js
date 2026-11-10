const express = require('express');
const router = express.Router();

const DashboardController = require('../controllers/dashboardController');
const { exigirAutenticacao } = require('../middlewares/autenticacao');

router.get('/dashboard', exigirAutenticacao, DashboardController.index);

module.exports = router;
