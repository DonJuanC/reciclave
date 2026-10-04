// src/controllers/clasificar.controller.js
// REC-08: valida la entrada y delega en el servicio de clasificación.

const { z } = require('zod');
const { clasificar } = require('../services/clasificador');

const Entrada = z.object({
    texto: z.string().trim().min(2).max(120),
});

async function clasificarResiduo(req, res) {
    const entrada = Entrada.safeParse(req.body);
    if (!entrada.success) {
        return res.status(400).json({ error: 'Envía un campo "texto" de 2 a 120 caracteres.'});
    }

    try {
        res.json(await clasificar(entrada.data.texto));
    } catch (err) {
        console.error('clasificar', err.message);
        const saturado= err.sinRespuesta === true || /\b(503|429)\b/.test(err.message);
        res.status(saturado ? 503 : 500).json({
            error: saturado
                ? 'El servicio de IA está saturado. Intenta de nuevo en un momento.'
                : 'No se pudo clasificar el residuo.',
        });
    }
}

module.exports = { clasificarResiduo};