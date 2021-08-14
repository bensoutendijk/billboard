import express from 'express';
import authRoutes from './auth';
import cardsRoutes from './cards';
import boardsRoutes from './boards'
import categoriesRoutes from './categories'

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/cards', cardsRoutes);
router.use('/boards', boardsRoutes);
router.use('/categories', categoriesRoutes);

export default router;
