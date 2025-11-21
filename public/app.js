(() => {
  // Einheitliches Bestätigungs-Modal für ALLE kritischen Aktionen.
  // Erwartung: jedes kritische <form> hat class="js-double-confirm"
  // und optional data-confirm-message="Wirklich löschen?".
  // Kein window.confirm mehr, keine Checkboxen mehr.

  const modalEl = document.getElementById('confirmDeleteModal');
  const msgEl = document.getElementById('confirmDeleteMessage');
  const titleEl = document.getElementById('confirmDeleteTitle');
  const confirmBtn = document.getElementById('confirmDeleteBtn');

  let pendingForm = null;

  // Falls bootstrap.Modal verfügbar ist
  if (modalEl && window.bootstrap && bootstrap.Modal) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

    // Wenn der/die User:in "Ja" klickt -> echtes Submit ausführen
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (!pendingForm) return;
        const formToSubmit = pendingForm;
        pendingForm = null;
        modal.hide();
        formToSubmit.submit();
      });
    }

    // Wir fangen alle Submits von Formularen mit js-double-confirm ab
    document.addEventListener('submit', e => {
      const form = e.target.closest('form.js-double-confirm');
      if (!form) return;

      // Normales Abschicken stoppen
      e.preventDefault();

      pendingForm = form;

      // Nachricht/Titel anpassen
      const message = form.dataset.confirmMessage || 'Diese Aktion wirklich ausführen?';
      if (msgEl) msgEl.textContent = message;

      if (titleEl && confirmBtn) {
        if (/lösch/i.test(message)) {
          titleEl.textContent = 'Löschen bestätigen';
          confirmBtn.classList.remove('btn-warning');
          confirmBtn.classList.add('btn-danger');
          confirmBtn.textContent = 'Ja, löschen';
        } else {
          titleEl.textContent = 'Bestätigen';
          confirmBtn.classList.remove('btn-danger');
          confirmBtn.classList.add('btn-warning');
          confirmBtn.textContent = 'Ja, ausführen';
        }
      }

      // Modal anzeigen
      modal.show();
    });

  } else {
    // Fallback: Wenn aus irgendeinem Grund bootstrap.Modal nicht existiert,
    // erlauben wir das Abschicken einfach direkt (kein Blocker).
    document.addEventListener('submit', e => {
      const form = e.target.closest('form.js-double-confirm');
      if (!form) return;
      // kein preventDefault -> läuft einfach durch
    });
  }
})();


// Simple dropdown handling for [data-bs-toggle="dropdown"]
(() => {
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-bs-toggle="dropdown"]');
    const openMenus = document.querySelectorAll('.dropdown-menu.show');

    if (toggle) {
      e.preventDefault();
      const parent = toggle.closest('.dropdown');
      const menu = parent ? parent.querySelector('.dropdown-menu') : null;
      const isShown = menu && menu.classList.contains('show');

      // Close all others
      openMenus.forEach(m => {
        if (m !== menu) m.classList.remove('show');
      });

      if (menu) {
        if (isShown) {
          menu.classList.remove('show');
        } else {
          menu.classList.add('show');
        }
      }
      return;
    }

    // Click außerhalb der Dropdowns schließt alle
    if (!e.target.closest('.dropdown')) {
      openMenus.forEach(m => m.classList.remove('show'));
    }
  });
})();

