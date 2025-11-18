import { threads, posts } from '../db/memory.js';

const replyCount = (id) => posts.filter((p) => p.thread === id).length;

function sortThreads(list, sort) {
  switch (sort) {
    case 'meist_diskutiert':
      return [...list].sort((a, b) => replyCount(b._id) - replyCount(a._id));
    case 'ungeloest_zuerst':
      return [...list].sort((a, b) => {
        if (a.is_resolved === b.is_resolved) {
          return new Date(b.created_at) - new Date(a.created_at);
        }
        return a.is_resolved ? 1 : -1;
      });
    case 'neueste_zuerst':
    default:
      return [...list].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
  }
}

export function listThreadsByCategory({
  categoryId,
  page = 1,
  pageSize = 20,
  sort = 'neueste_zuerst'
}) {
  let result = threads.filter((t) => t.category === categoryId);
  const totalItems = result.length;

  result = sortThreads(result, sort);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;

  const items = result.slice(start, end).map((t) => ({
    ...t,
    replyCount: replyCount(t._id)
  }));

  return {
    items,
    meta: { page: safePage, pageSize, totalPages, totalItems, sort }
  };
}

export function listPostsByThread({ threadId, page = 1, pageSize = 10 }) {
  const all = posts
    .filter((p) => p.thread === threadId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const totalItems = all.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  return {
    items: all.slice(start, end),
    meta: { page: safePage, pageSize, totalPages, totalItems }
  };
}

// nutzt die kurze publicId, fällt sonst auf _id zurück
export const buildThreadUrl = (t) =>
  `/t/${t.slug}-${t.publicId || t._id}`;
