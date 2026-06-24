/* ============================================================
   Ajouter / modifier une recette personnelle.
   - on colle le texte, on "analyse" pour extraire les ingredients
     (comparaison avec la base, sans IA) ;
   - on peut ajouter des ingredients inconnus (ex : poire) qui
     deviennent disponibles pour la liste de courses.
   ============================================================ */
(function () {
  const Store = () => App.Store, Data = () => App.Data;
  let cur = null;

  function blank() {
    return { id: null, nom: '', types: 'ms', saisons: new Set(['toute']), temps: 20, diff: 2, ig: 50,
      nut: { kcal: '', glucides: '', proteines: '', lipides: '', fibres: '' },
      ings: [], etapes: [], astuce: '' };
  }
  function fromRecipe(r) {
    return { id: r.id, nom: r.nom, types: r.types || 'ms', saisons: new Set(r.saisons || ['toute']),
      temps: r.temps || 20, diff: r.diff || 2, ig: r.ig != null ? r.ig : 50,
      nut: Object.assign({ kcal: '', glucides: '', proteines: '', lipides: '', fibres: '' }, r.nutrition || {}),
      ings: (r.ingredients || []).map(i => ({ nom: i.nom, qte: i.qte || '' })),
      etapes: (r.etapes || []).slice(), astuce: r.astuce || '' };
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

  function render(view, id) {
    cur = id && Data().byId[id] && Data().byId[id].custom ? fromRecipe(Data().byId[id]) : blank();
    const SAIS = [['toute', 'Toute l\'année'], ['printemps', 'Printemps'], ['ete', 'Été'], ['automne', 'Automne'], ['hiver', 'Hiver']];
    view.innerHTML = `<div class="detail">
      <button class="btn btn--sm" data-act="back">← Retour</button>
      <h2 style="margin:10px 0 4px">${cur.id ? '✏️ Modifier' : '➕ Ajouter'} une recette</h2>
      <p class="muted small">Collez votre recette, cliquez « Analyser » : les ingrédients connus sont détectés
        automatiquement. Ajoutez ceux qui manquent (ils deviennent réutilisables dans les courses).</p>

      <div class="set-card">
        <label class="lbl">Coller la recette (ingrédients + étapes)</label>
        <textarea id="ar-paste" class="field" rows="6" placeholder="Ex : Tarte aux poires.
200 g de farine, 100 g de beurre, 3 oeufs, 2 poires, 50 g de sucre.
Mélanger la farine et le beurre. Étaler. Disposer les poires. Cuire 30 min à 180°C."></textarea>
        <div style="margin-top:8px"><button class="btn btn--primary" data-ar="analyze">✨ Analyser le texte</button></div>
      </div>

      <div class="set-card">
        <label class="lbl">Nom de la recette</label>
        <input id="ar-nom" class="field" value="${esc(cur.nom)}" placeholder="Ex : Tarte aux poires" />

        <label class="lbl">Ingrédients</label>
        <div id="ar-ings"></div>
        <div class="courses-add" style="margin-top:8px">
          <input id="ar-ing-nom" class="field" placeholder="Ingrédient (ex : poire)" />
          <input id="ar-ing-qte" class="field" style="max-width:110px" placeholder="qté" />
          <button class="btn btn--primary" data-ar="adding">＋</button>
        </div>

        <label class="lbl">Étapes (une par ligne)</label>
        <textarea id="ar-etapes" class="field" rows="5" placeholder="Une étape par ligne…">${esc(cur.etapes.join('\n'))}</textarea>
      </div>

      <div class="set-card">
        <label class="lbl">Repas</label>
        <select id="ar-types" class="field">
          <option value="ms"${cur.types === 'ms' ? ' selected' : ''}>Midi et soir</option>
          <option value="m"${cur.types === 'm' ? ' selected' : ''}>Plutôt le midi</option>
          <option value="s"${cur.types === 's' ? ' selected' : ''}>Plutôt le soir</option>
        </select>
        <label class="lbl">Saisons</label>
        <div class="chips" id="ar-saisons">
          ${SAIS.map(([k, l]) => `<span class="chip${cur.saisons.has(k) ? ' active' : ''}" data-ar="saison" data-k="${k}">${l}</span>`).join('')}
        </div>
        <div class="ar-grid">
          <div><label class="lbl">Temps (min)</label><input id="ar-temps" class="field" type="number" min="1" value="${cur.temps}" /></div>
          <div><label class="lbl">Complexité /10</label><input id="ar-diff" class="field" type="number" min="1" max="10" value="${cur.diff}" /></div>
          <div><label class="lbl">Index glycémique</label><input id="ar-ig" class="field" type="number" min="0" max="100" value="${cur.ig}" /></div>
        </div>
        <details style="margin-top:10px">
          <summary class="muted small">Valeurs nutritionnelles par portion (facultatif)</summary>
          <div class="ar-grid" style="margin-top:8px">
            <div><label class="lbl">kcal</label><input id="ar-kcal" class="field" type="number" value="${cur.nut.kcal}" /></div>
            <div><label class="lbl">Glucides g</label><input id="ar-gluc" class="field" type="number" value="${cur.nut.glucides}" /></div>
            <div><label class="lbl">Protéines g</label><input id="ar-prot" class="field" type="number" value="${cur.nut.proteines}" /></div>
            <div><label class="lbl">Lipides g</label><input id="ar-lip" class="field" type="number" value="${cur.nut.lipides}" /></div>
            <div><label class="lbl">Fibres g</label><input id="ar-fib" class="field" type="number" value="${cur.nut.fibres}" /></div>
          </div>
        </details>
        <label class="lbl">Astuce (facultatif)</label>
        <input id="ar-astuce" class="field" value="${esc(cur.astuce)}" />
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:30px">
        <button class="btn btn--primary" data-ar="save">💾 Enregistrer la recette</button>
        ${cur.id ? `<button class="btn btn--danger" data-ar="delete">🗑️ Supprimer</button>` : ''}
        <button class="btn" data-act="back">Annuler</button>
      </div>
    </div>`;
    renderIngs();
  }

  function renderIngs() {
    const box = document.getElementById('ar-ings');
    if (!box) return;
    if (!cur.ings.length) { box.innerHTML = `<p class="muted small">Aucun ingrédient pour l'instant — analysez le texte ou ajoutez-en.</p>`; return; }
    box.innerHTML = cur.ings.map((i, k) => {
      const isNew = !Data().knownIngredient(i.nom) && !Store().isCustomIngredient(i.nom);
      return `<div class="ar-ing">
        <input class="field ar-ing-n" data-k="${k}" value="${esc(i.nom)}" />
        <input class="field ar-ing-q" data-k="${k}" style="max-width:120px" value="${esc(i.qte)}" placeholder="qté" />
        ${isNew ? '<span class="badge ig-modere" title="Nouvel ingrédient (sera mémorisé)">nouveau</span>' : ''}
        <button class="citem__del" data-ar="rmidx" data-k="${k}">✕</button>
      </div>`;
    }).join('');
  }

  function syncIngInputs() {
    document.querySelectorAll('.ar-ing-n').forEach(inp => { const k = +inp.dataset.k; if (cur.ings[k]) cur.ings[k].nom = inp.value; });
    document.querySelectorAll('.ar-ing-q').forEach(inp => { const k = +inp.dataset.k; if (cur.ings[k]) cur.ings[k].qte = inp.value; });
  }

  function onClick(e) {
    const b = e.target.closest('[data-ar]');
    if (!b) return;
    const a = b.dataset.ar;
    if (a === 'analyze') analyze();
    else if (a === 'adding') {
      const n = document.getElementById('ar-ing-nom'), q = document.getElementById('ar-ing-qte');
      if (n.value.trim()) { cur.ings.push({ nom: n.value.trim(), qte: q.value.trim() }); n.value = ''; q.value = ''; renderIngs(); n.focus(); }
    }
    else if (a === 'rmidx') { syncIngInputs(); cur.ings.splice(+b.dataset.k, 1); renderIngs(); }
    else if (a === 'saison') { toggleSaison(b.dataset.k); b.classList.toggle('active'); }
    else if (a === 'save') save();
    else if (a === 'delete') { if (confirm('Supprimer cette recette ?')) { Store().deleteCustomRecipe(cur.id); location.hash = '#/recettes'; } }
  }
  function toggleSaison(k) {
    if (cur.saisons.has(k)) cur.saisons.delete(k); else cur.saisons.add(k);
    if (k === 'toute' && cur.saisons.has('toute')) { cur.saisons = new Set(['toute']); refreshSaisonChips(); }
    else if (k !== 'toute') { cur.saisons.delete('toute'); refreshSaisonChips(); }
  }
  function refreshSaisonChips() {
    document.querySelectorAll('#ar-saisons .chip').forEach(c => c.classList.toggle('active', cur.saisons.has(c.dataset.k)));
  }

  function analyze() {
    syncIngInputs();
    const txt = document.getElementById('ar-paste').value.trim();
    if (!txt) return;
    if (!document.getElementById('ar-nom').value.trim()) {
      const first = txt.split('\n').map(s => s.trim()).filter(Boolean)[0] || '';
      document.getElementById('ar-nom').value = first.replace(/[.:].*$/, '').slice(0, 60);
    }
    const found = Data().extractIngredients(txt);
    const have = new Set(cur.ings.map(i => App.normName(i.nom)));
    found.forEach(f => { if (!have.has(App.normName(f.nom))) cur.ings.push(f); });
    // etapes : lignes qui ressemblent a des instructions (verbe / longueur)
    const lines = txt.split(/\n|\.\s+/).map(s => s.trim()).filter(s => s.length > 12);
    if (lines.length && !document.getElementById('ar-etapes').value.trim())
      document.getElementById('ar-etapes').value = lines.join('\n');
    renderIngs();
    App.UI.toast(found.length + ' ingrédient(s) détecté(s)');
  }

  function save() {
    syncIngInputs();
    const val = id => (document.getElementById(id).value || '').trim();
    const numv = id => { const v = parseFloat(val(id)); return isFinite(v) ? v : 0; };
    const nom = val('ar-nom');
    if (!nom) { App.UI.toast('Donnez un nom à la recette'); return; }
    const etapes = val('ar-etapes').split('\n').map(s => s.trim()).filter(Boolean);
    const ig = numv('ar-ig');
    const rec = {
      id: cur.id || ('c' + Date.now().toString(36)),
      custom: true, famille: 'perso', types: document.getElementById('ar-types').value,
      saisons: Array.from(cur.saisons.size ? cur.saisons : new Set(['toute'])),
      nom, temps: numv('ar-temps') || 20, diff: Math.min(10, Math.max(1, numv('ar-diff') || 2)),
      ig, ig_label: ig <= 50 ? 'bas' : (ig < 70 ? 'modere' : 'eleve'),
      nutrition: { kcal: numv('ar-kcal'), glucides: numv('ar-gluc'), proteines: numv('ar-prot'), lipides: numv('ar-lip'), fibres: numv('ar-fib') },
      ingredients: cur.ings.filter(i => i.nom.trim()).map(i => ({ nom: i.nom.trim(), qte: i.qte.trim(), subs: [] })),
      etapes: etapes.length ? etapes : ['(étapes à compléter)'],
      tags: ['perso'], astuce: val('ar-astuce'),
      lien: 'https://www.marmiton.org/recettes/recherche.aspx?aqt=' + encodeURIComponent(nom)
    };
    Store().upsertCustomRecipe(rec);
    App.UI.toast('💾 Recette enregistrée');
    location.hash = '#/recette/' + rec.id;
  }

  document.addEventListener('click', onClick);

  window.App = window.App || {};
  App.AddRecipe = { render };
})();
