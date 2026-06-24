/* ============================================================
   UI : routeur + ecrans + interactions.
   ============================================================ */
(function () {
  const Store = App.Store, Data = App.Data, C = App.CONFIG;
  const view = document.getElementById('view');

  /* ------------------------------------------------------------------ *
   *  Helpers                                                            *
   * ------------------------------------------------------------------ */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, m =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  const FR_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const FR_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
    'septembre', 'octobre', 'novembre', 'décembre'];

  function igBadge(r) {
    const cls = r.ig_label === 'bas' ? 'ig-bas' : r.ig_label === 'modere' ? 'ig-modere' : 'ig-eleve';
    const lbl = r.ig_label === 'bas' ? 'IG bas' : r.ig_label === 'modere' ? 'IG modéré' : 'IG élevé';
    return `<span class="badge ${cls}" title="Index glycémique estimé : ${r.ig}/100">${lbl} · ${r.ig}</span>`;
  }
  function diffLabel(d) {
    return d <= 2 ? 'Très facile' : d <= 4 ? 'Facile' : d <= 6 ? 'Intermédiaire' : d <= 8 ? 'Difficile' : 'Expert';
  }
  function cgBadge(r) {
    if (r.cg == null) return '';
    const cls = r.cg_label === 'basse' ? 'ig-bas' : r.cg_label === 'moderee' ? 'ig-modere' : 'ig-eleve';
    const lbl = r.cg_label === 'basse' ? 'CG basse' : r.cg_label === 'moderee' ? 'CG modérée' : 'CG élevée';
    return `<span class="badge ${cls}" title="Charge glycémique par portion : ${r.cg}">${lbl} · ${r.cg}</span>`;
  }
  function metaRow(r) {
    return `<div class="rcard__meta">
      <span class="badge badge--soft">⏱ ${r.temps} min</span>
      <span class="badge badge--soft" title="Complexité ${r.diff}/10">🔧 ${esc(diffLabel(r.diff))}</span>
      ${igBadge(r)}
    </div>`;
  }
  function favStar(id) {
    const on = Store.isFavori(id);
    return `<button class="rcard__fav" data-act="fav" data-fav-id="${id}" title="${on ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${on ? '★' : '☆'}</button>`;
  }
  function cardTop(r) {
    const ph = Data.photoFor(r);
    const img = ph ? `<img class="rcard__img" src="${esc(ph)}" alt="" loading="lazy" onerror="this.classList.add('hide')">` : '';
    return `<div class="rcard__top" data-act="open" data-id="${r.id}">${img}<span class="rcard__emoji">${Data.emojiFor(r)}</span></div>`;
  }
  function recipeCard(r) {
    const sel = selected.has(r.id) ? ' selected' : '';
    return `<article class="rcard${sel}" data-card-id="${r.id}">
      <div class="rcard__sel" data-act="sel" data-id="${r.id}">✓</div>
      ${favStar(r.id)}
      ${cardTop(r)}
      <div class="rcard__body">
        <div class="rcard__title" data-act="open" data-id="${r.id}">${esc(r.nom)}</div>
        ${metaRow(r)}
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn btn--sm btn--primary" data-act="addcourses" data-id="${r.id}">🛒 Courses</button>
          <button class="btn btn--sm" data-act="open" data-id="${r.id}">Voir</button>
        </div>
      </div>
    </article>`;
  }
  function grid(list) {
    if (!list.length) return `<div class="empty"><span class="big">🤷</span>Aucune recette ne correspond.</div>`;
    return `<div class="grid">${list.map(recipeCard).join('')}</div>`;
  }

  /* ------------------------------------------------------------------ *
   *  Etat local d'UI                                                    *
   * ------------------------------------------------------------------ */
  let planWeekStart = mondayOf(new Date());
  let recetteFamille = 'tous';
  let lastQuery = '';
  let coursesTab = 'liste';
  const selected = new Set();
  let selMode = false;
  let tokenVisible = false;
  let detailServings = 0, detailId = null;
  let installPrompt = null;

  function mondayOf(d) {
    const x = new Date(d); const day = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x;
  }
  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function fmtDate(d) { return `${d.getDate()} ${FR_MONTHS[d.getMonth()]}`; }

  /* ------------------------------------------------------------------ *
   *  Ecran : Planning                                                   *
   * ------------------------------------------------------------------ */
  function viewPlanning() {
    const today = new Date();
    const season = Data.seasonOf(planWeekStart);
    let html = `<div class="page-head"><h2>📅 Planning</h2><span class="spacer"></span>
        <span class="badge badge--soft" title="Les repas proposés tiennent compte de la saison">${Data.seasonEmoji(season)} ${esc(Data.seasonLabel(season))}</span></div>
      <div class="week-nav">
        <button class="btn btn--sm" data-act="prevweek">◀ Semaine</button>
        <button class="btn btn--sm" data-act="today">Aujourd'hui</button>
        <button class="btn btn--sm" data-act="nextweek">Semaine ▶</button>
        <span class="spacer"></span>
        <input type="date" id="plan-date" class="field" style="max-width:170px"
          value="${isoDate(planWeekStart)}" />
      </div>`;
    for (let i = 0; i < 7; i++) {
      const d = new Date(planWeekStart); d.setDate(d.getDate() + i);
      const p = Data.planForDate(d);
      const isToday = sameDay(d, today);
      html += `<div class="day${isToday ? ' today' : ''}">
        <div class="day__head">${FR_DAYS[i]} <span class="day__date">${fmtDate(d)}${isToday ? " · aujourd'hui" : ''}</span></div>
        ${mealRow(p.midi, 'Midi', '🥗')}
        ${mealRow(p.soir, 'Soir', '🍽️')}
      </div>`;
    }
    html += `<p class="hint">Le planning est le même sur tous les appareils. Touchez un repas pour voir la recette, ou
      <a href="#/recettes">parcourez toutes les recettes</a>.</p>`;
    view.innerHTML = html;
    const dp = document.getElementById('plan-date');
    if (dp) dp.addEventListener('change', e => {
      if (e.target.value) { planWeekStart = mondayOf(new Date(e.target.value + 'T00:00:00')); render(); }
    });
  }
  function mealRow(r, when, emoji) {
    if (!r) return '';
    return `<div class="meal" data-act="open" data-id="${r.id}">
      <div class="meal__emoji">${Data.emojiFor(r)}</div>
      <div class="meal__body">
        <div class="meal__when">${emoji} ${when}</div>
        <div class="meal__name">${esc(r.nom)}</div>
        <div class="meal__meta"><span class="badge badge--soft">⏱ ${r.temps} min</span>${igBadge(r)}</div>
      </div>
      <button class="btn btn--sm" data-act="addcourses" data-id="${r.id}">🛒</button>
    </div>`;
  }
  function isoDate(d) { return d.toISOString().slice(0, 10); }

  /* ------------------------------------------------------------------ *
   *  Ecran : Recettes                                                   *
   * ------------------------------------------------------------------ */
  const FAMILLES = [['tous', 'Toutes'], ['oeuf', '🍳 Œufs'], ['volaille', '🍗 Volaille'],
    ['poisson', '🐟 Poisson'], ['boeuf', '🥩 Bœuf'], ['porc', '🥓 Porc'],
    ['legumineuse', '🫘 Légumineuses'], ['vege', '🥗 Végétarien'], ['soupe', '🥣 Soupes'], ['salade', '🥙 Salades']];

  function viewRecettes() {
    let list = Data.recipes.slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    if (recetteFamille !== 'tous') list = list.filter(r => r.famille === recetteFamille);
    const chips = FAMILLES.map(([k, l]) =>
      `<span class="chip${recetteFamille === k ? ' active' : ''}" data-act="famille" data-fam="${k}">${esc(l)}</span>`).join('');
    view.innerHTML = `<div class="page-head">
        <h2>🍽️ Recettes <span class="muted small">(${Data.recipes.length})</span></h2>
        <span class="spacer"></span>
        <a class="btn btn--sm" href="#/ajouter">➕ Ajouter</a>
        <button class="btn btn--sm ${selMode ? 'btn--primary' : ''}" data-act="selmode">${selMode ? '✓ Sélection' : '☑️ Sélection'}</button>
      </div>
      <div class="chips">${chips}</div>
      ${grid(list)}`;
  }

  /* ------------------------------------------------------------------ *
   *  Ecran : Recherche                                                  *
   * ------------------------------------------------------------------ */
  function viewRecherche() {
    view.innerHTML = `<div class="page-head"><h2>🔍 Recherche</h2></div>
      <div class="searchbox"><input id="q" class="field" placeholder="tomate carotte, IG entre 40 et 60, moins de 20 min…" value="${esc(lastQuery)}" /></div>
      <div id="parsed" class="parsed"></div>
      <p class="examples">Essayez :
        <code data-act="ex" data-ex="tomate carotte">tomate carotte</code>
        <code data-act="ex" data-ex="poulet">poulet</code>
        <code data-act="ex" data-ex="repas à l'index glycémique entre 40 et 60">IG entre 40 et 60</code>
        <code data-act="ex" data-ex="moins de 20 min facile">rapide & facile</code>
        <code data-act="ex" data-ex="glucides moins de 20">glucides &lt; 20 g</code>
        <code data-act="ex" data-ex="proteines plus de 30">protéines &gt; 30 g</code>
      </p>
      <div id="results"></div>`;
    const q = document.getElementById('q');
    let t;
    const run = () => { lastQuery = q.value; renderResults(q.value); };
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 180); });
    q.focus();
    if (lastQuery) { q.value = lastQuery; }
    renderResults(q.value);
  }
  function renderResults(query) {
    const parsedEl = document.getElementById('parsed');
    const resEl = document.getElementById('results');
    if (!parsedEl || !resEl) return;
    if (!query.trim()) {
      parsedEl.innerHTML = '';
      resEl.innerHTML = `<p class="hint">Tapez un ou plusieurs ingrédients (recherche « ET »), ou un critère
        nutritionnel : index glycémique, glucides, calories, protéines, temps, complexité…</p>`;
      return;
    }
    const { results, terms, filters } = Data.search(query);
    const tags = terms.map(t => `<span class="tag">${esc(t)}</span>`)
      .concat(filters.map(f => `<span class="tag tag--num">${esc(f.label)}</span>`)).join('');
    parsedEl.innerHTML = tags + `<span class="muted small" style="align-self:center">→ ${results.length} résultat(s)</span>`;
    resEl.innerHTML = grid(results.sort((a, b) => a.ig - b.ig));
  }

  /* ------------------------------------------------------------------ *
   *  Ecran : Favoris                                                    *
   * ------------------------------------------------------------------ */
  function viewFavoris() {
    const list = Data.recipes.filter(r => Store.isFavori(r.id)).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    view.innerHTML = `<div class="page-head">
        <h2>⭐ Mes recettes favorites <span class="muted small">(${list.length})</span></h2>
        <span class="spacer"></span>
        ${list.length ? `<button class="btn btn--sm ${selMode ? 'btn--primary' : ''}" data-act="selmode">${selMode ? '✓ Sélection' : '☑️ Sélection'}</button>` : ''}
      </div>
      ${list.length ? grid(list) : `<div class="empty"><span class="big">⭐</span>Aucun favori pour l'instant.<br>
        Touchez l'étoile sur une recette pour l'ajouter ici.</div>`}`;
  }

  /* ------------------------------------------------------------------ *
   *  Ecran : Courses                                                    *
   * ------------------------------------------------------------------ */
  function viewCourses() {
    const tabBtn = (k, l) => `<button class="chip${coursesTab === k ? ' active' : ''}" data-act="ctab" data-tab="${k}">${l}</button>`;
    let body = '';
    if (coursesTab === 'liste') body = coursesListe();
    else if (coursesTab === 'favoris') body = coursesFavoris();
    else if (coursesTab === 'photos') body = coursesPhotos();
    else body = coursesListesSauvegardees();
    const np = Store.activePhotos().length;
    view.innerHTML = `<div class="page-head"><h2>🛒 Courses</h2></div>
      <div class="list-tabs">
        ${tabBtn('liste', '🛒 Liste du jour')}
        ${tabBtn('photos', '📷 Photos' + (np ? ' (' + np + ')' : ''))}
        ${tabBtn('favoris', '⭐ Favoris')}
        ${tabBtn('listes', '💾 Mes listes')}
      </div>${body}`;
    wireCoursesInputs();
  }

  function coursesListe() {
    const items = Store.activeCourses();
    const total = items.length, pris = items.filter(i => i.coche).length;
    let html = `<div class="courses-add">
        <input id="course-input" class="field" placeholder="Ajouter un produit (ex : café, éponges…)" />
        <button class="btn btn--primary" data-act="addcourse">＋</button>
      </div>
      <div class="chips">
        <span class="chip" data-act="addfav-list">⭐ Ajouter mes favoris</span>
        <span class="chip" data-act="savelist">💾 Enregistrer la liste</span>
        <span class="chip" data-act="clear-checked">🧹 Retirer les pris</span>
        <span class="chip" data-act="clear-all">🗑️ Tout vider</span>
      </div>`;
    if (!total) {
      html += `<div class="empty"><span class="big">🛒</span>Votre liste est vide.<br>
        Ajoutez un produit, vos favoris, ou envoyez des ingrédients depuis une recette.</div>`;
      return html;
    }
    const todo = items.filter(i => !i.coche);
    const done = items.filter(i => i.coche);

    if (todo.length === 0) {
      html += `<div class="done-banner">🎉 Courses finies !<span>Les ${total} articles sont pris — rien d'oublié.</span></div>`;
    } else {
      html += `<p class="muted small">${pris}/${total} pris — touchez un produit quand vous l'avez mis dans le panier.</p>`;
      // articles a prendre, groupes par rayon
      const byRayon = {};
      todo.forEach(i => { (byRayon[i.rayon] = byRayon[i.rayon] || []).push(i); });
      const order = App.RAYON_ORDER.filter(r => byRayon[r]).concat(Object.keys(byRayon).filter(r => App.RAYON_ORDER.indexOf(r) < 0));
      order.forEach(rayon => {
        html += `<div class="rayon"><div class="rayon__title">${App.RAYON_EMOJI[rayon] || '🛒'} ${esc(rayon)}</div>`;
        byRayon[rayon].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).forEach(i => { html += citem(i); });
        html += `</div>`;
      });
    }
    // articles deja pris, regroupes en bas
    if (done.length) {
      html += `<div class="rayon"><div class="rayon__title rayon__title--done">✓ Achetés (${done.length})
        <button class="btn btn--sm" data-act="clear-checked" style="margin-left:auto">Retirer de la liste</button></div>`;
      done.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).forEach(i => { html += citem(i); });
      html += `</div>`;
    }
    return html;
  }
  function citem(i) {
    const fav = Store.isIngFav(i.nom);
    const pc = Store.photosForLabel(i.nom).length;
    return `<div class="citem${i.coche ? ' done' : ''}" data-act="coche" data-id="${i.id}">
      <div class="citem__check">${i.coche ? '✓' : ''}</div>
      <div class="citem__name">${esc(i.nom)}</div>
      ${i.qte ? `<div class="citem__qte">${esc(i.qte)}</div>` : ''}
      <button class="citem__star${pc ? ' haspic' : ''}" data-act="item-photo" data-name="${esc(i.nom)}" title="${pc ? pc + ' photo(s) — voir l\'onglet Photos' : 'Ajouter une photo'}">📷${pc ? `<sup>${pc}</sup>` : ''}</button>
      <button class="citem__star${fav ? ' isfav' : ''}" data-act="cfav" data-name="${esc(i.nom)}" title="Ingrédient favori">${fav ? '★' : '☆'}</button>
      <button class="citem__del" data-act="cdel" data-id="${i.id}" title="Supprimer">✕</button>
    </div>`;
  }
  function coursesPhotos() {
    const photos = Store.activePhotos().sort((a, b) => (b.at || 0) - (a.at || 0));
    let html = `<p class="muted small">Photos rattachées à un article (ex : reconnaître le bon paquet en rayon).
      Ajoutez-en avec 📷 dans « Liste du jour ». La liste, elle, n'affiche qu'un petit 📷.</p>`;
    if (!photos.length) {
      html += `<div class="empty"><span class="big">📷</span>Aucune photo pour l'instant.</div>`;
      return html;
    }
    const groups = {};
    photos.forEach(p => { (groups[p.label] = groups[p.label] || []).push(p); });
    Object.keys(groups).sort((a, b) => a.localeCompare(b, 'fr')).forEach(label => {
      html += `<div class="rayon__title">🛒 ${esc(label)}</div><div class="photo-grid">`;
      groups[label].forEach(p => {
        html += `<div class="photo-cell">
          <img src="${esc(p.url)}" alt="${esc(label)}" loading="lazy" onerror="this.classList.add('hide');this.parentNode.classList.add('imgerr')">
          <button class="photo-del" data-act="photo-del" data-id="${p.id}" title="Supprimer">✕</button>
          ${p.by ? `<span class="photo-by">${esc(p.by)}</span>` : ''}
        </div>`;
      });
      html += `</div>`;
    });
    return html;
  }

  function coursesFavoris() {
    const favs = Store.ingFav().sort((a, b) => a.localeCompare(b, 'fr'));
    let html = `<div class="courses-add">
        <input id="ingfav-input" class="field" placeholder="Nouvel ingrédient favori (ex : lait, œufs…)" />
        <button class="btn btn--primary" data-act="addingfav">＋</button>
      </div>`;
    if (!favs.length) {
      html += `<div class="empty"><span class="big">⭐</span>Aucun ingrédient favori.<br>
        Ajoutez ici les produits que vous achetez souvent.</div>`;
      return html;
    }
    html += `<div class="chips"><span class="chip" data-act="ingfav-add-all">🛒 Tout ajouter à la liste</span></div>
      <p class="muted small">Touchez un favori pour l'ajouter à la liste (✓ = déjà dedans, re-touchez pour l'enlever). ✕ = retirer des favoris.</p>`;
    const inList = {};
    Store.activeCourses().forEach(c => inList[App.normName(c.nom)] = true);
    favs.forEach(n => {
      const on = inList[App.normName(n)];
      html += `<div class="citem${on ? ' in-list' : ''}" data-act="ingfav-toggle" data-name="${esc(n)}">
        <div class="citem__check">${on ? '✓' : '＋'}</div>
        <div class="citem__name">${esc(n)}</div>
        <button class="citem__del" data-act="ingfav-remove" data-name="${esc(n)}" title="Retirer des favoris">✕</button>
      </div>`;
    });
    return html;
  }

  function coursesListesSauvegardees() {
    const listes = Store.activeListes().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    let html = `<p class="muted small">Réutilisez vos listes habituelles. « Ajouter » fusionne avec la liste du jour,
      « Remplacer » repart de zéro.</p>`;
    if (!listes.length) {
      html += `<div class="empty"><span class="big">💾</span>Aucune liste enregistrée.<br>
        Créez une liste dans l'onglet « Liste du jour » puis « Enregistrer la liste ».</div>`;
      return html;
    }
    listes.forEach(l => {
      html += `<div class="saved-list">
        <b>${esc(l.nom)}</b>
        <span class="muted small">${l.items.length} article(s)</span>
        <button class="btn btn--sm btn--primary" data-act="list-load" data-id="${l.id}">Ajouter</button>
        <button class="btn btn--sm" data-act="list-replace" data-id="${l.id}">Remplacer</button>
        <button class="btn btn--sm btn--danger" data-act="list-del" data-id="${l.id}">✕</button>
      </div>`;
    });
    return html;
  }

  function wireCoursesInputs() {
    const ci = document.getElementById('course-input');
    if (ci) ci.addEventListener('keydown', e => { if (e.key === 'Enter') addCourseFromInput(); });
    const fi = document.getElementById('ingfav-input');
    if (fi) fi.addEventListener('keydown', e => {
      if (e.key === 'Enter' && fi.value.trim()) { Store.toggleIngFav(fi.value.trim()); fi.value = ''; }
    });
  }
  function addCourseFromInput() {
    const ci = document.getElementById('course-input');
    if (ci && ci.value.trim()) { Store.addCourse(ci.value.trim()); ci.value = ''; ci.focus(); toast('Ajouté à la liste'); }
  }

  /* ------------------------------------------------------------------ *
   *  Ecran : Reglages                                                   *
   * ------------------------------------------------------------------ */
  function viewReglages() {
    const on = Store.syncEnabled();
    const statusTxt = on ? `<span class="status-dot ok"></span>Synchronisation activée`
      : `<span class="status-dot off"></span>Mode local (cet appareil uniquement)`;
    const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    view.innerHTML = `<div class="page-head"><h2>⚙️ Réglages</h2></div>

      <div class="set-card">
        <h3>📲 Installer l'application</h3>
        ${standalone
          ? `<p class="small"><span class="status-dot ok"></span>L'application est installée. 👍</p>`
          : installPrompt
            ? `<p class="small">Installez « Mes Repas » comme une vraie appli (plein écran, sans la barre Chrome, icône salade).</p>
               <button class="btn btn--primary" data-act="install">📲 Installer l'application</button>`
            : `<p class="small muted">Le bouton d'installation apparaît dès que le téléphone est prêt :
               restez quelques secondes sur la page (et touchez l'écran une fois), il s'affichera ici et en haut de l'écran.
               Sinon, menu <b>⋮</b> de Chrome → « Installer l'application ». Sur iPhone : <b>Partager → Sur l'écran d'accueil</b>.</p>`}
        <p class="small muted" style="margin-top:12px">Version pas à jour ou souci d'affichage ?</p>
        <button class="btn btn--sm" data-act="force-update">🔄 Forcer la mise à jour (Repas uniquement)</button>
      </div>

      <div class="set-card">
        <h3>☁️ Synchronisation entre appareils</h3>
        <p class="small muted">${statusTxt}</p>
        <p class="small">Pour partager vos listes de courses et favoris entre votre téléphone et celui de votre épouse,
        l'app enregistre les données dans le fichier <code>${esc(C.statePath)}</code> de votre dépôt GitHub. Il faut pour cela
        un « jeton d'accès » (token) que vous collez ci-dessous. Il reste uniquement dans <b>ce navigateur</b> et n'est jamais publié.</p>

        <label class="lbl">Jeton GitHub (token à droits « Contents »)</label>
        <div style="display:flex;gap:8px">
          <input id="set-token" class="field" type="${tokenVisible ? 'text' : 'password'}" placeholder="github_pat_…" value="${esc(Store.token())}" autocomplete="off" />
          <button class="btn btn--sm" data-act="toktoggle">${tokenVisible ? '🙈' : '👁️'}</button>
        </div>

        <label class="lbl">Branche des données</label>
        <input id="set-branch" class="field" value="${esc(Store.dataBranch())}" placeholder="main" />
        <p class="small muted">Branche du dépôt où sont publiées les données (et le site). Par défaut <code>main</code>.</p>

        <label class="lbl">Votre prénom (facultatif)</label>
        <input id="set-user" class="field" value="${esc(Store.userName())}" placeholder="ex : Jérôme" />

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
          <button class="btn btn--primary" data-act="save-sync">💾 Enregistrer</button>
          <button class="btn" data-act="test-sync">🔌 Tester la connexion</button>
          <button class="btn" data-act="sync-now">🔄 Synchroniser maintenant</button>
        </div>
        <p id="sync-msg" class="small" style="margin-top:10px"></p>
      </div>

      <div class="set-card">
        <h3>🔑 Comment créer le jeton (1 fois)</h3>
        <ol class="steps-help small">
          <li>Ouvrez <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings → Fine-grained tokens → Generate new</a>.</li>
          <li>« Repository access » → <b>Only select repositories</b> → choisissez <code>${esc(C.owner)}/${esc(C.repo)}</code>.</li>
          <li>« Permissions » → <b>Repository permissions</b> → <b>Contents</b> → <b>Read and write</b>.</li>
          <li>Générez, copiez le jeton (<code>github_pat_…</code>) et collez-le ci-dessus, puis « Enregistrer ».</li>
          <li>Faites de même sur le téléphone de votre épouse (même dépôt) : vos listes seront partagées.</li>
        </ol>
        <p class="small muted">Astuce : sur mobile, ouvrez le site puis « Ajouter à l'écran d'accueil » pour l'utiliser comme une appli.</p>
      </div>

      <div class="set-card">
        <h3>🎨 Affichage</h3>
        <label class="lbl">Thème</label>
        <div class="chips">
          ${['auto', 'light', 'dark'].map(k => `<span class="chip${Store.theme() === k ? ' active' : ''}" data-act="theme-set" data-theme="${k}">${({ auto: '🌗 Auto', light: '☀️ Clair', dark: '🌙 Sombre' })[k]}</span>`).join('')}
        </div>
        <label class="lbl">Nombre de personnes par défaut</label>
        <div class="servings">
          <button class="srv-btn" data-act="srv-def-dec">−</button>
          <b>${Store.defaultServings()}</b>
          <button class="srv-btn" data-act="srv-def-inc">＋</button>
          <span class="muted small">quantités & liste de courses (2 adultes + 2 enfants = 4)</span>
        </div>
      </div>

      <div class="set-card">
        <h3>📝 Mes recettes personnelles</h3>
        <a class="btn btn--sm btn--primary" href="#/ajouter">➕ Ajouter une recette</a>
        ${Store.activeCustomRecipes().length ? Store.activeCustomRecipes().map(r => `<div class="saved-list" style="margin-top:8px">
            <b>${esc(r.nom)}</b>
            <a class="btn btn--sm" href="#/recette/${r.id}">Voir</a>
            <a class="btn btn--sm" href="#/ajouter/${r.id}">✏️</a>
            <button class="btn btn--sm btn--danger" data-act="cust-del" data-id="${r.id}">✕</button>
          </div>`).join('') : '<p class="small muted" style="margin-top:8px">Aucune recette personnelle pour l\'instant.</p>'}
        ${Store.activeCustomIngredients().length ? `
          <label class="lbl">Ingrédients mémorisés</label>
          <div class="chips">${Store.activeCustomIngredients().map(nm => `<span class="chip">${esc(nm)}<button class="citem__del" data-act="custing-del" data-name="${esc(nm)}" style="padding:0 0 0 6px">✕</button></span>`).join('')}</div>` : ''}
      </div>

      <div class="set-card">
        <h3>ℹ️ À propos</h3>
        <p class="small">${Data.recipes.length} recettes · planning d'un an. Données nutritionnelles et index glycémique
        <b>approximatifs</b>, donnés à titre indicatif — ils ne remplacent pas l'avis de votre médecin ou diététicien.</p>
        <p class="small">Ressource utile : <a href="https://www.federationdesdiabetiques.org/diabete/recettes" target="_blank" rel="noopener">recettes de la Fédération Française des Diabétiques</a>.</p>
        <button class="btn btn--sm btn--danger" data-act="reset-local" style="margin-top:8px">Réinitialiser les données locales</button>
      </div>`;
  }

  /* ------------------------------------------------------------------ *
   *  Ecran : Detail recette                                             *
   * ------------------------------------------------------------------ */
  function viewRecette(id) {
    const r = Data.byId[id];
    if (!r) { view.innerHTML = `<div class="empty">Recette introuvable. <a href="#/recettes">Retour</a></div>`; return; }
    if (detailId !== id) { detailId = id; detailServings = Store.defaultServings(); }
    const base = Data.baseServings || 2;
    const factor = detailServings / base;
    const n = r.nutrition;
    const ph = Data.photoFor(r);
    const ings = r.ingredients.map(ing => `<div class="ing">
        <div><span class="ing__name">${esc(ing.nom)}</span>
          ${ing.subs && ing.subs.length ? `<div class="ing__sub">↔ à la place : ${ing.subs.map(esc).join(', ')}</div>` : ''}
          ${ing.plaisir && ing.plaisir.length ? `<div class="ing__plaisir">😋 plaisir : ${ing.plaisir.map(p => `<button class="plz" data-act="addplaisir" data-name="${esc(p)}">${esc(p)}</button>`).join(' ')}</div>` : ''}
        </div>
        <div class="ing__qte">${esc(App.scaleQty(ing.qte, factor))}</div>
      </div>`).join('');
    const hasPlaisir = r.ingredients.some(i => i.plaisir && i.plaisir.length);
    view.innerHTML = `<div class="detail">
      <button class="btn btn--sm" data-act="back">← Retour</button>
      <div class="detail__hero">
        <div class="detail__emoji">${ph ? `<img class="emoji-img" src="${esc(ph)}" alt="" onerror="this.outerHTML='${Data.emojiFor(r)}'">` : Data.emojiFor(r)}</div>
        <div style="flex:1">
          <h2 style="margin:0 0 6px">${esc(r.nom)} ${r.custom ? '<span class="badge badge--soft">perso</span>' : ''}</h2>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${igBadge(r)} ${cgBadge(r)}
            <span class="badge badge--soft">⏱ ${r.temps} min</span>
            <span class="badge badge--soft">🔧 ${esc(diffLabel(r.diff))} (${r.diff}/10)</span></div>
        </div>
        <button class="rcard__fav" style="position:static" data-act="fav" data-fav-id="${r.id}">${Store.isFavori(r.id) ? '★' : '☆'}</button>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
        <button class="btn btn--primary" data-act="cook" data-id="${r.id}">👨‍🍳 Mode cuisine</button>
        <button class="btn" data-act="addcourses-srv" data-id="${r.id}">🛒 Ajouter aux courses</button>
        <a class="btn" href="${esc(r.lien)}" target="_blank" rel="noopener">🔗 Variantes</a>
        <button class="btn btn--sm" data-act="recipe-photo" data-id="${r.id}">📷 ${ph ? 'Changer la photo' : 'Ajouter une photo'}</button>
        ${ph ? `<button class="btn btn--sm btn--danger" data-act="recipe-photo-del" data-id="${r.id}">Retirer la photo</button>` : ''}
        ${r.custom ? `<a class="btn btn--sm" href="#/ajouter/${r.id}">✏️ Modifier</a>` : ''}
      </div>

      <div class="servings">
        <span>👥 Pour</span>
        <button class="srv-btn" data-act="srv-dec">−</button>
        <b id="srv-n">${detailServings}</b>
        <button class="srv-btn" data-act="srv-inc">＋</button>
        <span>pers.</span>
        <span class="muted small">quantités ajustées · valeurs nutri. par portion</span>
      </div>

      <div class="detail__stats">
        <div class="stat"><div class="v">${n.kcal || '–'}</div><div class="k">kcal</div></div>
        <div class="stat"><div class="v">${n.glucides || 0} g</div><div class="k">Glucides</div></div>
        <div class="stat"><div class="v">${n.proteines || 0} g</div><div class="k">Protéines</div></div>
        <div class="stat"><div class="v">${n.lipides || 0} g</div><div class="k">Lipides</div></div>
        <div class="stat"><div class="v">${n.fibres || 0} g</div><div class="k">Fibres</div></div>
        <div class="stat"><div class="v">${r.ig}</div><div class="k">Index glyc.</div></div>
        <div class="stat"><div class="v">${r.cg}</div><div class="k">Charge glyc.</div></div>
      </div>

      <div class="section"><h3>🧺 Ingrédients <span class="muted small">(pour ${detailServings} pers.)</span></h3>${ings}</div>
      <div class="section"><h3>👨‍🍳 Préparation</h3><ol class="steps">${r.etapes.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
        <button class="btn btn--primary btn--block" data-act="cook" data-id="${r.id}" style="margin-top:10px">👨‍🍳 Lancer le mode cuisine (minuteur)</button></div>
      ${r.astuce ? `<div class="section"><h3>💡 Astuce</h3><p>${esc(r.astuce)}</p></div>` : ''}
      <div class="section">
        <h3>↔ Produits de substitution</h3>
        ${r.ingredients.filter(i => i.subs && i.subs.length).map(i =>
          `<div class="ing"><span class="ing__name">${esc(i.nom)}</span><span class="ing__qte">→ ${i.subs.map(esc).join(', ')}</span></div>`).join('') || '<p class="small muted">Recette sans substitution particulière.</p>'}
        ${hasPlaisir ? `<p class="small" style="margin-top:10px">😋 <b>Versions « plaisir »</b> (pour faire plaisir aux enfants, IG plus élevé) :</p>
          ${r.ingredients.filter(i => i.plaisir && i.plaisir.length).map(i =>
            `<div class="ing"><span class="ing__name">${esc(i.nom)}</span><span class="ing__qte">😋 ${i.plaisir.map(esc).join(', ')}</span></div>`).join('')}` : ''}
      </div>
      <p class="small muted center">Valeurs par portion, approximatives. IG ${r.ig}/100 · charge glycémique ${r.cg} (${esc(r.cg_label)}).</p>
    </div>`;
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------------ *
   *  Selection multiple (panier)                                        *
   * ------------------------------------------------------------------ */
  const selbar = document.getElementById('selbar');
  function updateSelbar() {
    document.body.classList.toggle('selmode', selMode);
    selbar.hidden = !selMode;
    if (!selMode) return;
    const n = selected.size;
    document.getElementById('selbar-count').textContent = n
      ? (n + ' recette' + (n > 1 ? 's' : '') + ' sélectionnée' + (n > 1 ? 's' : ''))
      : 'Touchez les recettes à ajouter';
    document.getElementById('selbar-add').disabled = n === 0;
  }
  function exitSelMode() { selMode = false; selected.clear(); updateSelbar(); }

  /* ------------------------------------------------------------------ *
   *  Routeur                                                            *
   * ------------------------------------------------------------------ */
  function currentRoute() {
    const parts = (location.hash || '#/planning').slice(2).split('/');
    return { route: parts[0] || 'planning', param: parts[1] };
  }
  function render() {
    const { route, param } = currentRoute();
    document.querySelectorAll('.nav a').forEach(a =>
      a.classList.toggle('active', a.dataset.route === route));
    Store.stopPolling();
    if (route !== 'recettes' && route !== 'favoris') exitSelMode();
    try {
      if (route === 'planning') viewPlanning();
      else if (route === 'recettes') viewRecettes();
      else if (route === 'recherche') viewRecherche();
      else if (route === 'favoris') viewFavoris();
      else if (route === 'courses') { viewCourses(); Store.startPolling(); }
      else if (route === 'reglages') viewReglages();
      else if (route === 'recette') viewRecette(param);
      else if (route === 'ajouter') App.AddRecipe.render(view, param);
      else viewPlanning();
    } catch (e) { console.error(e); view.innerHTML = `<div class="empty">Erreur d'affichage : ${esc(e.message)}</div>`; }
    updateSelbar();
    updateAmbient();
  }

  /* ------------------------------------------------------------------ *
   *  Mises a jour "ambiantes" (badge, etoiles) sans tout re-rendre      *
   * ------------------------------------------------------------------ */
  function updateAmbient() {
    const badge = document.getElementById('nav-courses-badge');
    const n = Store.coursesCount();
    if (badge) { badge.hidden = n === 0; badge.textContent = n; }
  }
  function refreshFavStars() {
    document.querySelectorAll('[data-fav-id]').forEach(b => {
      const on = Store.isFavori(b.dataset.favId);
      b.textContent = on ? '★' : '☆';
    });
  }

  function onStoreChange() {
    const changed = Data.syncCustom(Store.state.customRecipes);
    const { route } = currentRoute();
    updateAmbient();
    if (route === 'ajouter') return;
    if (changed || route === 'courses' || route === 'favoris' || route === 'planning' || route === 'reglages') {
      const y = window.scrollY;
      render();
      window.scrollTo(0, y);
    } else {
      refreshFavStars();
    }
  }

  /* ------------------------------------------------------------------ *
   *  Indicateur de synchro                                              *
   * ------------------------------------------------------------------ */
  function setSyncIndicator(status) {
    const el = document.getElementById('sync-indicator');
    const map = { off: ['⚪', 'Mode local (pas de synchro)'], ok: ['🟢', 'Synchronisé'],
      sync: ['🔄', 'Synchronisation…'], error: ['🔴', 'Erreur de synchronisation'] };
    const m = map[status] || map.off;
    el.textContent = m[0]; el.title = m[1];
  }

  /* ------------------------------------------------------------------ *
   *  Theme clair / sombre                                               *
   * ------------------------------------------------------------------ */
  function applyTheme() {
    const t = Store.theme();
    const dark = t === 'dark' || (t === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const btn = document.getElementById('theme-toggle');
    if (btn) { btn.textContent = dark ? '☀️' : '🌙'; btn.title = 'Thème : ' + ({ auto: 'auto', light: 'clair', dark: 'sombre' }[t]); }
  }
  function cycleTheme() {
    const order = ['auto', 'light', 'dark'];
    const next = order[(order.indexOf(Store.theme()) + 1) % order.length];
    Store.setTheme(next); applyTheme();
    toast('Thème : ' + ({ auto: 'automatique', light: 'clair', dark: 'sombre' }[next]));
  }

  /* ------------------------------------------------------------------ *
   *  Installation PWA (bandeau + bouton Réglages)                       *
   * ------------------------------------------------------------------ */
  function showInstallBanner() { /* la barre d'installation est gérée par le script inline du <head> */ }
  function hideInstallBanner() { const b = document.getElementById('pwa-install-bar'); if (b) b.style.display = 'none'; }
  async function doForceUpdate() {
    try {
      if (window.caches) {
        const ks = await caches.keys();
        await Promise.all(ks.filter(k => k.indexOf('mes-repas') === 0).map(k => caches.delete(k)));
      }
      if (navigator.serviceWorker) {
        const rs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(rs.filter(r => (r.scope || '').indexOf('/repas/') >= 0).map(r => r.unregister()));
      }
    } catch (e) {}
    location.reload();
  }
  async function doInstall() {
    const p = installPrompt || window.__deferredInstallPrompt;
    if (!p) return;
    installPrompt = null; window.__deferredInstallPrompt = null; hideInstallBanner();
    try { p.prompt(); await p.userChoice; } catch (e) {}
    if (currentRoute().route === 'reglages') render();
  }

  /* ------------------------------------------------------------------ *
   *  Gestion des clics (delegation)                                     *
   * ------------------------------------------------------------------ */
  function onClick(e) {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    const id = t.dataset.id;
    const recipe = id ? Data.byId[id] : null;

    switch (act) {
      case 'open': if (selMode) { toggleSelect(id); } else { location.hash = '#/recette/' + id; } break;
      case 'back': history.length > 1 ? history.back() : (location.hash = '#/recettes'); break;
      case 'fav': {
        Store.toggleFavori(t.dataset.favId);
        toast(Store.isFavori(t.dataset.favId) ? '★ Ajouté aux favoris' : 'Retiré des favoris');
        break;
      }
      case 'addcourses':
        if (recipe) { Store.addRecipeToCourses(recipe); toast('🛒 Ingrédients ajoutés à la liste'); }
        break;
      case 'addcourses-srv':
        if (recipe) { Store.addRecipeToCourses(recipe, detailServings / (Data.baseServings || 2)); toast('🛒 Ajouté pour ' + detailServings + ' pers.'); }
        break;
      case 'cook': if (recipe) App.Cooking.open(recipe); break;
      case 'srv-dec': detailServings = Math.max(1, detailServings - 1); render(); break;
      case 'srv-inc': detailServings = Math.min(20, detailServings + 1); render(); break;
      case 'addplaisir': Store.addCourse(t.dataset.name); toast('🛒 Ajouté : ' + t.dataset.name); break;
      case 'item-photo': pickPhoto(d => Store.addShoppingPhoto(t.dataset.name, d), 'à « ' + t.dataset.name + ' »'); break;
      case 'recipe-photo': { const rid = t.dataset.id; pickPhoto(d => { Store.setRecipePhoto(rid, d); render(); }, 'à la recette'); break; }
      case 'recipe-photo-del': Store.removeRecipePhoto(t.dataset.id); break;
      case 'photo-del': Store.removeShoppingPhoto(t.dataset.id); break;
      case 'theme-set': Store.setTheme(t.dataset.theme); applyTheme(); render(); break;
      case 'srv-def-dec': Store.setDefaultServings(Store.defaultServings() - 1); render(); break;
      case 'srv-def-inc': Store.setDefaultServings(Store.defaultServings() + 1); render(); break;
      case 'cust-del':
        if (confirm('Supprimer cette recette personnelle ?')) Store.deleteCustomRecipe(t.dataset.id);
        break;
      case 'custing-del': Store.removeCustomIngredient(t.dataset.name); break;
      case 'sel': toggleSelect(id); break;
      case 'selmode': selMode = !selMode; if (!selMode) selected.clear(); render(); break;

      case 'prevweek': planWeekStart.setDate(planWeekStart.getDate() - 7); render(); break;
      case 'nextweek': planWeekStart.setDate(planWeekStart.getDate() + 7); render(); break;
      case 'today': planWeekStart = mondayOf(new Date()); render(); break;

      case 'famille': recetteFamille = t.dataset.fam; render(); break;

      case 'ctab': coursesTab = t.dataset.tab; render(); break;
      case 'addcourse': addCourseFromInput(); break;
      case 'addingfav': {
        const fi = document.getElementById('ingfav-input');
        if (fi && fi.value.trim()) { Store.toggleIngFav(fi.value.trim()); fi.value = ''; }
        break;
      }
      case 'coche': Store.toggleCoche(t.dataset.id); break;
      case 'cdel': Store.removeCourse(t.dataset.id); break;
      case 'cfav': Store.toggleIngFav(t.dataset.name); toast('Ingrédient favori mis à jour'); break;
      case 'addfav-list': Store.addFavorisToCourses(); toast('Favoris ajoutés à la liste'); break;
      case 'savelist': doSaveList(); break;
      case 'clear-checked': Store.clearCourses(true); toast('Articles pris retirés'); break;
      case 'clear-all':
        if (confirm('Vider toute la liste de courses ?')) { Store.clearCourses(false); toast('Liste vidée'); }
        break;

      case 'ingfav-toggle': toggleFavInList(t.dataset.name); break;
      case 'ingfav-remove': Store.toggleIngFav(t.dataset.name); break;
      case 'ingfav-add-all': Store.addFavorisToCourses(); toast('Favoris ajoutés à la liste'); break;

      case 'list-load': Store.loadList(t.dataset.id, false); toast('Liste ajoutée'); coursesTab = 'liste'; render(); break;
      case 'list-replace':
        if (confirm('Remplacer la liste du jour par cette liste ?')) { Store.loadList(t.dataset.id, true); coursesTab = 'liste'; render(); }
        break;
      case 'list-del':
        if (confirm('Supprimer cette liste enregistrée ?')) Store.deleteList(t.dataset.id);
        break;

      case 'install': doInstall(); break;
      case 'force-update': doForceUpdate(); break;
      case 'toktoggle': tokenVisible = !tokenVisible; render(); break;
      case 'save-sync': doSaveSync(); break;
      case 'test-sync': doTestSync(); break;
      case 'sync-now': doSyncNow(); break;
      case 'reset-local': doResetLocal(); break;

      default:
        if (t.dataset.ex != null) { lastQuery = t.dataset.ex; const q = document.getElementById('q'); if (q) { q.value = lastQuery; renderResults(lastQuery); } }
    }
  }

  function toggleSelect(id) {
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    const card = document.querySelector(`.rcard[data-card-id="${id}"]`);
    if (card) card.classList.toggle('selected', selected.has(id));
    updateSelbar();
  }
  function toggleFavInList(name) {
    const inList = Store.activeCourses().find(c => App.eqName(c.nom, name));
    if (inList) { Store.removeCourse(inList.id); toast('Retiré de la liste'); }
    else { Store.addCourse(name); toast('Ajouté à la liste'); }
  }
  function pickPhoto(saveFn, label) {
    App.Photos.pick(async (dataUrl) => {
      if (!dataUrl) return;
      toast(Store.syncEnabled() ? '📷 Envoi de la photo…' : '📷 Photo enregistrée (locale)');
      const url = await Store.saveImage(dataUrl);
      saveFn(url);
      toast('📷 Photo ajoutée ' + (label || ''));
    });
  }
  function doSaveList() {
    if (!Store.activeCourses().length) { toast('La liste est vide'); return; }
    const nom = prompt('Nom de la liste :', 'Liste du ' + new Date().toLocaleDateString('fr-FR'));
    if (nom === null) return;
    if (Store.saveCurrentAsList(nom)) toast('💾 Liste enregistrée');
  }
  async function doSaveSync() {
    Store.setToken(document.getElementById('set-token').value);
    Store.setDataBranch(document.getElementById('set-branch').value);
    Store.setUserName(document.getElementById('set-user').value);
    setSyncIndicator(Store.syncEnabled() ? 'ok' : 'off');
    if (!Store.syncEnabled()) { setSyncMsg('warn', 'Enregistré (mode local, pas de token).'); return; }
    setSyncMsg('warn', 'Synchronisation (envoi de vos données + réception)…');
    const ok = await Store.pushRemote();   // fusionne distant + local PUIS envoie => remonte la liste deja saisie
    setSyncMsg(ok ? 'ok' : 'error', ok
      ? "Synchronisé ✓ Vos listes sont partagées. Ouvrez « Courses » sur l'autre appareil (ou « Synchroniser maintenant »)."
      : 'Échec : vérifiez le token (droits Contents en écriture) et la branche « ' + esc(Store.dataBranch()) + ' ».');
    render();
  }
  async function doTestSync() {
    Store.setToken(document.getElementById('set-token').value);
    Store.setDataBranch(document.getElementById('set-branch').value);
    setSyncMsg('warn', 'Test en cours…');
    const r = await Store.testConnection();
    setSyncMsg(r.ok ? 'ok' : 'error', r.msg);
  }
  async function doSyncNow() {
    if (!Store.syncEnabled()) { setSyncMsg('warn', 'Activez d\'abord la synchro (token).'); return; }
    setSyncMsg('warn', 'Synchronisation…');
    const ok = await Store.pushRemote();
    setSyncMsg(ok ? 'ok' : 'error', ok ? 'Synchronisé ✓ (données envoyées et reçues).' : 'Échec — vérifiez le token et la branche.');
  }
  function doResetLocal() {
    if (!confirm('Effacer les favoris et listes de CE navigateur ? (les données synchronisées restent sur GitHub)')) return;
    Store.state = { v: 1, favoris: [], ingredientsFavoris: [], courses: [], listes: [], updatedAt: 0, updatedBy: '' };
    Store._saveLocal(); toast('Données locales réinitialisées'); render();
  }
  function setSyncMsg(kind, msg) {
    const el = document.getElementById('sync-msg');
    if (!el) return;
    const dot = kind === 'ok' ? 'ok' : kind === 'error' ? 'off' : 'warn';
    el.innerHTML = `<span class="status-dot ${dot}"></span>${esc(msg)}`;
  }

  /* ------------------------------------------------------------------ *
   *  Toasts                                                             *
   * ------------------------------------------------------------------ */
  let toastTimer;
  function toast(msg) {
    const box = document.getElementById('toasts');
    box.innerHTML = `<div class="toast">${esc(msg)}</div>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.innerHTML = ''; }, 2200);
  }

  /* ------------------------------------------------------------------ *
   *  Init                                                               *
   * ------------------------------------------------------------------ */
  function init() {
    document.addEventListener('click', onClick);
    window.addEventListener('hashchange', render);
    document.getElementById('selbar-cancel').addEventListener('click', exitSelMode);
    document.getElementById('selbar-add').addEventListener('click', () => {
      const recs = Array.from(selected).map(id => Data.byId[id]).filter(Boolean);
      if (recs.length) { Store.addRecipesToCourses(recs); toast(`🛒 ${recs.length} recette(s) ajoutée(s) aux courses`); }
      exitSelMode();
      location.hash = '#/courses';
    });
    document.getElementById('sync-indicator').addEventListener('click', () => location.hash = '#/reglages');
    document.getElementById('theme-toggle').addEventListener('click', cycleTheme);
    applyTheme();
    if (window.matchMedia) {
      try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch (e) {}
    }
    const pickupInstall = () => {
      if (window.__deferredInstallPrompt && !installPrompt) {
        installPrompt = window.__deferredInstallPrompt;
        showInstallBanner();
        if (currentRoute().route === 'reglages') render();
      }
    };
    window.addEventListener('repas-installable', pickupInstall);
    window.addEventListener('repas-installed', () => {
      installPrompt = null; window.__deferredInstallPrompt = null; hideInstallBanner(); toast('🎉 Application installée');
    });
    // secours si l'evenement arrive apres l'init (et au cas ou il a deja eu lieu)
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__deferredInstallPrompt = e; pickupInstall(); });
    pickupInstall();

    Store.onChange = onStoreChange;
    Store.onSyncStatus = setSyncIndicator;
    setSyncIndicator(Store.syncEnabled() ? 'ok' : 'off');
    if (!location.hash) location.hash = '#/planning';
    render();
    // au demarrage : fusionne + remonte les donnees locales si besoin (sans commit inutile)
    if (Store.syncEnabled()) Store.pushRemote();
  }

  App.UI = { init, render, toast };
})();
