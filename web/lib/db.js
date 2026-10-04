// src/db.js
// CINE-01: Conexión a PostgreSQL (Neon.tech) con SSL requerido.

require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    throw new Error('Falta DATABASE_URL en el archivo .env');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // requerido por Neon.tech
});

/**
 * Ejecuta una query contra el pool de conexiones.
 * @param {string} text
 * @param {Array} params
 */
async function query(text, params) {
    return pool.query(text, params);
}

/**
 * Prueba básica de conexión: SELECT NOW().
 */
async function testConnection() {
    try {
        const result = await query('SELECT NOW()');
        console.log('✅ Conexión exitosa a Neon.tech. Hora del servidor:', result.rows[0].now);
        return true;
    } catch (err) {
        console.error('❌ Error al conectar con la base de datos:', err.message);
        return false;
    }
}

// Permite ejecutar `node src/db.js` directamente para verificar la conexión.
if (require.main === module) {
    testConnection().finally(() => pool.end());
}

module.exports = { pool, query, testConnection };
