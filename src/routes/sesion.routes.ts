import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { sesionController } from '../controllers/sesion.controller';
import { crearSesionSchema } from '../validators/sesion.schema';

const router = Router();

router.use(authMiddleware as any);

router.post('/',    validate(crearSesionSchema), sesionController.crear   as any);
router.get('/:id',                               sesionController.obtener as any);

export default router;
