/**
 * Brand assets.
 *
 * The wordmark URL is the one the original markup shipped with, kept exactly as
 * it was and now referenced from one place instead of being pasted into the
 * header and the footer separately. `onerror` falls back to the text mark, so a
 * card never shows a broken image if the host stops serving it.
 */

export const LOGO_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuACMH9AjFrfo0rsl_vhZRsVanXCo7K1DiFaIkMNFh0kypibitPgbUjBoNgYOLY0gRXw49TmEr9IyApHOcN3pDv1X0CqQ2fI7QOczpDfI7qPQZWGOSG-g1NGMH1bN5NesJiXcoFbeIQICFL7_WpQxuJFAVUIZnZ8qbkg0mbeMEejJ0fF8Ex9uTSY3DLZtuv0mVCKMKxzSMpPIs4vC0BjKPz7zeS_vlOlagGa1e6wN4cgy1KyEwgIOa0yQw';

/**
 * An `<img>` for the wordmark that degrades to the Gujarati text mark.
 * @param {string} [className]
 * @returns {string}
 */
export function renderLogo(className = 'h-8 w-auto object-contain') {
  return `<img
    alt="Aaje Su? brand logo"
    class="${className}"
    src="${LOGO_URL}"
    onerror="this.style.display='none'"
  />`;
}
