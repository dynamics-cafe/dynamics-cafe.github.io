/*
  Copy buttons: any <button data-copy-target="id"> copies the value of that input,
  so people never have to select a long address by hand.
*/
(() => {
  const buttons = document.querySelectorAll("[data-copy-target]");

  buttons.forEach(button => {
    const source = document.getElementById(button.dataset.copyTarget);
    if (!source) return;

    const original = button.textContent.trim();
    const status = document.getElementById("ics-status");
    let timer;

    const done = ok => {
      button.textContent = ok ? "Copied ✓" : "Press Ctrl+C";
      button.classList.toggle("is-copied", ok);
      if (status) {
        status.textContent = ok
          ? "Address copied. Paste it into your calendar app."
          : "Could not copy automatically. The address is selected: press Ctrl+C (Cmd+C on Mac).";
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        button.textContent = original;
        button.classList.remove("is-copied");
      }, 2500);
    };

    const fallback = () => {
      source.focus();
      source.select();
      source.setSelectionRange(0, source.value.length);
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      done(ok);
    };

    button.addEventListener("click", () => {
      const text = source.value;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => done(true), fallback);
      } else {
        fallback();
      }
    });
  });
})();
