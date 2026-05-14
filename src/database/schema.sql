-- ═══════════════════════════════════════════════════════════
--  Guías que Conectan — Core API — Schema MySQL
--  Base de datos: guias_conectan_core
-- ═══════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS guias_conectan_core
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE guias_conectan_core;

-- ── Catálogo: Grados ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grado (
  id      INT            NOT NULL AUTO_INCREMENT,
  nombre  VARCHAR(100)   NOT NULL,
  numero  TINYINT        NOT NULL,
  area    VARCHAR(80)    NOT NULL DEFAULT 'ciencias_sociales',

  CONSTRAINT pk_grado PRIMARY KEY (id),
  CONSTRAINT uq_grado_numero UNIQUE (numero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Catálogo: Competencias de Ciencias Sociales ─────────────
CREATE TABLE IF NOT EXISTS competencia_cs (
  id          INT           NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(200)  NOT NULL,
  tipo_cs     VARCHAR(80)   NOT NULL,
  descripcion TEXT,
  area        VARCHAR(80)   NOT NULL DEFAULT 'ciencias_sociales',

  CONSTRAINT pk_competencia PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Catálogo: DBAs (Derechos Básicos de Aprendizaje) ────────
CREATE TABLE IF NOT EXISTS dba_catalogo (
  id                     INT          NOT NULL AUTO_INCREMENT,
  grado_id               INT          NOT NULL,
  codigo_men             VARCHAR(30)  NOT NULL,
  enunciado_oficial      TEXT         NOT NULL,
  evidencias_aprendizaje TEXT,
  creado_en              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_dba        PRIMARY KEY (id),
  CONSTRAINT uq_dba_codigo UNIQUE (codigo_men),
  CONSTRAINT fk_dba_grado  FOREIGN KEY (grado_id) REFERENCES grado(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Sesión de Generación ─────────────────────────────────────
-- docente_id: INT sin FK — el docente vive en la BD del auth-api.
--             Se confía en el JWT para identificarlo.
CREATE TABLE IF NOT EXISTS sesion_generacion (
  id              INT          NOT NULL AUTO_INCREMENT,
  docente_id      INT          NOT NULL,
  dba_catalogo_id INT          NOT NULL,
  competencia_id  INT          NULL,
  modelo_ia       VARCHAR(60)  NOT NULL DEFAULT 'gpt-4o-mini',
  estado          ENUM('activa','completada','cancelada') NOT NULL DEFAULT 'activa',
  prompt_sistema  TEXT,
  creado_en       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_sesion    PRIMARY KEY (id),
  CONSTRAINT fk_sesion_dba FOREIGN KEY (dba_catalogo_id) REFERENCES dba_catalogo(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Guía Didáctica ───────────────────────────────────────────
-- contenido_json: array JSON con bloques { tipo, contenido, metadata }
-- Schema-on-read: el servidor parsea/serializa el JSON.
CREATE TABLE IF NOT EXISTS guia (
  id                INT          NOT NULL AUTO_INCREMENT,
  sesion_id         INT          NOT NULL,
  dba_catalogo_id   INT          NOT NULL,
  titulo            VARCHAR(300) NOT NULL,
  version_numero    INT          NOT NULL DEFAULT 1,
  estado            ENUM('borrador','publicado') NOT NULL DEFAULT 'borrador',
  es_version_activa TINYINT(1)   NOT NULL DEFAULT 1,
  contenido_json    LONGTEXT     NOT NULL,
  creado_en         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT pk_guia        PRIMARY KEY (id),
  CONSTRAINT fk_guia_sesion FOREIGN KEY (sesion_id)       REFERENCES sesion_generacion(id),
  CONSTRAINT fk_guia_dba    FOREIGN KEY (dba_catalogo_id) REFERENCES dba_catalogo(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Iteración IA ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iteracion_ia (
  id               INT       NOT NULL AUTO_INCREMENT,
  guia_id          INT       NOT NULL,
  numero_iteracion INT       NOT NULL DEFAULT 1,
  tipo_accion      ENUM('generar','iterar','editar') NOT NULL,
  prompt_docente   TEXT      NOT NULL,
  respuesta_ia_raw LONGTEXT  NOT NULL,
  creado_en        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_iteracion      PRIMARY KEY (id),
  CONSTRAINT fk_iteracion_guia FOREIGN KEY (guia_id) REFERENCES guia(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Recurso Complementario ───────────────────────────────────
CREATE TABLE IF NOT EXISTS recurso_complementario (
  id                  INT          NOT NULL AUTO_INCREMENT,
  guia_id             INT          NOT NULL,
  tipo                ENUM('IMAGEN','PDF','LINK') NOT NULL,
  url_almacenamiento  VARCHAR(500) NOT NULL,
  prompt_generacion   TEXT,
  seccion_referencia  VARCHAR(200),
  creado_en           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_recurso      PRIMARY KEY (id),
  CONSTRAINT fk_recurso_guia FOREIGN KEY (guia_id) REFERENCES guia(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
