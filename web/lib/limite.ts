// REC-11: límite de consultas por IP y tope global diario, guardados en Neon.

import { createHash } from "node:crypto";
import { query } from "./db";

const POR_IP_HORA = 20;
const GLOBAL_DIA = 300;

// Suma 1 al contador de la ventana actual y devuelve el total.
async function contar(clave: string, unidad: 'hour' | 'day'): Promise<number> {
    const { rows } = await query(
        `INSERT INTO limites (clave, ventana) VALUES ($1, date_trunc($2, now()))
        ON CONFLICT (clave, ventana) DO UPDATE SET conteo = limites.conteo + 1
        RETURNING conteo`,
        [clave, unidad],
    );
    return rows[0].conteo;    
}

export async function dentroDelLimite(ip: string): Promise<boolean> {
    // Se guarda una huella de la IP, no la IP.
    const huella = createHash('sha256').update(ip).digest('hex').slice(0, 32);
    const [porIp, global] = await Promise.all([
    contar(`ip:${huella}`, 'hour'),
    contar('global', 'day'),
]);    
return porIp <= POR_IP_HORA && global <= GLOBAL_DIA;
}