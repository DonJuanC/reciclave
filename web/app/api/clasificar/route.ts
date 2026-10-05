import { NextResponse } from "next/server";
import { z } from 'zod';
import { clasificar } from '@/lib/services/clasificador';
import { dentroDelLimite } from '@/lib/limite';

const Entrada = z.object({
    texto: z.string().trim().min(2).max(120),
});

export async function POST(request: Request) {
    const cuerpo = await request.json().catch(() => null);
    const entrada = Entrada.safeParse(cuerpo);
    if (!entrada.success) {
        return NextResponse.json(
            { error: 'Envía un campo "texto" de 2 a 120 caracteres.' },
            { status: 400 },
        );
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
    if (!(await dentroDelLimite(ip))) {
        return NextResponse.json(
            { error: 'Llegaste al límite de consultas por ahora. Intenta más tarde.'},
            { status: 429 },
        );
    }

    try {
        return NextResponse.json(await clasificar(entrada.data.texto));
    } catch (err) {
        const e = err as Error & { sinRespuesta?: boolean };
        console.error('clasificar:', e.message);
        const saturado = e.sinRespuesta === true || /\b(503|429)\b/.test(e.message);
        return NextResponse.json(
            {
                error: saturado
                ? 'El servicio de IA está saturado. Intenta de nuevo en un momento.'
                : 'No se pudo clasificar el residuo.',
            },
            { status: saturado ? 503 : 500 },
        );
    }
}