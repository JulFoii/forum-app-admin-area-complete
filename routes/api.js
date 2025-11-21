import { Router } from 'express';
import {
  users,
  threads,
  posts,
  getAllCategoriesSorted,
  findThreadByPublicId,
  getPostsByThread
} from '../db/memory.js';

const router = Router();

// In echter Produktion aus .env
const API_KEY = process.env.API_KEY || 'dev-api-key';

function requireApiKey(req, res, next) {
  const key = req.header('x-api-key');
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Alle Threads (Lightweight-View)
router.get('/api/threads', requireApiKey, (req, res) => {
  const data = threads.map((t) => ({
    id: t._id,
    title: t.title,
    category: t.category,
    user: t.user,
    slug: t.slug,
    publicId: t.publicId,
    is_resolved: !!t.is_resolved,
    created_at: t.created_at
  }));
  res.json(data);
});

// Thread + Posts
router.get('/api/threads/:id', requireApiKey, (req, res) => {
  const t = findThreadByPublicId(req.params.id);
  if (!t) return res.status(404).json({ error: 'Thread not found' });

  const postList = getPostsByThread(t._id).map((p) => ({
    id: p._id,
    user: p.user,
    content: p.content,
    image_path: p.image_path,
    created_at: p.created_at
  }));

  res.json({
    thread: {
      id: t._id,
      title: t.title,
      category: t.category,
      user: t.user,
      slug: t.slug,
      publicId: t.publicId,
      is_resolved: !!t.is_resolved,
      created_at: t.created_at
    },
    posts: postList
  });
});

// User-Liste (ohne Passwörter)
router.get('/api/users', requireApiKey, (req, res) => {
  const data = users.map((u) => ({
    id: u._id,
    name: u.name,
    email: u.email,
    is_admin: !!u.is_admin,
    created_at: u.created_at
  }));
  res.json(data);
});

// Kategorien
router.get('/api/categories', requireApiKey, (req, res) => {
  const cats = getAllCategoriesSorted().map((c) => ({
    id: c._id,
    name: c.name,
    slug: c.slug,
    description: c.description
  }));
  res.json(cats);
});

export default router;
