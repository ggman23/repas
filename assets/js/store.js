/* ============================================================
   Store : etat de l'app (favoris, liste de courses, listes
   sauvegardees) avec persistance locale + synchronisation
   GitHub optionnelle (fusion par element, "last write wins").
   ============================================================ */
(function () {
  const C = App.CONFIG;
  const LS_STATE = 'repas_state_v1';
  const LS_TOKEN = 'repas_gh_token';
  const LS_BRANCH = 'repas_data_branch';
  const LS_USER = 'repas_user_name';

  function now() { return Date.now(); }
  function uid() { return Math.random().toString(36).slice(2, 9) + now().toString(36).slice(-3); }

  function defaultState() {
    return { v: 1, favoris: [], ingredientsFavoris: [], courses: [], listes: [],
      customRecipes: [], customIngredients: [], photos: [], recipePhotos: [], updatedAt: 0, updatedBy: '' };
  }

  const Store = {
    state: defaultState(),
    _sha: null,
    _pushTimer: null,
    _pollTimer: null,
    _syncing: false,
    _batch: false,
    onChange: null,        // callback() appele a chaque modif locale ou distante
    onSyncStatus: null,    // callback(status) : 'off'|'ok'|'sync'|'error'|'local'

    /* ---------- init / persistence ---------- */
    load() {
      try {
        const raw = localStorage.getItem(LS_STATE);
        if (raw) this.state = Object.assign(defaultState(), JSON.parse(raw));
      } catch (e) { /* ignore */ }
      return this.state;
    },
    _saveLocal() {
      try { localStorage.setItem(LS_STATE, JSON.stringify(this.state)); } catch (e) {}
    },
    /* a appeler apres toute modification */
    commit(push = true) {
      this.state.updatedAt = now();
      this.state.updatedBy = this.userName() || '';
      this._saveLocal();
      if (this.onChange) this.onChange();
      if (push && this.syncEnabled()) this._schedulePush();
    },
    /* regroupe plusieurs modifications en un seul commit/sync */
    batch(fn) {
      this._batch = true;
      try { fn(); } finally { this._batch = false; }
      this.commit();
    },

    /* ---------- reglages sync ---------- */
    token() { return localStorage.getItem(LS_TOKEN) || ''; },
    setToken(t) { t ? localStorage.setItem(LS_TOKEN, t.trim()) : localStorage.removeItem(LS_TOKEN); },
    dataBranch() { return localStorage.getItem(LS_BRANCH) || C.defaultDataBranch; },
    setDataBranch(b) { localStorage.setItem(LS_BRANCH, (b || C.defaultDataBranch).trim()); },
    userName() { return localStorage.getItem(LS_USER) || ''; },
    setUserName(n) { n ? localStorage.setItem(LS_USER, n.trim()) : localStorage.removeItem(LS_USER); },
    syncEnabled() { return !!this.token(); },

    /* ---------- favoris recettes ---------- */
    isFavori(id) { return this.state.favoris.includes(id); },
    toggleFavori(id) {
      const i = this.state.favoris.indexOf(id);
      if (i >= 0) this.state.favoris.splice(i, 1); else this.state.favoris.push(id);
      this.commit();
      return this.isFavori(id);
    },

    /* ---------- ingredients favoris ---------- */
    isIngFav(name) { return this.state.ingredientsFavoris.some(n => eqName(n, name)); },
    toggleIngFav(name) {
      const i = this.state.ingredientsFavoris.findIndex(n => eqName(n, name));
      if (i >= 0) this.state.ingredientsFavoris.splice(i, 1);
      else this.state.ingredientsFavoris.push(name);
      this.commit();
    },

    /* ---------- liste de courses ---------- */
    activeCourses() { return this.state.courses.filter(c => !c.deleted); },
    coursesCount() { return this.activeCourses().filter(c => !c.coche).length; },
    addCourse(nom, qte, rayon, source) {
      nom = (nom || '').trim();
      if (!nom) return;
      const existing = this.state.courses.find(c => !c.deleted && eqName(c.nom, nom));
      if (existing) {
        if (qte && existing.qte && existing.qte.indexOf(qte) === -1) existing.qte += ' + ' + qte;
        else if (qte && !existing.qte) existing.qte = qte;
        existing.coche = false; existing.updatedAt = now();
      } else {
        this.state.courses.push({
          id: uid(), nom, qte: qte || '', rayon: rayon || App.classifyRayon(nom),
          coche: false, deleted: false, updatedAt: now(), updatedBy: this.userName()
        });
      }
      if (!this._batch) this.commit();
    },
    toggleCoche(id) {
      const c = this.state.courses.find(x => x.id === id);
      if (c) { c.coche = !c.coche; c.updatedAt = now(); c.updatedBy = this.userName(); this.commit(); }
    },
    removeCourse(id) {
      const c = this.state.courses.find(x => x.id === id);
      if (c) { c.deleted = true; c.coche = false; c.updatedAt = now(); this.commit(); }
    },
    clearCourses(onlyChecked) {
      this.state.courses.forEach(c => {
        if (!c.deleted && (!onlyChecked || c.coche)) { c.deleted = true; c.updatedAt = now(); }
      });
      if (!this._batch) this.commit();
    },
    _factor(f) {
      if (f) return f;
      const base = (App.Data && App.Data.baseServings) || 2;
      return this.defaultServings() / base;
    },
    addRecipeToCourses(recipe, factor) {
      const f = this._factor(factor);
      this.batch(() => {
        recipe.ingredients.forEach(ing =>
          this.addCourse(ing.nom, App.scaleQty(ing.qte, f), App.classifyRayon(ing.nom), recipe.id));
      });
    },
    addRecipesToCourses(recipes, factor) {
      const f = this._factor(factor);
      this.batch(() => {
        recipes.forEach(r => r.ingredients.forEach(ing =>
          this.addCourse(ing.nom, App.scaleQty(ing.qte, f), App.classifyRayon(ing.nom), r.id)));
      });
    },

    /* ---------- listes sauvegardees ---------- */
    activeListes() { return this.state.listes.filter(l => !l.deleted); },
    saveCurrentAsList(nom) {
      const items = this.activeCourses().map(c => ({ nom: c.nom, qte: c.qte, rayon: c.rayon }));
      if (!items.length) return false;
      this.state.listes.push({ id: uid(), nom: nom || ('Liste du ' + new Date().toLocaleDateString('fr-FR')),
        items, deleted: false, updatedAt: now() });
      this.commit();
      return true;
    },
    loadList(id, replace) {
      const l = this.state.listes.find(x => x.id === id && !x.deleted);
      if (!l) return;
      this.batch(() => {
        if (replace) this.clearCourses(false);
        l.items.forEach(it => this.addCourse(it.nom, it.qte, it.rayon, 'liste'));
      });
    },
    deleteList(id) {
      const l = this.state.listes.find(x => x.id === id);
      if (l) { l.deleted = true; l.updatedAt = now(); this.commit(); }
    },
    addFavorisToCourses() {
      this.batch(() => {
        this.state.ingredientsFavoris.forEach(n => this.addCourse(n, '', App.classifyRayon(n), 'favori'));
      });
    },

    /* ---------- recettes & ingredients personnalises ---------- */
    activeCustomRecipes() { return (this.state.customRecipes || []).filter(r => !r.deleted); },
    upsertCustomRecipe(rec) {
      const list = this.state.customRecipes || (this.state.customRecipes = []);
      rec.updatedAt = now(); rec.custom = true; rec.deleted = false;
      const i = list.findIndex(r => r.id === rec.id);
      if (i >= 0) list[i] = rec; else list.push(rec);
      (rec.ingredients || []).forEach(ing => this._learnIngredient(ing.nom));
      this.commit();
    },
    deleteCustomRecipe(id) {
      const r = (this.state.customRecipes || []).find(x => x.id === id);
      if (r) { r.deleted = true; r.updatedAt = now(); this.commit(); }
    },
    addCustomIngredient(name) { if (this._learnIngredient(name)) this.commit(); },
    removeCustomIngredient(name) {
      const i = (this.state.customIngredients || []).findIndex(n => eqName(n, name));
      if (i >= 0) { this.state.customIngredients.splice(i, 1); this.commit(); }
    },
    _learnIngredient(name) {
      name = (name || '').trim(); if (!name) return false;
      this.state.customIngredients = this.state.customIngredients || [];
      if (App.Data && App.Data.knownIngredient && App.Data.knownIngredient(name)) return false;
      if (this.state.customIngredients.some(n => eqName(n, name))) return false;
      this.state.customIngredients.push(name);
      return true;
    },

    /* ---------- photos (liste de courses & recettes) ---------- */
    activePhotos() { return (this.state.photos || []).filter(p => !p.deleted); },
    photosForLabel(label) {
      const n = normName(label);
      return this.activePhotos().filter(p => normName(p.label) === n);
    },
    addShoppingPhoto(label, url) {
      if (!url) return;
      (this.state.photos || (this.state.photos = [])).push({
        id: uid(), label: (label || '').trim() || 'Photo', url, by: this.userName(), at: now(), updatedAt: now(), deleted: false
      });
      this.commit();
    },
    removeShoppingPhoto(id) {
      const p = (this.state.photos || []).find(x => x.id === id);
      if (p) { p.deleted = true; p.updatedAt = now(); this.commit(); }
    },
    recipePhotoFor(rid) {
      const p = (this.state.recipePhotos || []).find(x => x.id === rid && !x.deleted);
      return p ? p.url : null;
    },
    setRecipePhoto(rid, url) {
      if (!url) return;
      const list = this.state.recipePhotos || (this.state.recipePhotos = []);
      const ex = list.find(x => x.id === rid);
      if (ex) { ex.url = url; ex.deleted = false; ex.updatedAt = now(); }
      else list.push({ id: rid, url, updatedAt: now(), by: this.userName() });
      this.commit();
    },
    removeRecipePhoto(rid) {
      const p = (this.state.recipePhotos || []).find(x => x.id === rid);
      if (p) { p.deleted = true; p.updatedAt = now(); this.commit(); }
    },
    rawUrl(path) { return `https://raw.githubusercontent.com/${C.owner}/${C.repo}/${this.dataBranch()}/${path}`; },
    /* Envoie une image (dataURL JPEG) : sur GitHub si la synchro est active
       (=> partagee + URL stable), sinon garde le dataURL en local. */
    async saveImage(dataUrl) {
      if (!dataUrl) return null;
      if (!this.syncEnabled()) return dataUrl;
      try {
        const base64 = dataUrl.replace(/^data:[^,]+,/, '');
        const path = 'data/photos/p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '.jpg';
        const put = await this._api('contents/' + path, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'ajout photo', content: base64, branch: this.dataBranch() })
        });
        if (!put.ok) throw new Error('HTTP ' + put.status);
        return this.rawUrl(path);
      } catch (e) { console.warn('saveImage', e); return dataUrl; }
    },

    /* ---------- preferences locales (par appareil) ---------- */
    theme() { return localStorage.getItem('repas_theme') || 'auto'; },
    setTheme(t) { localStorage.setItem('repas_theme', t); },
    defaultServings() { return parseInt(localStorage.getItem('repas_servings') || '4', 10) || 4; },
    setDefaultServings(n) { localStorage.setItem('repas_servings', String(Math.max(1, Math.min(20, n)))); },

    /* ============================================================
       Synchronisation GitHub
       ============================================================ */
    _api(path, opts) {
      const url = `https://api.github.com/repos/${C.owner}/${C.repo}/${path}`;
      const headers = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
      const t = this.token();
      if (t) headers['Authorization'] = 'Bearer ' + t;
      return fetch(url, Object.assign({ headers }, opts));
    },
    async pullRemote(silent) {
      if (!this.syncEnabled() || this._syncing) return;
      this._syncing = true; this._status('sync');
      try {
        const r = await this._api(`contents/${C.statePath}?ref=${encodeURIComponent(this.dataBranch())}&t=${now()}`,
          { cache: 'no-store' });
        if (r.status === 404) { this._sha = null; this._status('ok'); this._syncing = false; return; }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const data = await r.json();
        this._sha = data.sha;
        const remote = JSON.parse(b64decode(data.content));
        const merged = mergeStates(remote, this.state);
        const changed = JSON.stringify(merged) !== JSON.stringify(this.state);
        this.state = merged;
        this._saveLocal();
        this._status('ok');
        if (changed && this.onChange) this.onChange();
      } catch (e) {
        console.warn('pullRemote', e); this._status('error');
      } finally { this._syncing = false; }
    },
    _schedulePush() {
      clearTimeout(this._pushTimer);
      this._pushTimer = setTimeout(() => this.pushRemote(), C.pushDebounceMs);
    },
    async pushRemote(retry = 0) {
      if (!this.syncEnabled()) return false;
      this._status('sync');
      try {
        // toujours fusionner avec la derniere version distante avant d'ecrire
        const r = await this._api(`contents/${C.statePath}?ref=${encodeURIComponent(this.dataBranch())}&t=${now()}`,
          { cache: 'no-store' });
        if (r.ok) {
          const data = await r.json();
          this._sha = data.sha;
          try {
            const remote = JSON.parse(b64decode(data.content));
            this.state = mergeStates(remote, this.state);
            this._saveLocal();
          } catch (e) {}
        } else if (r.status === 404) {
          this._sha = null;
        }
        const body = {
          message: `maj donnees (${this.userName() || 'app'})`,
          content: b64encode(JSON.stringify(this.state, null, 1)),
          branch: this.dataBranch()
        };
        if (this._sha) body.sha = this._sha;
        const put = await this._api(`contents/${C.statePath}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        if (put.status === 409 && retry < 3) { this._sha = null; return this.pushRemote(retry + 1); }
        if (!put.ok) throw new Error('HTTP ' + put.status);
        const res = await put.json();
        this._sha = res.content && res.content.sha;
        this._status('ok');
        if (this.onChange) this.onChange();
        return true;
      } catch (e) {
        console.warn('pushRemote', e); this._status('error');
        return false;
      }
    },
    startPolling() {
      if (!this.syncEnabled()) return;
      this.stopPolling();
      this.pullRemote(true);
      this._pollTimer = setInterval(() => this.pullRemote(true), C.pollMs);
    },
    stopPolling() { if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; } },
    _status(s) { if (this.onSyncStatus) this.onSyncStatus(this.syncEnabled() ? s : 'off'); },

    async testConnection() {
      try {
        const r = await this._api(`contents/${encodeURIComponent(C.recipesPath)}?ref=${encodeURIComponent(this.dataBranch())}`);
        if (r.status === 404) return { ok: true, msg: 'Connexion OK (le fichier de donnees sera cree au premier ajout).' };
        if (r.status === 401) return { ok: false, msg: 'Token refuse (401). Verifiez le token.' };
        if (r.status === 403) return { ok: false, msg: 'Acces refuse (403). Le token a-t-il les droits Contents en ecriture ?' };
        if (!r.ok) return { ok: false, msg: 'Erreur HTTP ' + r.status + ' (branche "' + this.dataBranch() + '" introuvable ?)' };
        return { ok: true, msg: 'Connexion OK — synchronisation prete sur la branche "' + this.dataBranch() + '".' };
      } catch (e) { return { ok: false, msg: 'Reseau indisponible : ' + e.message }; }
    }
  };

  /* ---------- helpers de fusion ---------- */
  function eqName(a, b) { return normName(a) === normName(b); }
  function normName(s) {
    return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }
  function mergeById(remote, local) {
    const map = new Map();
    (remote || []).forEach(it => map.set(it.id, it));
    (local || []).forEach(it => {
      const ex = map.get(it.id);
      if (!ex || (it.updatedAt || 0) >= (ex.updatedAt || 0)) map.set(it.id, it);
    });
    return Array.from(map.values());
  }
  function unionStr(a, b) {
    const out = [...(a || [])];
    (b || []).forEach(x => { if (!out.some(y => eqName(x, y))) out.push(x); });
    return out;
  }
  function mergeStates(remote, local) {
    if (!remote) return local;
    return {
      v: 1,
      favoris: unionStr(remote.favoris, local.favoris),
      ingredientsFavoris: unionStr(remote.ingredientsFavoris, local.ingredientsFavoris),
      courses: mergeById(remote.courses, local.courses),
      listes: mergeById(remote.listes, local.listes),
      customRecipes: mergeById(remote.customRecipes, local.customRecipes),
      customIngredients: unionStr(remote.customIngredients, local.customIngredients),
      photos: mergeById(remote.photos, local.photos),
      recipePhotos: mergeById(remote.recipePhotos, local.recipePhotos),
      updatedAt: Math.max(remote.updatedAt || 0, local.updatedAt || 0),
      updatedBy: (local.updatedAt || 0) >= (remote.updatedAt || 0) ? local.updatedBy : remote.updatedBy
    };
  }

  /* ---------- base64 unicode ---------- */
  function b64encode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin);
  }
  function b64decode(b64) {
    const bin = atob((b64 || '').replace(/\s/g, ''));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  App.Store = Store;
  App.normName = normName;
  App.eqName = eqName;
})();
