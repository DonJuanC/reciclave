// scripts/clasificar.js
// REC-06: prueba del clasificador desde la terminal.

const { pool } = require('../src/db');
const { clasificar } = require('../src/services/clasificador');

const texto = process.argv.slice(2).join(' ');

clasificar(texto)
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((err) => console.error('❌', err.message))
    .finally(() => pool.end());