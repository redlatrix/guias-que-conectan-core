import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Guías que Conectan — Core API',
      version: '1.0.0',
      description:
        'Microservicio principal: generación de guías didácticas con IA alineadas a DBAs en Ciencias Sociales.',
    },
    servers: [
      {
        url: process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`,
        description: 'Servidor activo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenido en el auth-api (/auth/login)',
        },
      },
      schemas: {
        Grado: {
          type: 'object',
          properties: {
            id:     { type: 'integer', example: 5 },
            nombre: { type: 'string',  example: 'Quinto grado' },
            numero: { type: 'integer', example: 5 },
            ciclo:  { type: 'string',  example: 'Básica primaria' },
          },
        },
        Competencia: {
          type: 'object',
          properties: {
            id:          { type: 'integer', example: 1 },
            nombre:      { type: 'string',  example: 'Relaciones con la historia y las culturas' },
            tipo_cs:     { type: 'string',  example: 'historia' },
            descripcion: { type: 'string',  example: 'Comprende procesos históricos...' },
          },
        },
        DBA: {
          type: 'object',
          properties: {
            id:                      { type: 'integer', example: 1 },
            grado_id:                { type: 'integer', example: 5 },
            competencia_id:          { type: 'integer', example: 1 },
            codigo_men:              { type: 'string',  example: 'CS-G5-DBA1' },
            enunciado_oficial:       { type: 'string',  example: 'Comprende que la Constitución...' },
            evidencias_aprendizaje:  { type: 'string',  example: 'Identifica los derechos...' },
          },
        },
        SesionBody: {
          type: 'object',
          required: ['dba_catalogo_id'],
          properties: {
            dba_catalogo_id: { type: 'integer', example: 1 },
            modelo_ia:       { type: 'string',  example: 'gpt-4o-mini', nullable: true },
          },
        },
        Sesion: {
          type: 'object',
          properties: {
            id:              { type: 'integer', example: 1 },
            docente_id:      { type: 'integer', example: 3 },
            dba_catalogo_id: { type: 'integer', example: 1 },
            modelo_ia:       { type: 'string',  example: 'gpt-4o-mini' },
            estado:          { type: 'string',  example: 'activa' },
            creado_en:       { type: 'string',  format: 'date-time' },
          },
        },
        GenerarGuiaBody: {
          type: 'object',
          required: ['sesion_id', 'prompt_docente'],
          properties: {
            sesion_id: { type: 'integer', example: 1 },
            prompt_docente: {
              type: 'string',
              example: 'Quiero que mis estudiantes entiendan cómo se formaron los grupos indígenas en Colombia y su relación con el territorio',
            },
            numero_estudiantes: {
              type: 'integer',
              example: 30,
              default: 30,
              description: 'Cantidad de estudiantes en el aula. Afecta el diseño de actividades.',
            },
            duracion_sesion: {
              type: 'string',
              example: '2 horas (doble sesión)',
              default: '1 hora',
              description: 'Duración total de la sesión de clase.',
            },
          },
        },
        IterarGuiaBody: {
          type: 'object',
          required: ['prompt_docente'],
          properties: {
            prompt_docente: {
              type: 'string',
              example: 'Agrega una actividad grupal al final de la guía',
            },
          },
        },
        BloqueContenido: {
          type: 'object',
          properties: {
            tipo:      { type: 'string', enum: ['texto', 'imagen', 'actividad', 'cuestionario'] },
            contenido: { type: 'string', example: '## Introducción\n...' },
            metadata:  { type: 'object', example: { duracion_min: 30 } },
          },
        },
        Guia: {
          type: 'object',
          properties: {
            id:               { type: 'integer', example: 1 },
            sesion_id:        { type: 'integer', example: 1 },
            dba_catalogo_id:  { type: 'integer', example: 1 },
            titulo:           { type: 'string',  example: 'Guía: La Constitución de 1991' },
            version_numero:   { type: 'integer', example: 1 },
            estado:           { type: 'string',  enum: ['borrador', 'publicado'] },
            es_version_activa:{ type: 'boolean', example: true },
            contenido_json:   { type: 'array',   items: { $ref: '#/components/schemas/BloqueContenido' } },
            creado_en:        { type: 'string',  format: 'date-time' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Mensaje de error' },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Sistema'],
          summary: 'Health check',
          responses: {
            200: {
              description: 'Servicio operativo',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status:    { type: 'string', example: 'ok' },
                      servicio:  { type: 'string', example: 'guias-que-conectan-core' },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/catalogo/grados': {
        get: {
          tags: ['Catálogo'],
          summary: 'Listar todos los grados escolares',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Lista de grados',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Grado' } } } },
            },
            401: { description: 'No autorizado' },
          },
        },
      },
      '/api/catalogo/competencias': {
        get: {
          tags: ['Catálogo'],
          summary: 'Listar competencias de Ciencias Sociales',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'area', in: 'query', schema: { type: 'string', example: 'ciencias_sociales' } },
          ],
          responses: {
            200: {
              description: 'Lista de competencias',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Competencia' } } } },
            },
            401: { description: 'No autorizado' },
          },
        },
      },
      '/api/catalogo/dbas': {
        get: {
          tags: ['Catálogo'],
          summary: 'Listar DBAs filtrados por grado y/o competencia',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'grado_id',       in: 'query', schema: { type: 'integer', example: 5 } },
            { name: 'competencia_id', in: 'query', schema: { type: 'integer', example: 1 } },
          ],
          responses: {
            200: {
              description: 'Lista de DBAs',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DBA' } } } },
            },
            401: { description: 'No autorizado' },
          },
        },
      },
      '/api/sesiones': {
        post: {
          tags: ['Sesiones'],
          summary: 'Iniciar sesión de generación de guía',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SesionBody' } } },
          },
          responses: {
            201: { description: 'Sesión creada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Sesion' } } } },
            400: { description: 'Datos inválidos' },
            401: { description: 'No autorizado' },
            404: { description: 'DBA no encontrado' },
          },
        },
      },
      '/api/sesiones/{id}': {
        get: {
          tags: ['Sesiones'],
          summary: 'Obtener detalle de una sesión',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Detalle de sesión', content: { 'application/json': { schema: { $ref: '#/components/schemas/Sesion' } } } },
            401: { description: 'No autorizado' },
            404: { description: 'Sesión no encontrada' },
          },
        },
      },
      '/api/guias/generate': {
        post: {
          tags: ['Guías'],
          summary: '★ Generar guía didáctica con IA',
          description: 'Genera una guía completa con ChatGPT alineada al DBA de la sesión. Si el docente incluye "[IMAGE: descripción]" en el prompt, DALL-E generará las imágenes automáticamente.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenerarGuiaBody' } } },
          },
          responses: {
            201: { description: 'Guía generada exitosamente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Guia' } } } },
            400: { description: 'Datos inválidos' },
            401: { description: 'No autorizado' },
            404: { description: 'Sesión no encontrada' },
          },
        },
      },
      '/api/guias/{id}/iterate': {
        post: {
          tags: ['Guías'],
          summary: 'Refinar guía existente con nuevo prompt',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/IterarGuiaBody' } } },
          },
          responses: {
            201: { description: 'Nueva versión generada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Guia' } } } },
            400: { description: 'Datos inválidos' },
            401: { description: 'No autorizado' },
            404: { description: 'Guía no encontrada' },
          },
        },
      },
      '/api/guias': {
        get: {
          tags: ['Guías'],
          summary: 'Listar guías (con filtros opcionales)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'grado_id',       in: 'query', schema: { type: 'integer' } },
            { name: 'dba_id',         in: 'query', schema: { type: 'integer' } },
            { name: 'estado',         in: 'query', schema: { type: 'string', enum: ['borrador', 'publicado'] } },
          ],
          responses: {
            200: {
              description: 'Lista de guías',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Guia' } } } },
            },
            401: { description: 'No autorizado' },
          },
        },
      },
      '/api/guias/{id}': {
        get: {
          tags: ['Guías'],
          summary: 'Obtener guía completa con contenido_json',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Guía encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Guia' } } } },
            401: { description: 'No autorizado' },
            404: { description: 'Guía no encontrada' },
          },
        },
        put: {
          tags: ['Guías'],
          summary: 'Edición manual de guía (crea nueva versión)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    titulo:         { type: 'string' },
                    contenido_json: { type: 'array', items: { $ref: '#/components/schemas/BloqueContenido' } },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Guía actualizada' },
            401: { description: 'No autorizado' },
            404: { description: 'Guía no encontrada' },
          },
        },
      },
      '/api/guias/{id}/publish': {
        post: {
          tags: ['Guías'],
          summary: 'Publicar guía (cambia estado a "publicado")',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Guía publicada' },
            401: { description: 'No autorizado' },
            404: { description: 'Guía no encontrada' },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
