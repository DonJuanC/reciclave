CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS residuos (
    id INT PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    sinonimos TEXT[] NOT NULL DEFAULT '{}',
    caneca TEXT NOT NULL CHECK (caneca IN ('blanca', 'negra', 'verde', 'posconsumo')),
    aprovechable BOOLEAN,
    condicion TEXT,
    preparacion TEXT[] NOT NULL DEFAULT '{}',
    nota TEXT,
    fuente TEXT NOT NULL,
    confianza TEXT NOT NULL CHECK (confianza IN ('alta', 'media')),
    embedding vector(768),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS limites (
    clave TEXT NOT NULL,
    ventana TIMESTAMPTZ NOT NULL,
    conteo INT NOT NULL DEFAULT 1,
    PRIMARY KEY (clave, ventana)
);

CREATE INDEX IF NOT EXISTS residuos_embedding_idx
    ON residuos USING hnsw (embedding vector_cosine_ops);