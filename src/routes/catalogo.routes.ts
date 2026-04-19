import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { catalogoController } from '../controllers/catalogo.controller';

const router = Router();

// Todos los endpoints de catálogo requieren autenticación
router.use(authMiddleware as any);

router.get('/grados',       catalogoController.getGrados      as any);
router.get('/competencias', catalogoController.getCompetencias as any);
router.get('/dbas',         catalogoController.getDBAs         as any);

export default router;
