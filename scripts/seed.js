// scripts/seed.js
// REC-02: residuos.seed.json -> embedding -> UPSERT en Neon.

const residuos = require('../data/residuos.seed.json');
const { pool, query } = require('../src/db');
const { generateEmbedding } = require('../src/services/embeddings');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Texto que se convierte en vector: lo que un usuario podría escribir.
function textoSemantico(r) {
    return [r.nombre, ...r.sinonimos, r.condicion].filter(Boolean).join(', ');
}

async function upsert (r, embedding) {
    await query(
        `INSERT INTO residuos
            (id, nombre, sinonimos, caneca, aprovechable, condicion, preparacion, nota, fuente, confianza, embedding)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            sinonimos = EXCLUDED.sinonimos,
            caneca = EXCLUDED.caneca,
            aprovechable = EXCLUDED.aprovechable,
            condicion = EXCLUDED.condicion,
            preparacion = EXCLUDED.preparacion,
            nota = EXCLUDED.nota,
            fuente = EXCLUDED.fuente,
            confianza = EXCLUDED.confianza,
            embedding = EXCLUDED.embedding,
            updated_at = NOW()`,
        [
            r.id, r.nombre, r.sinonimos, r.caneca, r.aprovechable, r.condicion, r.preparacion, r.nota, r.fuente, r.confianza, JSON.stringify(embedding),
        ]
    );    
}

async function main() {
    let ok = 0;
    for (const r of residuos) {
        try {
            const embedding = await generateEmbedding(textoSemantico(r));
            await upsert(r, embedding);
            ok++;
            console.log(`✅ ${r.id}. ${r.nombre} -> ${r.caneca}`);
        } catch (err) {
            console.error(`❌ ${r.id}. ${r.nombre}: ${err.message}`);
        }
        await sleep(700); // margen para el rate limit del free tier
    }
    console.log(`\nCargados ${ok}/${residuos.length}`);    
}

main().finally(() => pool.end());