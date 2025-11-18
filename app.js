import 'dotenv/config';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import session from 'express-session';
import methodOverride from 'method-override';
import flash from 'connect-flash';
import expressLayouts from 'express-ejs-layouts';
import { fileURLToPath } from 'url';

import indexRoutes from './routes/index.js';
import authRoutes from './routes/auth.js';
import forumRoutes from './routes/forum.js';
import adminRoutes from './routes/admin.js';
import miscRoutes from './routes/misc.js';

import { initDefaults } from './db/memory.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// init categories in memory
initDefaults();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');
app.use(expressLayouts);

app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.use(flash());
app.use((req, res, next) => {
  res.locals.csrfToken = 'dev-no-csrf'; // dummy placeholder (kein echter Schutz im Dev-Modus!)
  res.locals.currentUser = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

app.use(indexRoutes);
app.use(authRoutes);
app.use(forumRoutes);
app.use('/admin', adminRoutes);
app.use(miscRoutes);

app.use((req, res) => res.status(404).render('errors/404'));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Forum läuft (in-memory, csrf OFF) auf http://localhost:${port}`);
});
