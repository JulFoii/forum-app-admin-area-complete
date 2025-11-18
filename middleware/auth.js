export function requireAuth(req, res, next) {
  if (req.session.user) return next();
  req.flash('error', 'Bitte einloggen.');
  return res.redirect('/login');
}

export function requireAdmin(req, res, next) {
  if (req.session.user?.is_admin) return next();
  // statt 403 direkt schöne Seite
  return res.redirect('/unauthorized');
}
