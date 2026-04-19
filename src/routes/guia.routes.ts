import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { guiaController } from '../controllers/guia.controller';
import { generarGuiaSchema, iterarGuiaSchema, editarGuiaSchema } from '../validators/guia.schema';

const router = Router();

router.use(authMiddleware as any);

// Generar guía con IA
router.post('/generate',      validate(generarGuiaSchema), guiaController.generar   as any);

// Listar (IMPORTANTE: rutas estáticas antes de /:id)
router.get('/mis-guias',      guiaController.misGuias  as any); 
router.get('/',               guiaController.listar    as any); 
router.get('/:id',            guiaController.obtener   as any);

// Acciones sobre una guía específica
router.post('/:id/iterate',   validate(iterarGuiaSchema), guiaController.iterar   as any);
router.put('/:id',            validate(editarGuiaSchema),  guiaController.editar   as any);
router.post('/:id/publish',                                guiaController.publicar as any);

export default router;
