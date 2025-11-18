import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import {
  getAllCategoriesSorted,
  createCategory,
  updateCategory,
  deleteCategory,
  deleteThread,
  getCategoryStats,
  getOpenReportSummaries,
  getTopUsers,
  users,
  threads,
  reports,
  findThreadById,
  findPostById,
  updateThread,
  deletePost,
  markReportsReviewed,
  getAdminLogs,
  createAdminLog
} from '../db/memory.js';
import { createSlug } from '../utils/slug.js';
import { buildThreadUrl } from '../services/threadService.js';

const router = Router();

// /admin -> Dashboard
router.get('/', requireAdmin, (req, res) => {
  res.redirect('/admin/dashboard');
});


/* Kategorien-CRUD */
router.get('/categories', requireAdmin, (req, res) => {
  const categories = getAllCategoriesSorted();
  res.render('admin/categories', { categories });
});

router.post('/category', requireAdmin, (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) {
    req.flash('error', 'Name ist erforderlich.');
    return res.redirect('/admin/categories');
  }
  const cat = createCategory({
    name: name.trim(),
    slug: createSlug(name.trim()),
    description: description || ''
  });
  createAdminLog({
    adminId: req.session.user._id,
    action: 'category_created',
    targetType: 'category',
    targetId: cat._id,
    note: cat.name
  });
  req.flash('success', 'Kategorie erstellt.');
  res.redirect('/admin/categories');
});

router.post('/category/:id/edit', requireAdmin, (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) {
    req.flash('error', 'Name ist erforderlich.');
    return res.redirect('/admin/categories');
  }
  const updated = updateCategory(req.params.id, {
    name: name.trim(),
    slug: createSlug(name.trim()),
    description: description || ''
  });
  if (updated) {
    createAdminLog({
      adminId: req.session.user._id,
      action: 'category_updated',
      targetType: 'category',
      targetId: updated._id,
      note: updated.name
    });
  }
  req.flash('success', 'Kategorie aktualisiert.');
  res.redirect('/admin/categories');
});

router.post('/category/:id/delete', requireAdmin, (req, res) => {
  deleteCategory(req.params.id);
  createAdminLog({
    adminId: req.session.user._id,
    action: 'category_deleted',
    targetType: 'category',
    targetId: req.params.id,
    note: ''
  });
  req.flash('success', 'Kategorie + zugehörige Threads gelöscht.');
  res.redirect('/admin/categories');
});

/* Threads-CRUD */
router.get('/threads', requireAdmin, (req, res) => {
  const cats = getAllCategoriesSorted();
  const list = threads.map((t) => {
    const cat = cats.find((c) => c._id === t.category);
    const author = users.find((u) => u._id === t.user);
    return {
      ...t,
      categoryName: cat ? cat.name : '',
      authorName: author ? author.name : 'Unbekannt',
      link: buildThreadUrl(t)
    };
  });
  res.render('admin/threads', { threads: list });
});

router.post('/thread/:id/edit', requireAdmin, (req, res) => {
  const thread = findThreadById(req.params.id);
  if (!thread) {
    req.flash('error', 'Thread nicht gefunden.');
    return res.redirect('/admin/threads');
  }
  const { title, is_resolved } = req.body;
  const updated = updateThread(thread._id, {
    title: title?.trim() || thread.title,
    is_resolved: is_resolved === '1'
  });
  createAdminLog({
    adminId: req.session.user._id,
    action: 'thread_updated',
    targetType: 'thread',
    targetId: updated._id,
    note: updated.title
  });
  req.flash('success', 'Thread aktualisiert.');
  res.redirect('/admin/threads');
});

router.post('/thread/:id/delete', requireAdmin, (req, res) => {
  deleteThread(req.params.id);
  createAdminLog({
    adminId: req.session.user._id,
    action: 'thread_deleted',
    targetType: 'thread',
    targetId: req.params.id,
    note: ''
  });
  req.flash('success', 'Thread gelöscht.');
  res.redirect('/admin/threads');
});

/* Report-Detail + Entscheidung */
router.get('/reports/:postId', requireAdmin, (req, res) => {
  const post = findPostById(req.params.postId);
  if (!post) return res.status(404).render('errors/404');
  const thread = findThreadById(post.thread);
  const relatedReports = reports.filter((r) => r.postId === post._id);
  res.render('admin/report-detail', {
    post,
    thread,
    reports: relatedReports
  });
});

router.post('/reports/:postId/resolve', requireAdmin, (req, res) => {
  const post = findPostById(req.params.postId);
  const { action, admin_reason } = req.body;
  const reason = admin_reason?.trim() || '';

  if (!post) {
    // Post existiert nicht mehr – nur Reports abschließen + Log
    markReportsReviewed(req.params.postId, {
      resolvedBy: req.session.user._id,
      resolution: reason || 'Post existiert nicht mehr.',
      action: action || 'unknown'
    });
    createAdminLog({
      adminId: req.session.user._id,
      action: 'report_resolved_missing_post',
      targetType: 'post',
      targetId: req.params.postId,
      note: reason
    });
    req.flash('success', 'Meldung wurde abgeschlossen.');
    return res.redirect('/admin/dashboard');
  }

  if (action === 'delete') {
    deletePost(post._id);
  }
  markReportsReviewed(post._id, {
    resolvedBy: req.session.user._id,
    resolution: reason,
    action
  });

  createAdminLog({
    adminId: req.session.user._id,
    action:
      action === 'delete' ? 'report_resolved_delete' : 'report_resolved_keep',
    targetType: 'post',
    targetId: post._id,
    note: reason
  });

  req.flash('success', 'Meldung wurde bearbeitet.');
  res.redirect('/admin/dashboard');
});

/* Admin-Log (read-only) */
router.get('/log', requireAdmin, (req, res) => {
  const logs = getAdminLogs().map((entry) => {
    const admin = users.find((u) => u._id === entry.adminId);
    return {
      ...entry,
      adminName: admin ? admin.name : '(unbekannt)'
    };
  });
  res.render('admin/log', { logs });
});

/* Dashboard */
router.get('/dashboard', requireAdmin, (req, res) => {
  const metrics = {
    totalUsers: users.length,
    catStats: getCategoryStats(),
    openReportsCount: getOpenReportSummaries().length
  };
  const reportedPostsSummary = getOpenReportSummaries();
  const topUsers = getTopUsers(5);
  res.render('admin/dashboard', { metrics, reportedPostsSummary, topUsers });
});

export default router;
