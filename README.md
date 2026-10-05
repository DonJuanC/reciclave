# Reciclá, ve

**¿En qué caneca va?** Escribes lo que vas a botar y la app te dice dónde va, por qué y cómo prepararlo, según el código de colores de Colombia.

**Demo:** https://reciclave.vercel.app

![Cuatro pantallas de la app en celular: inicio, resultado en caneca negra, pregunta por el estado del residuo y residuo que va a punto de recolección](docs/pantallas-movil.png)

## Qué hace

Separar residuos en Colombia tiene una regla simple (tres colores) y cientos de casos dudosos: la caja de pizza, el pote de yogur, las pilas. Reciclá, ve recibe el nombre del residuo en lenguaje natural y responde con:

- La caneca que corresponde (blanca, negra o verde), o el aviso de que no va en ninguna bolsa.
- La razón y los pasos de preparación (enjuagar, aplastar, guardar aparte).
- Una pregunta de seguimiento cuando la respuesta depende del estado del residuo, por ejemplo si la caja tiene grasa.
- El nivel de confianza: la fuente normativa cuando la respuesta sale de la base curada, o un aviso visible cuando la generó la IA.
- Un mensaje fijo cuando lo que se escribe no es un residuo.

## Cómo funciona

La app no le pregunta todo a un modelo de lenguaje. Primero busca en una base curada a mano y solo recurre a la IA cuando la base no alcanza.

```mermaid
flowchart TD
    A[Texto del usuario] --> B[Embedding con Gemini]
    B --> C[Búsqueda por similitud coseno en pgvector]
    C --> D{¿Qué tan parecido es el mejor resultado?}
    D -->|Similitud alta y sin ambigüedad| E[Respuesta directa desde la base, verificada]
    D -->|Similitud media o resultados ambiguos| F[Gemini decide con los candidatos como contexto]
    D -->|Similitud baja| G[Gemini clasifica solo con la norma]
    F --> H[Respuesta marcada como no verificada]
    G --> H
```

Las tres rutas se deciden con dos señales: la similitud del mejor resultado y la diferencia con el segundo.

| Ruta | Condición | Quién responde |
|---|---|---|
| Directa | Similitud ≥ 0.77, y el segundo resultado está a 0.05 o más, o es de la misma caneca | La base curada |
| Zona dudosa | Similitud ≥ 0.70 que no cumple lo anterior | Gemini, con los candidatos de la base |
| Fuera de la base | Similitud < 0.70 | Gemini, solo con las reglas de la norma |

## Decisiones técnicas

**Base curada antes que modelo.** Una norma no admite respuestas inventadas. Los 50 residuos más comunes están clasificados a mano contra la resolución, con su fuente. El modelo solo redacta o razona cuando no hay coincidencia, y esas respuestas se marcan como no verificadas.

**Umbrales calibrados con datos.** Los cortes de similitud no son arbitrarios: salen de un lote de 19 consultas de prueba (sinónimos coloquiales, casos ambiguos y residuos ausentes). El hallazgo clave fue que la similitud sola no basta: un residuo ausente puede puntuar casi igual que un acierto débil, y lo que lo delata es la poca diferencia entre el primer y el segundo resultado.

**Salidas estructuradas.** Gemini responde contra un esquema JSON fijo (caneca, explicación, preparación, pregunta), así que el frontend nunca interpreta texto libre.

**Tolerancia a fallos del free tier.** Los modelos gratuitos se saturan o se quedan sin responder. El servicio usa una lista de modelos en orden de preferencia, con un límite de 8 segundos por llamada; si uno falla o se cuelga, pasa al siguiente.

**Límite de consultas sin servicios extra.** El endpoint es público, así que cada IP tiene un tope por hora y hay un tope global diario. Los contadores viven en la misma base de Postgres, porque en un entorno serverless la memoria no se comparte entre peticiones. Se guarda una huella de la IP, no la IP.

**Costo cero.** Todo corre en capas gratuitas: Vercel, Neon y Google AI Studio.

## Seguridad

El endpoint es público y recibe texto libre que termina en un modelo de lenguaje, así que la app asume que alguien va a intentar manipularlo.

- **El texto del usuario es un dato, no una instrucción.** Se envía al modelo delimitado y sin comillas ni saltos de línea, y el prompt indica que nunca se obedezca lo que traiga.
- **La respuesta del modelo no se confía.** Antes de mostrarla, el servidor la valida: una caneca fuera de la lista se descarta, la explicación y los pasos se recortan a un largo máximo y se eliminan los enlaces.
- **Entradas fuera de tema.** Si el texto no nombra un objeto, la app muestra un mensaje fijo y descarta lo que haya redactado la IA, para no servir de altavoz.
- **Residuos peligrosos.** Siempre se remiten a un punto de recolección, sin instrucciones de manipulación.
- **Abuso de volumen.** Tope de consultas por IP y por día, entrada de máximo 120 caracteres y tiempo límite por llamada al modelo.

La inyección de instrucciones se reduce, no se elimina. Lo que estas capas garantizan es que el peor caso sea una explicación corta marcada como no verificada.

## Identidad visual

La interfaz toma el lenguaje de un cartel popular: titulares condensados a todo el ancho, colores planos y sombras duras. El color de la pantalla completa es la respuesta, de modo que se entiende sin leer. Se diseñó primero para celular y en pantallas anchas pasa a un formato horizontal.

![Pantalla de inicio en escritorio](docs/escritorio-inicio.png)

## Stack

- **Aplicación:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Base de datos:** PostgreSQL con pgvector en Neon
- **IA:** Gemini API para embeddings (`gemini-embedding-001`, 768 dimensiones) y clasificación con salidas estructuradas
- **Validación:** Zod
- **Deploy:** Vercel

## Estructura

```
reciclave/
├── data/residuos.seed.json   Base curada de residuos
├── docs/                     Capturas de pantalla
├── schema.sql                Tablas: residuos (con embedding) y limites
├── scripts/                  Carga de datos y calibración de umbrales
│   ├── seed.js               Genera embeddings y carga la base
│   ├── buscar.js             Búsqueda semántica desde la terminal
│   └── afinar.js             Lote de consultas para calibrar umbrales
├── src/                      Prototipo inicial del backend en Express
└── web/                      Aplicación Next.js (la que está desplegada)
    ├── app/
    │   ├── page.tsx
    │   ├── clasificador.tsx          Interfaz
    │   └── api/clasificar/route.ts   Endpoint POST
    └── lib/
        ├── db.js
        ├── limite.ts                 Límite de consultas
        └── services/                 Embeddings, búsqueda y clasificador
```

## Correr en local

Requisitos: Node.js 20.9 o superior, un proyecto en Neon y una API key de Google AI Studio.

**1. Base de datos y datos semilla** (desde la raíz):

```bash
npm install
```

Crea un archivo `.env` en la raíz:

```
DATABASE_URL=postgresql://usuario:clave@host/neondb?sslmode=verify-full
GEMINI_API_KEY=tu_api_key
```

Ejecuta el contenido de `schema.sql` en el SQL Editor de Neon y luego carga los residuos:

```bash
node scripts/seed.js
```

**2. Aplicación** (desde `web/`):

```bash
cd web
npm install
```

Crea `web/.env.local` con las mismas dos variables y la lista de modelos:

```
DATABASE_URL=postgresql://usuario:clave@host/neondb?sslmode=verify-full
GEMINI_API_KEY=tu_api_key
GEMINI_MODEL=gemini-3.5-flash-lite,gemini-3.5-flash
```

```bash
npm run dev
```

La app queda en http://localhost:3000.

## Limitaciones conocidas

- La base curada tiene 50 residuos. Todo lo demás lo responde la IA y queda marcado como no verificado.
- Los umbrales salen de 19 consultas de prueba; el corte entre "coincidencia" y "zona dudosa" tiene poco margen y debe recalibrarse al ampliar la base.
- La categoría `posconsumo` agrupa hoy tanto programas de devolución (pilas, medicamentos) como objetos voluminosos, que en rigor se gestionan distinto.
- La app indica que un residuo debe llevarse a un punto de recolección, pero no dice dónde queda el más cercano.
- La clasificación de las tres canecas se verificó contra el texto de la Resolución 2184 de 2019. Las referencias a las normas de posconsumo de cada residuo especial están pendientes de verificación.
- Las defensas ante entradas maliciosas se probaron con casos puntuales, no con una evaluación sistemática.
- Es una herramienta de orientación. Las rutas de aprovechamiento dependen de cada municipio.

## Fuente normativa

Resolución 2184 de 2019 del Ministerio de Ambiente y Desarrollo Sostenible, que unifica el código de colores para la separación de residuos en la fuente en Colombia: blanco para aprovechables, negro para no aprovechables y verde para orgánicos aprovechables.

## Sobre el nombre

"Reciclá, ve" es como se diría en Cali. Para URLs y nombres técnicos se usa `reciclave`.