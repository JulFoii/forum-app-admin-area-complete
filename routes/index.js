import { Router } from 'express';
import {
  getAllCategoriesSorted,
  getLatestThreads
} from '../db/memory.js';

const router = Router();

router.get('/', (req, res) => {
  const categories = getAllCategoriesSorted();
  const latestThreads = getLatestThreads(8);
  res.render('index', {
    categories,
    latestThreads
  });
});

export default router;
