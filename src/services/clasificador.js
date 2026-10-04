// src/services/clasificador.js
// REC-06: reglas de enrutamiento + Gemini con Structured Outputs.

require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const { buscarCandidatos } = require('./busqueda');

// Umbrales calibrados con 19 consultas (REC-04). Ajustables.
const UMBRAL_DIRECTO = 0.77;
const UMBRAL_FUERA = 0.70;
const DIF_MINIMA = 0.05;
// Lista separada por comas, en orden de preferencia. Si un modelo está saturado, se usa el siguiente.
const MODELOS = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

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

// Tiempo máximo de espera por llamada a Gemini.
const LIMITE_MS = 15000;

// Errores pasajeros: saturación (503), límite de cuota (429) o modelo que no responde.
const esTemporal = (err) => err.sinRespuesta === true || /\b(503|429)\b/.test(err.message);

// Corta la espera si Gemini no contesta a tiempo; el error se trata como pasajero.
function conLimite(promesa, ms = LIMITE_MS) {
    let reloj;
    const limite = new Promise((_, reject) => {
        reloj = setTimeout(() => {
            const err = new Error(`Gemini no respondió en ${ms / 1000} s`);
            err.sinRespuesta = true;
            reject(err);
        }, ms);
    });
    return Promise.race([promesa, limite]).finally(() => clearTimeout(reloj));
}

// Reintenta ante un error pasajero, con espera creciente.
async function conReintentos(fn, intentos = 3) {
    for (let i = 1; ; i++) {
        try {
            return await fn();
        } catch (err) {
            // Si el modelo no respondió, no se insiste: se pasa al siguiente.
            if (!esTemporal(err) || err.sinRespuesta || i === intentos) throw err;
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
    // Cadena de respaldo: prueba cada modelo en orden y pasa al siguiente si está saturado.
    let ultimoError;
    for (const modelo of MODELOS) {
        try {
            const response = await conReintentos(() => conLimite(ai.models.generateContent({
                model: modelo,
                contents: prompt,
                config: {
                    systemInstruction: NORMA,
                    responseMimeType: 'application/json',
                    responseSchema: ESQUEMA,
                    temperature: 0,
                },
            })), 2);
            return { ...JSON.parse(response.text), modelo };
        } catch (err) {
            if (!esTemporal(err)) throw err;
            ultimoError = err;
        }
    }
    throw ultimoError;
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