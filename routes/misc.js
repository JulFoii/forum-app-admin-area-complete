import { Router } from 'express';

const router = Router();

router.get('/unauthorized', (req, res) => {
  // Status 403, aber eigene Seite
  res.status(403).render('errors/unauthorized');
});

export default router;
