import { Router } from 'express';
import bcrypt from 'bcryptjs';
import {
  users,
  createUser,
  findUserByEmail
} from '../db/memory.js';

const router = Router();

router.get('/register', (req, res) => res.render('auth/register'));
router.get('/login', (req, res) => res.render('auth/login'));

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    req.flash('error', 'Alle Felder ausfüllen.');
    return res.redirect('/register');
  }

  const existing = findUserByEmail(email);
  if (existing) {
    req.flash('error', 'E-Mail bereits registriert.');
    return res.redirect('/register');
  }

  const hash = await bcrypt.hash(password, 12);
  const is_admin = users.length === 0;

  createUser({
    name,
    email,
    password_hash: hash,
    is_admin
  });

  req.flash('success', is_admin
    ? 'Registrierung erfolgreich. Du bist Admin. Bitte einloggen.'
    : 'Registrierung erfolgreich. Bitte einloggen.'
  );
  res.redirect('/login');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = findUserByEmail(email);
  if (!user) {
    req.flash('error', 'Ungültige Login-Daten.');
    return res.redirect('/login');
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    req.flash('error', 'Ungültige Login-Daten.');
    return res.redirect('/login');
  }

  req.session.user = {
    _id: user._id,
    id: user._id,
    name: user.name,
    email: user.email,
    is_admin: !!user.is_admin
  };

  req.flash('success', 'Willkommen zurück!');
  res.redirect('/');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

export default router;
