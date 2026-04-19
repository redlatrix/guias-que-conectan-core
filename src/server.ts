import 'dotenv/config';
import app from './app';

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     Guías que Conectan — Core API          ║');
  console.log(`║     http://localhost:${PORT}                  ║`);
  console.log(`║     Docs: http://localhost:${PORT}/api-docs   ║`);
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
});
