"use client";

import { useState, type FormEvent } from "react";

type Caneca =
  "blanca" | "negra" | "verde" | "posconsumo" | "depende" | "no_aplica";

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
  | { fase: "inicio" }
  | { fase: "cargando"; texto: string }
  | { fase: "resultado"; datos: Resultado }
  | { fase: "error"; texto: string; mensaje: string };

const EJEMPLOS = [
  "servilleta sucia",
  "caja de pizza",
  "pilas",
  "cáscara de banano",
  "pote de yogur",
  "colchón viejo",
];

// Cada ejemplo va como una etiqueta de color, algunas torcidas.
const ETIQUETAS = [
  "bg-amarillo text-tinta",
  "bg-white text-tinta -rotate-2",
  "bg-verde text-white rotate-1",
];

// Color de toda la pantalla según la respuesta.
const FONDO = {
  inicio: "bg-crema text-tinta",
  depende: "bg-crema text-tinta",
  no_aplica: "bg-crema text-tinta",
  blanca: "bg-[#fffaf0] text-tinta",
  negra: "bg-tinta text-crema",
  verde: "bg-verde text-crema",
  posconsumo: "bg-amarillo text-tinta",
  error: "bg-rojo text-crema",
};

const NOMBRE = { blanca: "Blanca", negra: "Negra", verde: "Verde" };

const TITULAR = "font-display uppercase";

// Texto de la franja inferior, repetido para cubrir pantallas anchas.
const FRANJA = "RECICLÁ, VE ★ BLANCA ★ NEGRA ★ VERDE ★ ".repeat(8);

export default function Clasificador() {
  const [estado, setEstado] = useState<Estado>({ fase: "inicio" });
  const [texto, setTexto] = useState("");

  async function consultar(consulta: string) {
    const limpio = consulta.trim();
    if (limpio.length < 2) return;
    setTexto("");
    setEstado({ fase: "cargando", texto: limpio });
    try {
      const res = await fetch("/api/clasificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: limpio }),
      });
      const datos = await res.json();
      if (!res.ok) throw new Error(datos.error);
      setEstado({ fase: "resultado", datos });
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "Algo falló. Intenta de nuevo.";
      setEstado({ fase: "error", texto: limpio, mensaje });
    }
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    consultar(texto);
  }

  const clave =
    estado.fase === "resultado"
      ? estado.datos.caneca
      : estado.fase === "error"
        ? "error"
        : "inicio";

  // Sobre fondos oscuros o saturados, el acento pasa de rojo a amarillo.
  const fondoFuerte =
    clave === "negra" || clave === "verde" || clave === "error";
  const acento = fondoFuerte ? "text-amarillo" : "text-rojo";
  const borde =
    clave === "negra"
      ? "border-crema [--sombra:var(--color-amarillo)]"
      : "border-tinta";

  const campo = (placeholder: string) => (
    <form onSubmit={enviar} className="flex gap-2">
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={placeholder}
        maxLength={120}
        aria-label="Residuo"
        className={`sombra min-w-0 flex-1 border-[3px] bg-white px-3 py-3 text-tinta lg:px-4 lg:py-4 lg:text-lg ${borde}`}
      />
      <button
        type="submit"
        className={`sombra border-[3px] bg-rojo px-3.5 text-[17px] tracking-wider text-white lg:px-6 lg:text-[22px] ${TITULAR} ${borde}`}
      >
        ¿Dónde va?
      </button>
    </form>
  );

  return (
    <div
      className={`trama flex min-h-dvh flex-col transition-colors duration-300 ${FONDO[clave]}`}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col p-4 lg:max-w-6xl lg:px-10 lg:py-8">
        <header className="flex items-center justify-between">
          <span className={`text-2xl tracking-wide lg:text-3xl ${TITULAR}`}>
            Reciclá, <span className={acento}>ve</span>
          </span>
          {estado.fase !== "inicio" && (
            <button
              onClick={() => setEstado({ fase: "inicio" })}
              className={`border-2 border-current px-2.5 py-1 text-sm tracking-wider ${TITULAR}`}
            >
              Inicio
            </button>
          )}
        </header>

        <main
          className="flex flex-1 flex-col justify-center py-5 lg:py-10"
          aria-live="polite"
        >
          {estado.fase === "inicio" && (
            <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-14">
              <h1
                className={`mb-3.5 text-[clamp(60px,21vw,98px)] leading-[0.88] lg:mb-0 lg:text-[clamp(104px,10.4vw,156px)] ${TITULAR}`}
              >
                ¿Qué vas
                <br />a botar,{" "}
                <span className="inline-block -rotate-3 text-rojo">ve?</span>
              </h1>
              <div>
                <p className="mb-5 max-w-xs lg:max-w-sm lg:text-xl">
                  Te digo en qué caneca va, según el código de colores de
                  Colombia.
                </p>
                {campo("Ej: servilleta de papel usada")}
                <p className={`mb-2.5 mt-7 text-sm tracking-widest ${TITULAR}`}>
                  O toca uno de estos
                </p>
                <div className="flex flex-wrap gap-2">
                  {EJEMPLOS.map((ejemplo, i) => (
                    <button
                      key={ejemplo}
                      onClick={() => consultar(ejemplo)}
                      className={`border-2 border-tinta px-3 py-1.5 text-sm font-semibold lg:px-4 lg:py-2 lg:text-base ${ETIQUETAS[i % 3]}`}
                    >
                      {ejemplo}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {estado.fase === "cargando" && (
            <div className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-[6px] border-tinta border-t-rojo" />
              <p className={`text-xl tracking-widest ${TITULAR}`}>
                Mirando, ve…
              </p>
              <p className="mt-1">“{estado.texto}”</p>
            </div>
          )}

          {estado.fase === "error" && (
            <div className="text-center">
              <h2
                className={`entra text-[clamp(52px,17vw,80px)] leading-[0.9] lg:text-[clamp(100px,10vw,150px)] ${TITULAR}`}
              >
                ¡Uy! No pude
              </h2>
              <p className="mx-auto mt-3 max-w-xs font-semibold lg:max-w-md lg:text-xl">
                {estado.mensaje}
              </p>
              <button
                onClick={() => consultar(estado.texto)}
                className={`sombra mt-5 border-[3px] border-tinta bg-amarillo px-5 py-2.5 text-lg tracking-wider text-tinta ${TITULAR}`}
              >
                Reintentar
              </button>
            </div>
          )}

          {estado.fase === "resultado" && estado.datos.caneca === "depende" && (
            <div>
              <p className={`text-xl tracking-[0.14em] text-rojo ${TITULAR}`}>
                Depende, ve · “{estado.datos.consulta}”
              </p>
              <h2
                className={`mb-4 mt-1.5 text-[clamp(34px,10vw,46px)] leading-[0.98] lg:mb-8 lg:max-w-4xl lg:text-[clamp(56px,5.6vw,84px)] ${TITULAR}`}
              >
                {estado.datos.pregunta}
              </h2>
              <div className="sombra-lg border-4 border-tinta lg:grid lg:grid-cols-2">
                <button
                  onClick={() =>
                    consultar(`${estado.datos.consulta} limpio y seco`)
                  }
                  className="flex w-full items-center justify-between border-b-4 border-tinta bg-[#fffaf0] px-4 py-7 text-left text-tinta lg:border-b-0 lg:border-r-4 lg:px-8 lg:py-20"
                >
                  <span>
                    <strong
                      className={`block text-[34px] font-normal leading-[0.95] lg:text-[60px] ${TITULAR}`}
                    >
                      Limpio y seco
                    </strong>
                    <span className="text-sm font-semibold opacity-80 lg:text-lg">
                      Sin grasa ni restos
                    </span>
                  </span>
                  <span className="font-display text-4xl" aria-hidden="true">
                    →
                  </span>
                </button>
                <button
                  onClick={() =>
                    consultar(
                      `${estado.datos.consulta} con grasa o restos de comida`,
                    )
                  }
                  className="flex w-full items-center justify-between bg-tinta px-4 py-7 text-left text-crema lg:px-8 lg:py-20"
                >
                  <span>
                    <strong
                      className={`block text-[34px] font-normal leading-[0.95] lg:text-[60px] ${TITULAR}`}
                    >
                      Con grasa o comida
                    </strong>
                    <span className="text-sm font-semibold opacity-80 lg:text-lg">
                      Manchado o con sobras
                    </span>
                  </span>
                  <span className="font-display text-4xl" aria-hidden="true">
                    →
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* El texto no nombra un residuo: mensaje fijo, sin nada redactado por la IA. */}
          {estado.fase === "resultado" &&
            estado.datos.caneca === "no_aplica" && (
              <div>
                <p
                  className={`text-xl tracking-[0.14em] text-rojo lg:text-3xl ${TITULAR}`}
                >
                  Eso no es un residuo
                </p>
                <h2
                  className={`entra mb-4 mt-1.5 text-[clamp(52px,17vw,80px)] leading-[0.9] lg:text-[clamp(100px,10vw,150px)] ${TITULAR}`}
                >
                  Eso no se bota, ve
                </h2>
                <p className="max-w-sm text-[17px] font-semibold lg:max-w-md lg:text-2xl">
                  Escribe un objeto o residuo y te digo en qué caneca va.
                </p>
              </div>
            )}

          {estado.fase === "resultado" &&
            estado.datos.caneca !== "depende" &&
            estado.datos.caneca !== "no_aplica" && (
              <div
                className={`lg:grid lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-14 ${
                  estado.datos.caneca === "blanca"
                    ? "sombra-lg border-4 border-tinta bg-white p-4 lg:p-10"
                    : ""
                }`}
              >
                <div className="relative">
                  <div
                    aria-hidden="true"
                    className={`absolute -top-8 right-0 grid h-[84px] w-[84px] rotate-12 place-items-center rounded-full border-[3px] border-dashed border-current text-[26px] lg:-top-16 lg:h-[120px] lg:w-[120px] lg:border-4 lg:text-[38px] ${TITULAR} ${acento} ${
                      estado.datos.caneca === "blanca"
                        ? "right-2.5 bg-white lg:right-0"
                        : ""
                    }`}
                  >
                    ¡Ve!
                  </div>

                  <p className="mb-2.5 pr-24 text-[15px] font-semibold lg:pr-36 lg:text-xl">
                    “{estado.datos.consulta}”
                  </p>

                  {estado.datos.caneca === "posconsumo" ? (
                    <>
                      <p
                        className={`pr-24 text-xl leading-tight tracking-[0.14em] lg:pr-36 lg:text-3xl ${TITULAR}`}
                      >
                        Esto no va en la bolsa
                      </p>
                      <h2
                        className={`entra mb-4 mt-1 text-[clamp(52px,17vw,80px)] leading-[0.9] lg:mb-0 lg:text-[clamp(84px,8.5vw,120px)] ${TITULAR}`}
                      >
                        Llévalo a un punto
                      </h2>
                    </>
                  ) : (
                    <>
                      <p
                        className={`pr-24 text-xl leading-tight tracking-[0.14em] lg:pr-36 lg:text-3xl ${TITULAR}`}
                      >
                        Va en la
                      </p>
                      <h2
                        className={`entra mb-4 mt-1 leading-[0.84] lg:mb-0 ${TITULAR} ${
                          estado.datos.caneca === "blanca"
                            ? "text-[clamp(72px,25vw,112px)] lg:text-[clamp(140px,12.5vw,178px)]"
                            : "text-[clamp(88px,31vw,140px)] lg:text-[clamp(170px,16vw,230px)]"
                        }`}
                      >
                        {NOMBRE[estado.datos.caneca]}
                      </h2>
                    </>
                  )}
                </div>

                <div className="lg:pb-2">
                  <p className="max-w-sm text-[17px] font-semibold lg:max-w-md lg:text-2xl">
                    {estado.datos.explicacion}
                  </p>

                  {estado.datos.preparacion.length > 0 && (
                    <ol className="mt-4 lg:text-lg">
                      {estado.datos.preparacion.map((paso, i) => (
                        <li
                          key={paso}
                          className="flex items-baseline gap-3 border-t-2 border-current py-2"
                        >
                          <span className="min-w-5 font-display text-[26px] leading-none">
                            {i + 1}
                          </span>
                          <span>{paso}</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {estado.datos.verificado ? (
                    <p className="mt-4 text-[13px] font-semibold opacity-85 lg:text-base">
                      Fuente: {estado.datos.fuente}
                    </p>
                  ) : (
                    <p className="mt-4 inline-block -rotate-1 border-2 border-dashed border-current px-2.5 py-1 text-[13px] font-semibold">
                      Respuesta de IA, sin verificar
                    </p>
                  )}
                </div>
              </div>
            )}
        </main>

        {estado.fase !== "inicio" && estado.fase !== "cargando" && (
          <div className="lg:max-w-xl">{campo("Consulta otro residuo…")}</div>
        )}
      </div>

      {estado.fase === "inicio" && (
        <div
          aria-hidden="true"
          className="overflow-hidden whitespace-nowrap bg-tinta py-2.5 font-display text-[15px] tracking-[0.12em] text-amarillo lg:py-3.5 lg:text-xl"
        >
          {FRANJA}
        </div>
      )}
    </div>
  );
}
