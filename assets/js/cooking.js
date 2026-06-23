/* ============================================================
   Mode cuisine plein ecran avec minuteur par etape.
   App.Cooking.open(recipe, servings)
   ============================================================ */
(function () {
  let state = null;  // { recipe, idx, sec, remaining, running, tid, wake }

  function open(recipe) {
    if (!recipe) return;
    close();
    state = { recipe, idx: 0, remaining: 0, running: false, tid: null, wake: null };
    const el = document.createElement('div');
    el.className = 'cook'; el.id = 'cook';
    el.innerHTML = `
      <div class="cook__bar">
        <button class="cook__icon" data-cook="close" title="Quitter">✕</button>
        <div class="cook__title">${esc(recipe.nom)}</div>
        <div class="cook__clock" id="cook-clock">00:00</div>
      </div>
      <div class="cook__body">
        <div class="cook__count" id="cook-count"></div>
        <div class="cook__step" id="cook-step"></div>
        <div class="cook__tctrl" id="cook-tctrl"></div>
      </div>
      <div class="cook__nav">
        <button class="btn" data-cook="prev">◀ Précédent</button>
        <div class="cook__dots" id="cook-dots"></div>
        <button class="btn btn--primary" data-cook="next">Suivant ▶</button>
      </div>`;
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    el.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    requestWake();
    renderStep();
  }

  function close() {
    const el = document.getElementById('cook');
    if (state && state.tid) clearInterval(state.tid);
    if (state && state.wake) { try { state.wake.release(); } catch (e) {} }
    document.removeEventListener('keydown', onKey);
    if (el) el.remove();
    document.body.style.overflow = '';
    state = null;
  }

  function onKey(e) {
    if (!state) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
  }
  function onClick(e) {
    const b = e.target.closest('[data-cook]');
    if (!b) return;
    const a = b.dataset.cook;
    if (a === 'close') close();
    else if (a === 'prev') go(-1);
    else if (a === 'next') go(1);
    else if (a === 'set') setTimer(parseInt(b.dataset.sec, 10));
    else if (a === 'toggle') toggleTimer();
    else if (a === 'reset') resetTimer();
  }
  function go(d) {
    const n = state.recipe.etapes.length;
    state.idx = Math.max(0, Math.min(n - 1, state.idx + d));
    renderStep();
  }

  function renderStep() {
    const r = state.recipe, n = r.etapes.length;
    document.getElementById('cook-count').textContent = `Étape ${state.idx + 1} / ${n}`;
    document.getElementById('cook-step').textContent = r.etapes[state.idx];
    document.getElementById('cook-dots').innerHTML =
      r.etapes.map((_, i) => `<span class="cook__dot${i === state.idx ? ' on' : ''}"></span>`).join('');
    const sec = parseDuration(r.etapes[state.idx]);
    const ctrl = document.getElementById('cook-tctrl');
    let html = '';
    if (sec) html += `<button class="btn btn--primary" data-cook="set" data-sec="${sec}">⏱ Lancer ${fmt(sec)}</button>`;
    html += [60, 180, 300, 600].map(s =>
      `<button class="btn btn--sm" data-cook="set" data-sec="${s}">${s / 60} min</button>`).join('');
    if (state.remaining > 0 || state.running)
      html += `<button class="btn btn--sm" data-cook="toggle">${state.running ? '⏸ Pause' : '▶ Reprendre'}</button>
               <button class="btn btn--sm" data-cook="reset">↺</button>`;
    ctrl.innerHTML = html;
  }

  function setTimer(sec) {
    state.remaining = sec; state.running = true;
    if (state.tid) clearInterval(state.tid);
    state.tid = setInterval(tick, 1000);
    updateClock(); renderStep();
  }
  function toggleTimer() {
    if (state.running) { state.running = false; clearInterval(state.tid); state.tid = null; }
    else if (state.remaining > 0) { state.running = true; state.tid = setInterval(tick, 1000); }
    renderStep();
  }
  function resetTimer() {
    state.running = false; if (state.tid) clearInterval(state.tid); state.tid = null;
    state.remaining = 0; updateClock(); renderStep();
  }
  function tick() {
    state.remaining--;
    if (state.remaining <= 0) { state.remaining = 0; state.running = false; clearInterval(state.tid); state.tid = null; ring(); renderStep(); }
    updateClock();
  }
  function updateClock() {
    const c = document.getElementById('cook-clock');
    if (c) { c.textContent = fmt(state.remaining); c.classList.toggle('cook__clock--run', state.running); }
  }

  function parseDuration(txt) {
    const t = txt.toLowerCase();
    let m = t.match(/(\d+)\s*(?:a|-|à)\s*(\d+)\s*min/);
    if (m) return parseInt(m[2], 10) * 60;
    m = t.match(/(\d+)\s*(?:min|minutes?)/);
    if (m) return parseInt(m[1], 10) * 60;
    m = t.match(/(\d+)\s*(?:s|sec|secondes?)\b/);
    if (m) return parseInt(m[1], 10);
    return 0;
  }
  function fmt(s) { const m = Math.floor(s / 60), x = s % 60; return (m < 10 ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x; }

  function ring() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.5, 1].forEach(d => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0.001, ac.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + d + 0.35);
        o.start(ac.currentTime + d); o.stop(ac.currentTime + d + 0.36);
      });
    } catch (e) {}
    if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]);
  }
  async function requestWake() {
    try { if ('wakeLock' in navigator) state.wake = await navigator.wakeLock.request('screen'); } catch (e) {}
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

  window.App = window.App || {};
  App.Cooking = { open, close };
})();
