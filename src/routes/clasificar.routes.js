// src/routes/clasificar.routes.js
// REC-08: rutas del clasificador.

const { Router } = require('express');
const { clasificarResiduo } = require('../controllers/clasificar.controller');

const router = Router();
router.post('/clasificar', clasificarResiduo);

module.exports = router;