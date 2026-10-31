// Click-to-load YouTube video (the twin of map.js; build/fragments.mjs videoBox): nothing is requested from
// YouTube until the visitor presses the facade button ([data-tk-video]) in a [data-tk-video-box] (the thumbnail
// is a local image). The box is replaced by a youtube-nocookie.com iframe that starts playing, in the box's own
// aspect ratio; the pressed button disappears with the box, so keyboard focus moves to the iframe (titled with the
// caption) instead of falling back to <body>. A <button> fires click on Enter and Space too. Without JS the button
// is hidden (site.css) and the "Přehrát na YouTube" link remains. Also accepts <div data-tk-video="<id>"> with a
// <button> inside (the embed URL is then built from the id).
document.addEventListener('click', function (e) {
  var btn = e.target.closest && e.target.closest('[data-tk-video-box] [data-tk-video], div[data-tk-video] button');
  if (!btn) return;
  var box = btn.closest('[data-tk-video-box]') || btn.closest('div[data-tk-video]');
  if (!box) return;
  var src = box.getAttribute('data-src') || '';
  var id = box.getAttribute('data-tk-video') || '';
  if (src.indexOf('https://www.youtube-nocookie.com/embed/') !== 0) {
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return;
    src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1';
  }
  var caption = box.querySelector('.tk-video-caption');
  var iframe = document.createElement('iframe');
  iframe.className = 'tk-video-frame';
  iframe.title = box.getAttribute('data-title') || (caption && caption.textContent.trim()) || btn.getAttribute('aria-label') || 'Video';
  iframe.src = src;
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  var ratio = getComputedStyle(box).aspectRatio;
  if (ratio && ratio !== 'auto') iframe.style.aspectRatio = ratio;
  box.replaceWith(iframe);
  iframe.focus({ preventScroll: true });
});
