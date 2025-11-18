(function () {
  console.log("[editor] init start");

  // Aktueller Kontext fürs Link-Einfügen
  let activeTextarea = null;
  let selStart = null;
  let selEnd = null;
  let hadSelection = false;

  // DOM-Refs zum Modal
  let linkUrlInput = null;
  let linkSelectionInfo = null;
  let linkNoSelectionInfo = null;
  let insertLinkConfirmBtn = null;
  let linkModalEl = null;

  // ----------- Hilfsfunktionen --------------

  function wrapSelection(textarea, before, after) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.slice(start, end);
    const newText = before + selected + after;

    textarea.value =
      value.slice(0, start) +
      newText +
      value.slice(end);

    const newSelStart = start + before.length;
    const newSelEnd = newSelStart + selected.length;
    textarea.focus();
    textarea.selectionStart = newSelStart;
    textarea.selectionEnd = newSelEnd;
  }

  function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    textarea.value =
      value.slice(0, start) +
      text +
      value.slice(end);

    const newPos = start + text.length;
    textarea.focus();
    textarea.selectionStart = newPos;
    textarea.selectionEnd = newPos;
  }

  // Build link HTML and insert it into the remembered textarea/selection
  function applyLinkFromModal() {
    if (!activeTextarea || !linkUrlInput) {
      console.warn("[editor] Kein aktives Textfeld beim Einfügen");
      return;
    }

    const rawUrl = linkUrlInput.value.trim();
    if (!rawUrl) {
      return;
    }

    const safeUrl = rawUrl.replace(/"/g, '&quot;');
    const value = activeTextarea.value;

    if (hadSelection && selStart !== null && selEnd !== null && selStart !== selEnd) {
      const selectedText = value.slice(selStart, selEnd);
      const before = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">`;
      const after = `</a>`;

      const newText =
        value.slice(0, selStart) +
        before +
        selectedText +
        after +
        value.slice(selEnd);

      activeTextarea.value = newText;

      // Cursor ans Ende vom eingefügten Link setzen
      const cursorPos = selStart + before.length + selectedText.length + after.length;
      activeTextarea.focus();
      activeTextarea.selectionStart = cursorPos;
      activeTextarea.selectionEnd = cursorPos;
    } else {
      // keine Auswahl -> URL selbst als Link einfügen
      const snippet = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`;
      insertAtCursor(activeTextarea, snippet);
    }
  }

  // Wird beim Klick auf den Link-Button in der Toolbar gerufen
  function prepareLinkModalForTextarea(textarea) {
    activeTextarea = textarea;
    selStart = textarea.selectionStart;
    selEnd = textarea.selectionEnd;
    hadSelection = selStart !== selEnd;

    // UI im Modal updaten
    if (linkSelectionInfo && linkNoSelectionInfo) {
      if (hadSelection) {
        linkSelectionInfo.style.display = "";
        linkNoSelectionInfo.style.display = "none";
      } else {
        linkSelectionInfo.style.display = "none";
        linkNoSelectionInfo.style.display = "";
      }
    }

    if (linkUrlInput) {
      linkUrlInput.value = "https://";
      // Fokus nach kleinem Timeout, weil Modal animiert öffnet
      setTimeout(() => {
        linkUrlInput.focus();
        linkUrlInput.select();
      }, 150);
    }
  }

  // ----------- Editor-Setup pro Rich-Editor-Block -----------

  function setupEditorWrapper(wrapper) {
    const textarea = wrapper.querySelector(".editor-area");
    if (!textarea) return;

    // Alle Toolbar-Buttons als echte Buttons absichern
    wrapper.querySelectorAll(".editor-toolbar button").forEach(btn => {
      if (!btn.getAttribute("type")) {
        btn.setAttribute("type", "button");
      }
    });

    const boldBtn = wrapper.querySelector('[data-cmd="bold"]');
    const italicBtn = wrapper.querySelector('[data-cmd="italic"]');
    const strikeBtn = wrapper.querySelector('[data-cmd="strike"]');
    const h2Btn = wrapper.querySelector('[data-cmd="h2"]');
    const codeInlineBtn = wrapper.querySelector('[data-cmd="code-inline"]');
    const codeBlockBtn = wrapper.querySelector('[data-cmd="code-block"]');

    // NEU: Link-Button hat .js-insert-link-btn und Bootstrap data-bs-toggle="modal"
    const linkBtn = wrapper.querySelector('.js-insert-link-btn');

    if (boldBtn) {
      boldBtn.addEventListener("click", e => {
        e.preventDefault();
        wrapSelection(textarea, "<strong>", "</strong>");
      });
    }
    if (italicBtn) {
      italicBtn.addEventListener("click", e => {
        e.preventDefault();
        wrapSelection(textarea, "<em>", "</em>");
      });
    }
    if (strikeBtn) {
      strikeBtn.addEventListener("click", e => {
        e.preventDefault();
        wrapSelection(textarea, "<del>", "</del>");
      });
    }
    if (h2Btn) {
      h2Btn.addEventListener("click", e => {
        e.preventDefault();
        wrapSelection(textarea, "<h2>", "</h2>");
      });
    }
    if (codeInlineBtn) {
      codeInlineBtn.addEventListener("click", e => {
        e.preventDefault();
        wrapSelection(textarea, "<code>", "</code>");
      });
    }
    if (codeBlockBtn) {
      codeBlockBtn.addEventListener("click", e => {
        e.preventDefault();
        wrapSelection(textarea, "<pre><code>", "</code></pre>");
      });
    }

    if (linkBtn) {
      linkBtn.addEventListener("click", e => {
        e.preventDefault();
        // Modal wird von Bootstrap geöffnet (data-bs-toggle="modal")
        // Wir merken uns hier nur Kontext für späteres Einfügen
        prepareLinkModalForTextarea(textarea);
      });
    }
  }

  // ----------- Init beim Laden -----------

  document.addEventListener("DOMContentLoaded", () => {
    console.log("[editor] DOMContentLoaded");

    linkModalEl = document.getElementById("insertLinkModal");
    linkUrlInput = document.getElementById("linkUrlInput");
    linkSelectionInfo = document.getElementById("linkSelectionInfo");
    linkNoSelectionInfo = document.getElementById("linkNoSelectionInfo");
    insertLinkConfirmBtn = document.getElementById("insertLinkConfirmBtn");

    if (insertLinkConfirmBtn) {
      insertLinkConfirmBtn.setAttribute("type", "button");
      insertLinkConfirmBtn.addEventListener("click", e => {
        e.preventDefault();
        applyLinkFromModal();

        // Modal schließen über Bootstrap API, wenn vorhanden
        if (window.bootstrap && window.bootstrap.Modal && linkModalEl) {
          const inst = bootstrap.Modal.getInstance(linkModalEl);
          if (inst) inst.hide();
        }
      });
    }

    document.querySelectorAll(".rich-editor").forEach(wrapper => {
      setupEditorWrapper(wrapper);
    });

    console.log("[editor] init done");
  });
})();