import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  users,
  createTicket,
  getTicketsForUser,
  getTicketById,
  createTicketMessage,
  getMessagesByTicket,
  getAllTicketsWithMeta
} from '../db/memory.js';

let ioRef = null;

export function attachTicketIO(io) {
  ioRef = io;
}

export function notifyTicketStatusChange(ticketId, status, updatedByName) {
  if (!ioRef) return;
  ioRef.to(`ticket:${ticketId}`).emit('ticket:statusChange', {
    ticket_id: ticketId,
    status,
    updatedBy: updatedByName
  });
}

const router = Router();

// Eigene Tickets anzeigen
router.get('/tickets', requireAuth, (req, res) => {
  const myTickets = getTicketsForUser(req.session.user._id);
  const activeTickets = myTickets.filter(
    (t) => t.status !== 'closed'
  );
  const closedTickets = myTickets.filter(
    (t) => t.status === 'closed'
  );
  res.render('tickets/list', { activeTickets, closedTickets });
});

// Neues Ticket Formular
router.get('/tickets/new', requireAuth, (req, res) => {
  res.render('tickets/new');
});

// Neues Ticket anlegen
router.post('/tickets/new', requireAuth, (req, res) => {
  const { title, category, initial_message } = req.body;
  if (!title?.trim()) {
    req.flash('error', 'Titel ist erforderlich.');
    return res.redirect('/tickets/new');
  }
  const ticket = createTicket({
    user_id: req.session.user._id,
    title: title.trim(),
    category: category?.trim() || null
  });
  createTicketMessage({
    ticket_id: ticket._id,
    user_id: req.session.user._id,
    content: initial_message?.trim() || 'Ticket erstellt.'
  });
  req.flash('success', 'Ticket erstellt.');
  res.redirect(`/tickets/${ticket._id}`);
});

// Ticket-Detail + Chat
router.get('/tickets/:id', requireAuth, (req, res) => {
  const ticket = getTicketById(req.params.id);
  if (!ticket) {
    req.flash('error', 'Ticket nicht gefunden.');
    return res.redirect('/tickets');
  }
  const user = req.session.user;
  const isOwner = ticket.user_id === user._id;
  const isAdmin = !!user.is_admin;

  if (!isOwner && !isAdmin) {
    req.flash('error', 'Keine Berechtigung für dieses Ticket.');
    return res.redirect('/tickets');
  }

  const messages = getMessagesByTicket(ticket._id).map((m) => ({
    ...m,
    userName:
      (users.find((u) => u._id === m.user_id) || { name: 'Unbekannt' }).name
  }));

  res.render('tickets/detail', {
    ticket,
    messages,
    currentUser: user
  });
});

// Neue Nachricht (Form + Echtzeit)
router.post('/tickets/:id/message', requireAuth, (req, res) => {
  const ticket = getTicketById(req.params.id);
  if (!ticket) {
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(404).json({ ok: false, error: 'Ticket nicht gefunden.' });
    }
    req.flash('error', 'Ticket nicht gefunden.');
    return res.redirect('/tickets');
  }
  const user = req.session.user;
  const isOwner = ticket.user_id === user._id;
  const isAdmin = !!user.is_admin;

  if (!isOwner && !isAdmin) {
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(403).json({ ok: false, error: 'Keine Berechtigung.' });
    }
    req.flash('error', 'Keine Berechtigung.');
    return res.redirect('/tickets');
  }

  const content = (req.body.content || '').trim();
  if (!content) {
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(400).json({ ok: false, error: 'Nachricht darf nicht leer sein.' });
    }
    req.flash('error', 'Nachricht darf nicht leer sein.');
    return res.redirect(`/tickets/${ticket._id}`);
  }

  const msg = createTicketMessage({
    ticket_id: ticket._id,
    user_id: user._id,
    content
  });

  const payload = {
    id: msg._id,
    ticket_id: msg.ticket_id,
    user_id: msg.user_id,
    userName: user.name,
    content: msg.content,
    created_at: msg.created_at
  };

  if (ioRef) {
    ioRef.to(`ticket:${ticket._id}`).emit('ticket:newMessage', payload);
  }

  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.json({ ok: true, message: payload });
  }

  req.flash('success', 'Nachricht gesendet.');
  res.redirect(`/tickets/${ticket._id}`);
});

export default router;
