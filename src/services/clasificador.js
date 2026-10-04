// src/services/clasificador.js
// REC-06: reglas de enrutamiento + Gemini con Structured Outputs.

require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const { buscarCandidatos } = require('./busqueda');

// Umbrales calibrados con 19 consultas (REC-04). Ajustables.
const UMBRAL_DIRECTO = 0.77;
const UMBRAL_FUERA = 0.70;
const DIF_MINIMA = 0.05;
const MODELO = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const NORMA = `Eres un clasificador de residuos domésticos para Colombia.
Aplica el código de colores de la Resolución 2184 de 2019:
- blanca: aprovechables limpios y secos (plástico, vidrio, metales, multicapa, papel, cartón).
- negra: no aprovechables (papel higiénico, servilletas, papel o cartón contaminado con comida, papeles metalizados, icopor).
- verde: orgánicos aprovechables (restos de comida, residuos de poda).
- posconsumo: no va en ninguna bolsa; se lleva a un punto de recolección (pilas, medicamentos, aparatos eléctricos, bombillos, aceite de cocina, llantas, objetos voluminosos).
Responde "depende" solo si el material no se puede limpiar (papel o cartón con grasa o comida) y formula una sola pregunta corta. Si es un envase lavable de plástico, vidrio o metal, responde "blanca" e indica enjuagarlo y secarlo en la preparación.
Si no estás seguro, dilo en la explicación. No inventes normas ni puntos de recolección.`;

const ESQUEMA = {
    type: 'OBJECT',
    properties: {
        caneca: { type: 'STRING', enum: ['blanca', 'negra', 'verde', 'posconsumo', 'depende'] },
        explicacion: { type: 'STRING' },
        preparacion: { type: 'ARRAY', items: { type: 'STRING' } },
        pregunta: { type: 'STRING' },
    },
    required: ['caneca', 'explicacion', 'preparacion', 'pregunta'],
};

// Reintenta ante saturación (503) o límite de cuota (429), con espera creciente.
async function conReintentos(fn, intentos = 3) {
    for (let i = 1; ; i++) {
        try {
            return await fn();
        } catch (err) {
            const temporal = /\b(503|429)\b/.test(err.message);
            if (!temporal || i === intentos) throw err;
            await new Promise((r) => setTimeout(r, 2000 * i));
        }
    }
}

async function preguntarAGemini(texto, candidatos) {
    let prompt = `Residuo: "${texto}"`;
    if (candidatos.length) {
        const lista = candidatos
            .map((c) => `- ${c.nombre} (${c.condicion}) -> ${c.caneca}. ${c.nota || ''}`)
            .join('\n');
        prompt += `\n\nRegistros parecidos de la base curada:\n${lista}\n\n` +
            'Si son el mismo objeto en distinto estado, responde "depende" y pregunta por el estado. ' +
            'Si ninguno corresponde al residuo, ignóralos y clasifica con la norma.';
    }
    const response = await conReintentos(() => ai.models.generateContent({
        model: MODELO,
        contents: prompt,
        config: {
            systemInstruction: NORMA,
            responseMimeType: 'application/json',
            responseSchema: ESQUEMA,
            temperature: 0,
        },
    }));
    return JSON.parse(response.text);
}

async function clasificar(texto) {
    const candidatos = await buscarCandidatos(texto);
    const [a, b] = candidatos;
    const dif = a.similitud - b.similitud;

    // Regla 1: la base responde sola.
    if (a.similitud >= UMBRAL_DIRECTO && (dif >= DIF_MINIMA || a.caneca === b.caneca)) {
        return {
            consulta: texto,
            origen: 'base',
            verificado: true,
            similitud: a.similitud,
            caneca: a.caneca,
            residuo: a.nombre,
            explicacion: a.nota || '',
            preparacion: a.preparacion,
            pregunta: '',
            fuente: a.fuente,
        };
    }

    // Regla 2 (zona dudosa): Gemini con candidatos. Regla 3 (fuera): solo la norma.
    const dudosa = a.similitud >= UMBRAL_FUERA;
    const r = await preguntarAGemini(texto, dudosa ? candidatos : []);
    return {
        consulta: texto,
        origen: dudosa ? 'gemini_con_candidatos' : 'gemini_solo_norma',
        verificado: false,
        similitud: a.similitud,
        ...r,
    };
}

module.exports = { clasificar };