export function createSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9äöüß\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

// "slug-id" -> { requestedSlug, id } (id kann kurz oder lang sein)
export function splitSlugAndId(slugAndId) {
  const i = slugAndId.lastIndexOf('-');
  if (i === -1) {
    return { requestedSlug: '', id: slugAndId };
  }
  return {
    requestedSlug: slugAndId.slice(0, i),
    id: slugAndId.slice(i + 1)
  };
}
