// src/services/embeddings.js
// CINE-02: Generación de embeddings semánticos vía Gemini API.
//
// AJUSTE (ejecutado en vivo): `text-embedding-004` fue descontinuado por Google
// (la API responde 404 NOT_FOUND). El reemplazo vigente es `gemini-embedding-001`,
// que por defecto devuelve 3072 dimensiones pero soporta `outputDimensionality`
// (representación tipo Matryoshka) para truncar a 768 y mantener compatibilidad
// con el `vector(768)` definido en schema.sql (CINE-01) sin tocar el esquema.

require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    throw new Error('Falta GEMINI_API_KEY en el archivo .env');
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const EMBEDDING_MODEL = 'gemini-embedding-001';
const OUTPUT_DIMENSIONALITY = 768; // debe coincidir con vector(768) en schema.sql

/**
 * Genera el embedding semántico de un texto.
 * @param {string} text
 * @returns {Promise<number[]>} array plano de 768 floats
 */
async function generateEmbedding(text) {
    const response = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text,
        config: { outputDimensionality: OUTPUT_DIMENSIONALITY },
    });

    const values = response?.embeddings?.[0]?.values;
    if (!values || !Array.isArray(values)) {
        throw new Error('Gemini no devolvió un embedding válido.');
    }
    if (values.length !== OUTPUT_DIMENSIONALITY) {
        throw new Error(
            `Gemini devolvió ${values.length} dimensiones, se esperaban ${OUTPUT_DIMENSIONALITY}.`
        );
    }
    return values;
}

// Alias: el handoff de CINE-03 (búsqueda semántica) referencia esta función como
// `generateMovieEmbedding`. Se expone como alias para no duplicar lógica ni romper
// los imports existentes de scripts/seed.js (que usa `generateEmbedding`).
module.exports = { generateEmbedding, generateMovieEmbedding: generateEmbedding };
