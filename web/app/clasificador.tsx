'use client';

import { useState, type FormEvent } from 'react';

type Caneca = 'blanca' | 'negra' | 'verde' | 'posconsumo' | 'depende';

type Resultado = {
  consulta: string;
  origen: string;
  verificado: boolean;
  caneca: Caneca;
  explicacion: string;
  preparacion: string[];
  pregunta: string;
  fuente?: string;
};

type Estado =
  | { fase: 'inicio' }
  | { fase: 'cargando'; texto: string }
  | { fase: 'resultado'; datos: Resultado }
  | { fase: 'error'; texto: string; mensaje: string };

const EJEMPLOS = [
  'servilleta sucia',
  'caja de pizza',
  'pilas',
  'cáscara de banano',
  'pote de yogur',
  'colchón viejo',
];

// Color de toda la pantalla según la respuesta.
const FONDO = {
  inicio: 'bg-stone-100 text-stone-900',
  blanca: 'bg-stone-100 text-stone-900',
  negra: 'bg-neutral-900 text-white',
  verde: 'bg-green-700 text-white',
  posconsumo: 'bg-amber-400 text-amber-950',
  depende: 'bg-neutral-900 text-white',
  error: 'bg-red-900 text-white',
};

const NOMBRE = { blanca: 'BLANCA', negra: 'NEGRA', verde: 'VERDE' };

export default function Clasificador() {
  const [estado, setEstado] = useState<Estado>({ fase: 'inicio' });
  const [texto, setTexto] = useState('');

  async function consultar(consulta: string) {
    const limpio = consulta.trim();
    if (limpio.length < 2) return;
    setTexto('');
    setEstado({ fase: 'cargando', texto: limpio });
    try {
      const res = await fetch('/api/clasificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: limpio }),
      });
      const datos = await res.json();
      if (!res.ok) throw new Error(datos.error);
      setEstado({ fase: 'resultado', datos });
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Algo falló. Intenta de nuevo.';
      setEstado({ fase: 'error', texto: limpio, mensaje });
    }
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    consultar(texto);
  }

  const clave =
    estado.fase === 'resultado' ? estado.datos.caneca : estado.fase === 'error' ? 'error' : 'inicio';

  const campo = (placeholder: string) => (
    <form onSubmit={enviar} className="flex gap-2">
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={placeholder}
        maxLength={120}
        aria-label="Residuo"
        className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900"
      />
      <button type="submit" className="rounded-xl border-2 border-current px-4 font-bold">
        Consultar
      </button>
    </form>
  );

  return (
    <div className={`min-h-dvh transition-colors duration-300 ${FONDO[clave]}`}>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col p-4">
        <header className="flex items-center justify-between">
          <span className="text-lg font-extrabold">Reciclá, ve</span>
          {estado.fase !== 'inicio' && (
            <button onClick={() => setEstado({ fase: 'inicio' })} className="text-sm underline opacity-80">
              Inicio
            </button>
          )}
        </header>

        <main className="flex flex-1 flex-col justify-center py-6" aria-live="polite">
          {estado.fase === 'inicio' && (
            <div>
              <h1 className="text-4xl font-extrabold leading-tight">¿Qué vas a botar, ve?</h1>
              <p className="mb-5 mt-2 text-stone-600">
                Te digo en qué caneca va, según el código de colores de Colombia.
              </p>
              {campo('Ej: servilleta de papel usada')}
              <p className="mt-6 text-sm text-stone-600">O prueba con un ejemplo:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EJEMPLOS.map((ejemplo) => (
                  <button
                    key={ejemplo}
                    onClick={() => consultar(ejemplo)}
                    className="rounded-full border border-stone-300 px-3 py-1.5 text-sm"
                  >
                    {ejemplo}
                  </button>
                ))}
              </div>
            </div>
          )}

          {estado.fase === 'cargando' && (
            <div className="text-center">
              <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-stone-300 border-t-stone-900" />
              <p>Buscando “{estado.texto}”…</p>
            </div>
          )}

          {estado.fase === 'error' && (
            <div className="text-center">
              <h2 className="text-3xl font-extrabold">Uy, no pude responder</h2>
              <p className="mx-auto mt-3 max-w-xs">{estado.mensaje}</p>
              <button
                onClick={() => consultar(estado.texto)}
                className="mt-5 rounded-xl bg-white px-5 py-3 font-bold text-red-900"
              >
                Reintentar
              </button>
            </div>
          )}

          {estado.fase === 'resultado' && estado.datos.caneca === 'depende' && (
            <div>
              <p className="text-center text-xs uppercase tracking-widest opacity-75">
                “{estado.datos.consulta}” · depende
              </p>
              <h2 className="mb-4 mt-1 text-center text-2xl font-bold leading-tight">
                {estado.datos.pregunta}
              </h2>
              <div className="overflow-hidden rounded-3xl border border-white/25">
                <button
                  onClick={() => consultar(`${estado.datos.consulta} limpio y seco`)}
                  className="block w-full bg-stone-50 px-4 py-9 text-stone-900"
                >
                  <span className="block text-xl font-extrabold">Limpio y seco</span>
                  <span className="text-sm opacity-75">Sin grasa ni restos</span>
                </button>
                <button
                  onClick={() => consultar(`${estado.datos.consulta} con grasa o restos de comida`)}
                  className="block w-full bg-black px-4 py-9 text-white"
                >
                  <span className="block text-xl font-extrabold">Con grasa o comida</span>
                  <span className="text-sm opacity-75">Manchado o con sobras</span>
                </button>
              </div>
            </div>
          )}

          {estado.fase === 'resultado' && estado.datos.caneca !== 'depende' && (
            <div
              className={`text-center ${
                estado.datos.caneca === 'blanca' ? 'rounded-3xl border border-stone-300 bg-white p-6' : ''
              }`}
            >
              <p className="mb-4 text-sm opacity-75">“{estado.datos.consulta}”</p>

              {estado.datos.caneca === 'posconsumo' ? (
                <>
                  <div className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-2xl border-4 border-current text-5xl font-bold">
                    →
                  </div>
                  <p className="text-xs uppercase tracking-widest opacity-80">No va en ninguna bolsa</p>
                  <h2 className="mb-3 mt-1 text-3xl font-extrabold leading-tight">
                    Llévalo a un punto de recolección
                  </h2>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-4 w-24">
                    <div className="-mx-2 mb-1.5 h-3 rounded-full bg-current" />
                    <div className="h-28 bg-current [clip-path:polygon(0_0,100%_0,88%_100%,12%_100%)]" />
                  </div>
                  <p className="text-xs uppercase tracking-widest opacity-80">Va en la</p>
                  <h2 className="mb-3 mt-1 text-6xl font-black leading-none">
                    {NOMBRE[estado.datos.caneca]}
                  </h2>
                </>
              )}

              <p className="mx-auto max-w-xs">{estado.datos.explicacion}</p>

              {estado.datos.preparacion.length > 0 && (
                <ol className="mx-auto mt-4 max-w-xs text-left">
                  {estado.datos.preparacion.map((paso, i) => (
                    <li key={paso} className="flex gap-3 border-t border-current/25 py-2">
                      <b className="opacity-70">{i + 1}</b>
                      <span>{paso}</span>
                    </li>
                  ))}
                </ol>
              )}

              {estado.datos.verificado ? (
                <p className="mt-5 text-xs opacity-75">Fuente: {estado.datos.fuente}</p>
              ) : (
                <p className="mt-5 inline-block rounded-full border border-dashed border-current px-3 py-1.5 text-xs">
                  Respuesta de IA, sin verificar en la base curada
                </p>
              )}
            </div>
          )}
        </main>

        {estado.fase !== 'inicio' && estado.fase !== 'cargando' && campo('Consulta otro residuo…')}
      </div>
    </div>
  );
}
