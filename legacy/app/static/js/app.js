// Small helpers shared by admin + public pages.
(function () {
  function flashButton(btn, text) {
    if (!btn) return;
    var original = btn.dataset.label || btn.innerHTML;
    btn.dataset.label = original;
    btn.innerHTML = text;
    setTimeout(function () { btn.innerHTML = original; }, 1600);
  }

  window.copyText = function (text, btn) {
    function done() { flashButton(btn, "✓ Tersalin"); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done);
      return;
    }
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } finally { document.body.removeChild(ta); }
  };

  // <button data-copy="...">
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-copy]");
    if (btn) { e.preventDefault(); window.copyText(btn.dataset.copy, btn); }
  });

  // <form data-confirm="Are you sure?">
  document.addEventListener("submit", function (e) {
    var msg = e.target.dataset.confirm;
    if (msg && !window.confirm(msg)) e.preventDefault();
  });

  // Mobile sidebar toggle
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-sidebar-toggle]")) {
      document.getElementById("sidebar").classList.toggle("-translate-x-full");
      document.getElementById("sidebar-backdrop").classList.toggle("hidden");
    }
  });

  // Auto-hide flash messages
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-autohide]").forEach(function (el) {
      setTimeout(function () { el.remove(); }, 6000);
    });
  });
})();
