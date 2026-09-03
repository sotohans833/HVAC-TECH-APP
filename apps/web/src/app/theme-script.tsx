/**
 * Applies the stored theme before first paint so the app never flashes light
 * then snaps to dark. Runs inline and synchronously; it is small enough to read
 * in full, which is the bar for anything using dangerouslySetInnerHTML.
 */
const script = `
(function () {
  try {
    var stored = localStorage.getItem('mf-theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
