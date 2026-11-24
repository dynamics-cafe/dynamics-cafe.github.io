/* The site footer, written once for every page (like the header in js/nav.js).
   Each page ends with:

     <footer class="site-footer" id="site-footer"></footer>
     <script src="js/footer.js?v=..."></script>

   To add or change a footer link, edit only this file. */
(function () {
  const footer = document.getElementById("site-footer");
  if (!footer) return;
  // Christmas line (js/season.js), when in season
  const festive = !!(window.DynamicsCafeSeason && window.DynamicsCafeSeason.has("footer"));
  footer.innerHTML = `
    <div class="container footer-content">
      <p>
        <strong>Dynamics Cafe ☕</strong>
      </p>
      <p class="footer-links">
        <a href="calendar/" target="_blank" rel="noopener noreferrer">Google Calendar</a>
        <a href="https://www.linkedin.com/company/dynamics-cafe/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        <a href="privacy.html">Privacy</a>
      </p>
    </div>
    <p class="container footer-credit">
      ${festive
        ? "Human taste, Claude&rsquo;s code, a lot of coffee and the odd hot chocolate ☕"
        : "Human taste, Claude&rsquo;s code, a lot of coffee ☕"}
    </p>`;
})();
