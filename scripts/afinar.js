// scripts/afinar.js
// REC-04: lote de consultas para calibrar umbrales de similitud.

const { pool, query } = require('../src/db');
const { generateEmbedding } = require('../src/services/embeddings');

const CONSULTAS = [
    // Están en la base, dichas de otra forma
    'servilleta sucia', 'botella de Coca-Cola', 'el cartón de la leche',
    'pilas gastadas', 'pastillas vencidas', 'cáscara de plátano',
    // Ambiguas por estado
    'papel aluminio', 'vaso desechable', 'bolsa plástica',
    // No están en la base
    'un colchón viejo', 'pote de yogur', 'ropa vieja',
    'un zapato', 'chicle', 'juguete de plástico roto',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
    for (const texto of CONSULTAS) {
        const embedding = await generateEmbedding(texto);
        const { rows } = await query(
            `SELECT nombre, caneca, 1 - (embedding <=> $1::vector) AS sim
             FROM residuos ORDER BY embedding <=> $1::vector LIMIT 2`,
            [JSON.stringify(embedding)]
        );
        const [a, b] = rows.map((r) => ({ ...r, sim: Number(r.sim) }));
        console.log(
            `${a.sim.toFixed(3)}  dif ${(a.sim - b.sim).toFixed(3)}  "${texto}"\n` +
            `         1) [${a.caneca}] ${a.nombre}\n` +
            `         2) [${b.caneca}] ${b.nombre}`
        );
        await sleep(700);
    }
}

main()
    .catch((err) => console.error('❌', err.message))
    .finally(() => pool.end());