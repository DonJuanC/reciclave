// src/services/busqueda.js
// REC-05: texto libre -> candidatos de la base por similitud coseno.

const { query } = require('../db');
const { generateEmbedding } = require('./embeddings');

async function buscarCandidatos(texto, limite = 3) {
    const embedding = await generateEmbedding(texto);
    const { rows } = await query(
        `SELECT nombre, caneca, condicion, preparacion, nota, fuente,
                1 - (embedding <=> $1::vector) AS similitud
         FROM residuos
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        [JSON.stringify(embedding), limite]
    );
    return rows.map((r) => ({ ...r, similitud: Number(r.similitud) }));
}

module.exports = { buscarCandidatos };