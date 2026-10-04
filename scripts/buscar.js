// scripts/buscar.js
// REC-03: texto libre -> embedding -> top 3 residuos por similitud coseno.

const { pool, query } = require('../src/db');
const { generateEmbedding } = require('../src/services/embeddings');

async function main() {
    const texto = process.argv.slice(2).join(' ');
    if (!texto) {
        console.error('Uso: node scripts/buscar.js "servilleta de papel usada"');
        return;
    }

    const total = await query('SELECT COUNT(*) FROM residuos WHERE embedding IS NOT NULL');
    console.log(`Residuos con embedding: ${total.rows[0].count}\n`);

    const embedding = await generateEmbedding(texto);
    const { rows } = await query(
        `SELECT nombre, caneca, nota,
                1 - (embedding <=> $1::vector) AS similitud
        
        FROM residuos
        ORDER BY embedding <=> $1::vector
        LIMIT 3`,
        [JSON.stringify(embedding)]
    );

    console.log(`Consulta: "${texto}"`);
    for (const r of rows) {
        console.log(`  ${Number(r.similitud).toFixed(3)}  [${r.caneca}]. ${r.nombre}`);
    }
}

main()
    .catch((err) => console.error('❌', err.message))
    .finally(() => pool.end());