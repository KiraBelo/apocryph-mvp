import { FONT_METADATA } from './fonts'

/**
 * Возвращает inline JS-скрипт для `<script dangerouslySetInnerHTML>` в layout.tsx.
 * Скрипт выполняется синхронно до первой отрисовки и, если у юзера сохранён
 * non-default `siteFont`, вставляет соответствующий <link> в <head> и проставляет
 * CSS-переменные --site-font / --serif-body / --game-font, чтобы выбранный
 * шрифт уже применялся к первой отрисовке без FOUC.
 */
export function buildFontsBootstrapScript(): string {
  const metadataJson = JSON.stringify(FONT_METADATA)
  return `(function(){try{
  var META = ${metadataJson};
  var raw = localStorage.getItem('apocryph-site-font');
  if (!raw || raw === 'Georgia, serif') return;
  var first = raw.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  if (!first) return;
  var meta = META[first];
  if (!meta) return;
  var enc = encodeURIComponent(first).replace(/%20/g, '+');
  var url;
  if (!meta.weights) {
    url = 'https://fonts.googleapis.com/css2?family=' + enc + '&display=swap';
  } else if (meta.italic) {
    var ws = meta.weights.split(';');
    var pairs = [];
    for (var i = 0; i < ws.length; i++) pairs.push('0,' + ws[i]);
    for (var j = 0; j < ws.length; j++) pairs.push('1,' + ws[j]);
    url = 'https://fonts.googleapis.com/css2?family=' + enc + ':ital,wght@' + pairs.join(';') + '&display=swap';
  } else {
    url = 'https://fonts.googleapis.com/css2?family=' + enc + ':wght@' + meta.weights + '&display=swap';
  }
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
  document.documentElement.style.setProperty('--site-font', raw);
  document.documentElement.style.setProperty('--serif-body', raw);
  document.documentElement.style.setProperty('--game-font', raw);
}catch(e){}})();`.trim()
}
