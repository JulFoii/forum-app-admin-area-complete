import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { uploadSingleImage } from '../middleware/upload.js';
import { splitSlugAndId } from '../utils/slug.js';
import {
  getAllCategoriesSorted,
  getCategoryBySlug,
  findCategoryById,
  createThread,
  findThreadById,
  updateThread,
  createPost,
  findPostById,
  updatePost,
  deletePost,
  deleteThread,
  users,
  createReport,
  findThreadByPublicId
} from '../db/memory.js';
import {
  listThreadsByCategory,
  listPostsByThread,
  buildThreadUrl
} from '../services/threadService.js';

const router = Router();

const findUserByIdLocal = (id) => users.find((u) => u._id === id) || null;
const isOwner = (currentUser, ownerId) =>
  currentUser && currentUser._id === ownerId;

// Kategorienliste
router.get('/categories', (req, res) => {
  const categories = getAllCategoriesSorted();
  res.render('forum/categories', { categories });
});

// Threads einer Kategorie
router.get('/c/:slug', (req, res) => {
  const { slug } = req.params;
  const { page = '1', sort = 'neueste_zuerst', q, unsolved, mine } = req.query;

  const category = getCategoryBySlug(slug);
  if (!category) return res.status(404).render('errors/404');

  // Kategorie-spezifische Suche
  if (q && q.trim() !== '') {
    const params = new URLSearchParams({
      q,
      categoryId: category._id,
      unsolved: unsolved === '1' ? '1' : '',
      mine: mine === '1' ? '1' : ''
    });
    return res.redirect(`/search?${params.toString()}`);
  }

  const { items, meta } = listThreadsByCategory({
    categoryId: category._id,
    page: parseInt(page, 10),
    pageSize: 20,
    sort
  });

  const threads = items.map((t) => ({
    ...t,
    badge: t.is_resolved ? 'Hilfe erhalten' : 'Offen',
    link: buildThreadUrl(t),
    author: (findUserByIdLocal(t.user)?.name) || 'Unbekannt'
  }));

  res.render('forum/threads', { category, threads, meta, sort });
});

// Thread-Detail via /t/:slug-:publicId
router.get('/t/:slugId', (req, res) => {
  const { slugId } = req.params;
  const { page = '1' } = req.query;
  const { requestedSlug, id } = splitSlugAndId(slugId);

  const thread = findThreadByPublicId(id);
  if (!thread) return res.status(404).render('errors/404');

  if (requestedSlug !== thread.slug) {
    return res.redirect(301, `${buildThreadUrl(thread)}?page=${page}`);
  }

  const category = findCategoryById(thread.category);
  const ownerUser = findUserByIdLocal(thread.user);

  const { items: postsPage, meta } = listPostsByThread({
    threadId: thread._id,
    page: parseInt(page, 10),
    pageSize: 10
  });

  const posts = postsPage.map((p) => {
    const u = findUserByIdLocal(p.user);
    return {
      ...p,
      author: u ? u.name : 'Unbekannt',
      is_owner: isOwner(req.session.user, p.user),
      image_url: p.image_path ? `/uploads/${p.image_path}` : null
    };
  });

  const threadView = {
    ...thread,
    category_name: category ? category.name : '',
    category_slug: category ? category.slug : '',
    author: ownerUser ? ownerUser.name : '',
    is_owner: isOwner(req.session.user, thread.user)
  };

  res.render('forum/thread', { thread: threadView, posts, meta });
});

// Legacy-Route: /t-legacy/:id -> 301
router.get('/t-legacy/:id', (req, res) => {
  const thread = findThreadById(req.params.id);
  if (!thread) return res.status(404).render('errors/404');
  res.redirect(301, buildThreadUrl(thread));
});

// Neuer Thread (Form)
router.get('/new-thread/:categorySlug?', requireAuth, (req, res) => {
  const categories = getAllCategoriesSorted();
  const selected = req.params.categorySlug || '';
  res.render('forum/new-thread', { categories, selected });
});

// Neuer Thread (Submit)
router.post('/new-thread', requireAuth, uploadSingleImage, (req, res) => {
  const { category_slug, title, content } = req.body;
  const category = getCategoryBySlug(category_slug);
  if (!category) {
    req.flash('error', 'Ungültige Kategorie.');
    return res.redirect('/new-thread');
  }
  const thread = createThread({
    category: category._id,
    user: req.session.user._id,
    title: title?.trim() || '(ohne Titel)'
  });

  createPost({
    thread: thread._id,
    user: req.session.user._id,
    content: content?.trim() || '',
    image_path: req.file ? req.file.filename : null
  });

  req.flash('success', 'Thread wurde erstellt.');
  res.redirect(buildThreadUrl(thread) + '#end');
});

// Antworten
router.post('/t/:id/reply', requireAuth, uploadSingleImage, (req, res) => {
  const thread = findThreadById(req.params.id);
  if (!thread) return res.status(404).render('errors/404');

  createPost({
    thread: thread._id,
    user: req.session.user._id,
    content: req.body.content?.trim() || '',
    image_path: req.file ? req.file.filename : null
  });

  req.flash('success', 'Antwort hinzugefügt.');
  res.redirect(buildThreadUrl(thread) + '#end');
});

// Thread-Titel bearbeiten
router.post('/t/:id/edit', requireAuth, (req, res) => {
  const thread = findThreadById(req.params.id);
  if (!thread) return res.status(404).render('errors/404');

  const allowed =
    isOwner(req.session.user, thread.user) || req.session.user.is_admin;
  if (!allowed) return res.status(403).render('errors/unauthorized');

  const { title } = req.body;
  if (title?.trim()) updateThread(thread._id, { title: title.trim() });

  req.flash('success', 'Thread aktualisiert.');
  res.redirect(buildThreadUrl(thread));
});

// Thread als erledigt markieren
router.post('/t/:id/resolve', requireAuth, (req, res) => {
  const thread = findThreadById(req.params.id);
  if (!thread) return res.status(404).render('errors/404');

  const allowed =
    isOwner(req.session.user, thread.user) || req.session.user.is_admin;
  if (!allowed) return res.status(403).render('errors/unauthorized');

  updateThread(thread._id, { is_resolved: true });
  req.flash('success', 'Thread als erledigt markiert.');
  res.redirect(buildThreadUrl(thread));
});

// Thread wieder öffnen
router.post('/t/:id/reopen', requireAuth, (req, res) => {
  const thread = findThreadById(req.params.id);
  if (!thread) return res.status(404).render('errors/404');

  const allowed =
    isOwner(req.session.user, thread.user) || req.session.user.is_admin;
  if (!allowed) return res.status(403).render('errors/unauthorized');

  updateThread(thread._id, { is_resolved: false });
  req.flash('success', 'Thread wieder geöffnet.');
  res.redirect(buildThreadUrl(thread));
});

// Post bearbeiten (Form)
router.get('/p/:id/edit', requireAuth, (req, res) => {
  const post = findPostById(req.params.id);
  if (!post) return res.status(404).render('errors/404');

  const allowed =
    isOwner(req.session.user, post.user) || req.session.user.is_admin;
  if (!allowed) return res.status(403).render('errors/unauthorized');

  const thread = findThreadById(post.thread);

  const viewPost = {
    ...post,
    image_url: post.image_path ? `/uploads/${post.image_path}` : null,
    thread_title: thread ? thread.title : '',
    thread_id: thread ? thread._id : ''
  };

  res.render('forum/edit-post', { post: viewPost });
});

// Post bearbeiten (Submit)
router.post('/p/:id/edit', requireAuth, uploadSingleImage, (req, res) => {
  const post = findPostById(req.params.id);
  if (!post) return res.status(404).render('errors/404');

  const allowed =
    isOwner(req.session.user, post.user) || req.session.user.is_admin;
  if (!allowed) return res.status(403).render('errors/unauthorized');

  const { content, remove_image } = req.body;
  const data = {};
  if (content?.trim()) data.content = content.trim();
  if (req.file) data.image_path = req.file.filename;
  else if (remove_image === '1') data.image_path = null;

  updatePost(post._id, data);
  const thread = findThreadById(post.thread);
  req.flash('success', 'Beitrag aktualisiert.');
  res.redirect(buildThreadUrl(thread) + '#end');
});

// Post löschen
router.post('/p/:id/delete', requireAuth, (req, res) => {
  const post = findPostById(req.params.id);
  if (!post) return res.status(404).render('errors/404');

  const allowed =
    isOwner(req.session.user, post.user) || req.session.user.is_admin;
  if (!allowed) return res.status(403).render('errors/unauthorized');

  const thread = findThreadById(post.thread);
  deletePost(post._id);
  req.flash('success', 'Beitrag gelöscht.');
  res.redirect(buildThreadUrl(thread) + '#end');
});

// Admin: Thread löschen
router.post('/admin/thread/:id/delete', requireAuth, (req, res) => {
  if (!req.session.user?.is_admin)
    return res.status(403).render('errors/unauthorized');
  const thread = findThreadById(req.params.id);
  if (!thread) return res.status(404).render('errors/404');
  deleteThread(thread._id);
  req.flash('success', 'Thread wurde gelöscht.');
  res.redirect('back');
});

// Melden-Form
router.get('/p/:id/report', (req, res) => {
  const post = findPostById(req.params.id);
  if (!post) return res.status(404).render('errors/404');
  const thread = findThreadById(post.thread);
  res.render('forum/report-form', { post, thread });
});

// Meldung absenden

// Meldung absenden
router.post('/p/:id/report', (req, res) => {
  const post = findPostById(req.params.id);
  if (!post) return res.status(404).render('errors/404');

  const { reason_code, reason_details } = req.body;
  const base = (reason_code || '').trim() || 'unbekannt';
  const extra = (reason_details || '').trim();
  const reason = extra ? `${base} – ${extra}` : base;

  const reporter = req.session.user ? req.session.user._id : 'anonymous';

  createReport({
    postId: post._id,
    reason,
    reportedBy: reporter
  });

  const thread = findThreadById(post.thread);
  req.flash('success', 'Danke für deine Meldung.');
  res.redirect(buildThreadUrl(thread) + `#post-${post._id}`);
});

export default router;
