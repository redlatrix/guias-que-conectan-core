/**
 * SEEDER — Poblar el catálogo de grados, competencias y DBAs
 *
 * Uso:
 *   npm run seed
 *
 * Es idempotente: usa INSERT IGNORE para no duplicar filas.
 */

import 'dotenv/config';
import pool from '../config/db';

// ── Grados ────────────────────────────────────────────────
interface GradoSeed { nombre: string; numero: number; ciclo: string; }

const GRADOS: GradoSeed[] = [
  { nombre: 'Primer grado',    numero: 1,  ciclo: 'Básica primaria' },
  { nombre: 'Segundo grado',   numero: 2,  ciclo: 'Básica primaria' },
  { nombre: 'Tercer grado',    numero: 3,  ciclo: 'Básica primaria' },
  { nombre: 'Cuarto grado',    numero: 4,  ciclo: 'Básica primaria' },
  { nombre: 'Quinto grado',    numero: 5,  ciclo: 'Básica primaria' },
  { nombre: 'Sexto grado',     numero: 6,  ciclo: 'Básica secundaria' },
  { nombre: 'Séptimo grado',   numero: 7,  ciclo: 'Básica secundaria' },
  { nombre: 'Octavo grado',    numero: 8,  ciclo: 'Básica secundaria' },
  { nombre: 'Noveno grado',    numero: 9,  ciclo: 'Básica secundaria' },
  { nombre: 'Décimo grado',    numero: 10, ciclo: 'Media' },
  { nombre: 'Undécimo grado',  numero: 11, ciclo: 'Media' },
];

// ── Competencias de Ciencias Sociales ─────────────────────
interface CompetenciaSeed { nombre: string; tipo_cs: string; descripcion: string; }

const COMPETENCIAS: CompetenciaSeed[] = [
  {
    nombre: 'Relaciones con la historia y las culturas',
    tipo_cs: 'historia',
    descripcion: 'Comprende procesos históricos, culturales e identitarios de las sociedades.',
  },
  {
    nombre: 'Relaciones espaciales y ambientales',
    tipo_cs: 'geografia',
    descripcion: 'Analiza el territorio, el espacio geográfico y las relaciones con el ambiente.',
  },
  {
    nombre: 'Relaciones ético-políticas',
    tipo_cs: 'civica',
    descripcion: 'Comprende la organización política, los derechos y deberes ciudadanos.',
  },
  {
    nombre: 'Relaciones económicas',
    tipo_cs: 'economia',
    descripcion: 'Analiza los sistemas económicos y las dinámicas de producción y consumo.',
  },
];

// ── DBAs de muestra ───────────────────────────────────────
interface DBASeed {
  grado_numero: number;
  competencia_nombre: string;
  codigo_men: string;
  enunciado_oficial: string;
  evidencias_aprendizaje: string;
}

const DBAS: DBASeed[] = [
  // Grado 1
  {
    grado_numero: 1, competencia_nombre: 'Relaciones con la historia y las culturas',
    codigo_men: 'CS-G1-DBA1',
    enunciado_oficial: 'Reconoce su nombre, el de sus familiares y los de los integrantes de su comunidad cercana, identificando el papel que desempeña cada uno en el grupo.',
    evidencias_aprendizaje: 'Menciona el nombre de sus familiares y describe qué hacen. Identifica roles en su grupo familiar y escolar.',
  },
  {
    grado_numero: 1, competencia_nombre: 'Relaciones espaciales y ambientales',
    codigo_men: 'CS-G1-DBA2',
    enunciado_oficial: 'Distingue características del entorno natural (agua, suelo, aire, seres vivos) y comprende su importancia para la vida.',
    evidencias_aprendizaje: 'Describe elementos de su entorno natural. Reconoce la importancia del agua y el suelo para los seres vivos.',
  },
  // Grado 3
  {
    grado_numero: 3, competencia_nombre: 'Relaciones ético-políticas',
    codigo_men: 'CS-G3-DBA1',
    enunciado_oficial: 'Comprende que Colombia es un país con diversidad cultural y que todos sus habitantes tienen los mismos derechos.',
    evidencias_aprendizaje: 'Identifica las regiones de Colombia y sus tradiciones. Reconoce que todos los colombianos tienen derechos iguales.',
  },
  // Grado 4
  {
    grado_numero: 4, competencia_nombre: 'Relaciones con la historia y las culturas',
    codigo_men: 'CS-G4-DBA1',
    enunciado_oficial: 'Comprende que las comunidades indígenas prehispánicas desarrollaron formas de organización social, política y cultural propias.',
    evidencias_aprendizaje: 'Describe la organización social de los Muiscas y los Aztecas. Compara la vida de las comunidades prehispánicas con la actualidad.',
  },
  // Grado 5
  {
    grado_numero: 5, competencia_nombre: 'Relaciones ético-políticas',
    codigo_men: 'CS-G5-DBA1',
    enunciado_oficial: 'Comprende que la Constitución Política de Colombia de 1991 es la norma de normas y garantiza los derechos fundamentales de todos los ciudadanos.',
    evidencias_aprendizaje: 'Explica qué es la Constitución y para qué sirve. Identifica al menos cinco derechos fundamentales. Describe la estructura básica del Estado colombiano.',
  },
  {
    grado_numero: 5, competencia_nombre: 'Relaciones espaciales y ambientales',
    codigo_men: 'CS-G5-DBA2',
    enunciado_oficial: 'Comprende que Colombia posee una gran biodiversidad y reconoce la importancia de su conservación para el bienestar de las generaciones futuras.',
    evidencias_aprendizaje: 'Identifica las principales regiones naturales de Colombia. Explica por qué Colombia es un país megadiverso. Propone acciones para cuidar el medio ambiente.',
  },
  // Grado 6
  {
    grado_numero: 6, competencia_nombre: 'Relaciones con la historia y las culturas',
    codigo_men: 'CS-G6-DBA1',
    enunciado_oficial: 'Comprende que las primeras civilizaciones humanas desarrollaron formas de organización social, política, económica y cultural que influyeron en el mundo moderno.',
    evidencias_aprendizaje: 'Describe las características de Mesopotamia, Egipto y Grecia. Identifica aportes de las civilizaciones antiguas a la actualidad.',
  },
  // Grado 7
  {
    grado_numero: 7, competencia_nombre: 'Relaciones espaciales y ambientales',
    codigo_men: 'CS-G7-DBA1',
    enunciado_oficial: 'Comprende cómo las características geográficas de América Latina han condicionado los procesos históricos, económicos y culturales de sus pueblos.',
    evidencias_aprendizaje: 'Ubica las principales regiones de América Latina en el mapa. Relaciona el relieve y el clima con las actividades económicas. Analiza la influencia del territorio en la identidad cultural latinoamericana.',
  },
  // Grado 8
  {
    grado_numero: 8, competencia_nombre: 'Relaciones económicas',
    codigo_men: 'CS-G8-DBA1',
    enunciado_oficial: 'Comprende el surgimiento del capitalismo y sus efectos en la configuración del mundo moderno, incluyendo las desigualdades económicas y sociales.',
    evidencias_aprendizaje: 'Explica el origen del capitalismo y sus características. Analiza las consecuencias de la Revolución Industrial. Identifica desigualdades económicas en el mundo actual.',
  },
  // Grado 9
  {
    grado_numero: 9, competencia_nombre: 'Relaciones ético-políticas',
    codigo_men: 'CS-G9-DBA1',
    enunciado_oficial: 'Comprende los procesos de independencia de América Latina y su relación con las ideas de libertad, igualdad y soberanía popular.',
    evidencias_aprendizaje: 'Analiza las causas internas y externas de la Independencia. Reconoce el papel de los próceres en el proceso independentista. Establece conexiones entre las ideas ilustradas y los movimientos de independencia.',
  },
  // Grado 10
  {
    grado_numero: 10, competencia_nombre: 'Relaciones ético-políticas',
    codigo_men: 'CS-G10-DBA1',
    enunciado_oficial: 'Analiza los principales conflictos del siglo XX y sus consecuencias en la configuración del orden mundial contemporáneo.',
    evidencias_aprendizaje: 'Comprende las causas y consecuencias de las guerras mundiales. Analiza el surgimiento de organismos internacionales como la ONU. Reflexiona sobre la importancia de la paz y los Derechos Humanos.',
  },
  // Grado 11
  {
    grado_numero: 11, competencia_nombre: 'Relaciones económicas',
    codigo_men: 'CS-G11-DBA1',
    enunciado_oficial: 'Comprende los procesos de globalización y sus implicaciones económicas, culturales y políticas para Colombia y el mundo.',
    evidencias_aprendizaje: 'Define globalización e identifica sus dimensiones. Analiza las oportunidades y riesgos de la globalización para Colombia. Propone posiciones críticas frente a los efectos de la globalización.',
  },
];

// ── Main ──────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('\n🌱 Iniciando seeder del Core...\n');

  // 1. Grados
  console.log('── Grados ──────────────────────────────────────────');
  for (const g of GRADOS) {
    await pool.query(
      `INSERT IGNORE INTO grado (nombre, numero, ciclo, area) VALUES (?, ?, ?, 'ciencias_sociales')`,
      [g.nombre, g.numero, g.ciclo]
    );
    console.log(`  ✓  Grado ${g.numero}: ${g.nombre}`);
  }

  // 2. Competencias
  console.log('\n── Competencias ────────────────────────────────────');
  for (const c of COMPETENCIAS) {
    await pool.query(
      `INSERT IGNORE INTO competencia_cs (nombre, tipo_cs, descripcion, area) VALUES (?, ?, ?, 'ciencias_sociales')`,
      [c.nombre, c.tipo_cs, c.descripcion]
    );
    console.log(`  ✓  ${c.nombre}`);
  }

  // 3. DBAs
  console.log('\n── DBAs ────────────────────────────────────────────');
  for (const dba of DBAS) {
    // Obtener IDs
    const [gradoRows] = await pool.query<any[]>(
      'SELECT id FROM grado WHERE numero = ?', [dba.grado_numero]
    );
    const [compRows] = await pool.query<any[]>(
      'SELECT id FROM competencia_cs WHERE nombre = ?', [dba.competencia_nombre]
    );

    if (!gradoRows[0] || !compRows[0]) {
      console.warn(`  ⚠  DBA ${dba.codigo_men} - grado o competencia no encontrada`);
      continue;
    }

    await pool.query(
      `INSERT IGNORE INTO dba_catalogo
         (grado_id, competencia_id, codigo_men, enunciado_oficial, evidencias_aprendizaje)
       VALUES (?, ?, ?, ?, ?)`,
      [gradoRows[0].id, compRows[0].id, dba.codigo_men, dba.enunciado_oficial, dba.evidencias_aprendizaje]
    );
    console.log(`  ✓  ${dba.codigo_men} — Grado ${dba.grado_numero}`);
  }

  console.log('\n✅ Seeder completado.\n');
  console.log('Puedes probar el catálogo en:');
  console.log('  GET /api/catalogo/grados');
  console.log('  GET /api/catalogo/competencias');
  console.log('  GET /api/catalogo/dbas?grado_id=5&competencia_id=1\n');
}

main()
  .catch((err) => {
    console.error('\n❌ Error en el seeder:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
