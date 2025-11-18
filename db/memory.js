import { v4 as uuid } from 'uuid';
import { createSlug } from '../utils/slug.js';

export const users = [];
export const categories = [];
export const threads = [];
export const posts = [];
export const reports = [];
export const adminLogs = [];

const now = () => new Date().toISOString();

/* USERS */
export function createUser({ name, email, password_hash, is_admin = false }) {
  const u = {
    _id: uuid(),
    name,
    email,
    password_hash,
    is_admin: !!is_admin,
    created_at: now(),
    updated_at: now()
  };
  users.push(u);
  return u;
}

export const findUserByEmail = (email) =>
  users.find((u) => u.email === email) || null;
export const findUserById = (id) =>
  users.find((u) => u._id === id) || null;

/* CATEGORIES */
export function createCategory({ name, slug, description }) {
  const c = {
    _id: uuid(),
    name,
    slug,
    description: description || '',
    created_at: now(),
    updated_at: now()
  };
  categories.push(c);
  return c;
}

export function updateCategory(id, { name, slug, description }) {
  const c = categories.find((x) => x._id === id);
  if (!c) return null;
  if (name !== undefined) c.name = name;
  if (slug !== undefined) c.slug = slug;
  if (description !== undefined) c.description = description;
  c.updated_at = now();
  return c;
}

export function deleteCategory(id) {
  const threadIds = threads.filter((t) => t.category === id).map((t) => t._id);

  for (let i = posts.length - 1; i >= 0; i--) {
    if (threadIds.includes(posts[i].thread)) posts.splice(i, 1);
  }
  for (let i = threads.length - 1; i >= 0; i--) {
    if (threads[i].category === id) threads.splice(i, 1);
  }

  const idx = categories.findIndex((c) => c._id === id);
  if (idx !== -1) categories.splice(idx, 1);
}

export const getAllCategoriesSorted = () =>
  [...categories].sort((a, b) => a.name.localeCompare(b.name));
export const getCategoryBySlug = (slug) =>
  categories.find((c) => c.slug === slug) || null;
export const findCategoryById = (id) =>
  categories.find((c) => c._id === id) || null;

/* THREADS */
export function createThread({ category, user, title }) {
  const id = uuid();
  const t = {
    _id: id,
    category,
    user,
    title,
    slug: createSlug(title),
    publicId: id.split('-')[0], // kurzer, stabiler Teil für schöne URLs
    is_resolved: false,
    created_at: now(),
    updated_at: now()
  };
  threads.push(t);
  return t;
}

export const findThreadById = (id) =>
  threads.find((t) => t._id === id) || null;

// Für URLs – akzeptiert publicId, ganze UUID oder Suffix
export function findThreadByPublicId(publicId) {
  return (
    threads.find((t) => t.publicId === publicId) ||
    threads.find((t) => t._id === publicId) ||
    threads.find((t) => t._id.endsWith(publicId)) ||
    null
  );
}

export function updateThread(id, data) {
  const t = findThreadById(id);
  if (!t) return null;
  if (data.title !== undefined) {
    t.title = data.title;
    t.slug = createSlug(t.title);
  }
  if (data.is_resolved !== undefined) {
    t.is_resolved = data.is_resolved;
  }
  t.updated_at = now();
  return t;
}

export function deleteThread(id) {
  for (let i = posts.length - 1; i >= 0; i--) {
    if (posts[i].thread === id) posts.splice(i, 1);
  }
  const idx = threads.findIndex((t) => t._id === id);
  if (idx !== -1) threads.splice(idx, 1);
}

export const getLatestThreads = (limit = 8) =>
  [...threads]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);

/* POSTS */
export function createPost({ thread, user, content, image_path }) {
  const p = {
    _id: uuid(),
    thread,
    user,
    content,
    image_path: image_path || null,
    created_at: now(),
    updated_at: now()
  };
  posts.push(p);
  return p;
}

export const findPostById = (id) =>
  posts.find((p) => p._id === id) || null;

export function updatePost(id, data) {
  const p = findPostById(id);
  if (!p) return null;
  if (data.content !== undefined) p.content = data.content;
  if (data.image_path !== undefined) p.image_path = data.image_path || null;
  p.updated_at = now();
  return p;
}

export function deletePost(id) {
  const idx = posts.findIndex((p) => p._id === id);
  if (idx !== -1) posts.splice(idx, 1);
}

export const getPostsByThread = (threadId) =>
  posts
    .filter((p) => p.thread === threadId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

/* REPORTS */
export function createReport({ postId, reason, reportedBy }) {
  const r = {
    _id: uuid(),
    postId,
    reason,
    reportedBy,
    status: 'open',
    created_at: now(),
    reviewed_at: null,
    resolvedBy: null,
    resolution: null,
    resolutionAction: null
  };
  reports.push(r);
  return r;
}

export function markReportsReviewed(postId, options = {}) {
  const { resolvedBy = null, resolution = null, action = null } = options;
  for (const r of reports) {
    if (r.postId === postId) {
      r.status = 'reviewed';
      r.reviewed_at = now();
      if (resolvedBy) r.resolvedBy = resolvedBy;
      if (resolution) r.resolution = resolution;
      if (action) r.resolutionAction = action;
    }
  }
}

export function getOpenReportSummaries() {
  const open = reports.filter((r) => r.status === 'open');
  const byPost = {};
  for (const r of open) {
    if (!byPost[r.postId]) byPost[r.postId] = [];
    byPost[r.postId].push(r);
  }
  return Object.entries(byPost).map(([postId, reps]) => {
    const post = posts.find((p) => p._id === postId);
    const thread = post ? threads.find((t) => t._id === post.thread) : null;
    const author = post ? users.find((u) => u._id === post.user) : null;
    return {
      postId,
      postExcerpt: post ? post.content.slice(0, 180) : '(gelöscht)',
      threadTitle: thread ? thread.title : '(Thread fehlt)',
      threadSlug: thread ? thread.slug : '',
      threadId: thread ? thread._id : '',
      authorName: author ? author.name : '(unbekannt)',
      reportCount: reps.length,
      lastReason: reps[reps.length - 1].reason,
      status: reps[0].status
    };
  });
}

/* STATS */
export function getCategoryStats() {
  return categories.map((cat) => {
    const catThreads = threads.filter((t) => t.category === cat._id);
    const catPosts = posts.filter((p) =>
      catThreads.some((t) => t._id === p.thread)
    );
    return {
      categoryId: cat._id,
      categoryName: cat.name,
      threadCount: catThreads.length,
      postCount: catPosts.length
    };
  });
}

export function getTopUsers(limit = 5) {
  const counts = {};
  for (const p of posts) {
    counts[p.user] = (counts[p.user] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([uid, count]) => {
      const u = users.find((x) => x._id === uid);
      return {
        userId: uid,
        username: u ? u.name : 'Unbekannt',
        postCount: count
      };
    })
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, limit);
}

/* ADMIN LOG – nur Append, kein Delete */
export function createAdminLog({ adminId, action, targetType, targetId, note }) {
  const entry = {
    _id: uuid(),
    adminId,
    action,
    targetType,
    targetId,
    note: note || '',
    created_at: now()
  };
  adminLogs.push(entry);
  return entry;
}

export function getAdminLogs() {
  return [...adminLogs].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}

/* INIT Default-Kategorien */
let initialized = false;
export function initDefaults() {
  if (initialized) return;
  initialized = true;

  if (categories.length === 0) {
    createCategory({
      name: 'Allgemein',
      slug: 'allgemein',
      description: 'Plauderecke für alles.'
    });
    createCategory({
      name: 'Vorstellungen',
      slug: 'vorstellungen',
      description: 'Sag hallo 👋'
    });
    createCategory({
      name: 'Hilfe & Support',
      slug: 'hilfe-support',
      description: 'Technische Fragen, Probleme, Bugs.'
    });
  }
}
