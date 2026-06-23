/* ============================================================
   Donnees : chargement des recettes, generation du planning
   annuel (deterministe), moteur de recherche, rayons.
   ============================================================ */
(function () {
  const C = App.CONFIG;
  const norm = App.normName;

  /* ---------- RNG deterministe ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rnd) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const Data = {
    recipes: [],
    byId: {},
    plan: [],
    builtin: [],
    custom: [],
    baseServings: 2,
    _customSig: '',

    async load() {
      const res = await fetch(C.recipesPath, { cache: 'no-cache' });
      if (!res.ok) throw new Error('Impossible de charger les recettes (' + res.status + ')');
      const data = await res.json();
      this.baseServings = data.base_servings || 2;
      this.builtin = data.recipes || [];
      this.custom = [];
      this._reindex();
      this.buildPlan();
      return this.recipes;
    },

    /* fusionne les recettes perso (synchronisees) ; retourne true si change */
    syncCustom(list) {
      const active = (list || []).filter(r => !r.deleted);
      const sig = active.map(r => r.id + ':' + (r.updatedAt || 0)).join('|');
      if (sig === this._customSig) return false;
      this._customSig = sig;
      this.custom = active;
      this._reindex();
      return true;
    },

    _reindex() {
      this.recipes = this.builtin.concat(this.custom);
      this.byId = {};
      this.recipes.forEach(r => {
        this.byId[r.id] = r;
        const nut = r.nutrition || (r.nutrition = {});
        if (r.cg == null) r.cg = Math.round((r.ig || 0) * (nut.glucides || 0) / 100);
        if (!r.cg_label) r.cg_label = r.cg <= 10 ? 'basse' : (r.cg < 20 ? 'moderee' : 'elevee');
        if (!r.ig_label) r.ig_label = (r.ig || 0) <= 50 ? 'bas' : ((r.ig || 0) < 70 ? 'modere' : 'eleve');
        r._blob = norm([r.nom, r.ingredients.map(i => i.nom).join(' '),
          r.ingredients.map(i => (i.subs || []).join(' ')).join(' '),
          (r.tags || []).join(' '), r.famille || '', r.ig_label || '', (r.saisons || []).join(' ')].join(' '));
      });
      const set = new Set();
      const addAtom = s => { const n = norm(s); if (n.length >= 3) set.add(n); };
      this.builtin.forEach(r => r.ingredients.forEach(i => {
        (i.subs || []).forEach(addAtom); (i.plaisir || []).forEach(addAtom);
        splitParts(i.nom).forEach(addAtom);
      }));
      EXTRA_INGREDIENTS.forEach(addAtom);
      this._builtinDict = set;
    },

    knownIngredient(name) { return this._builtinDict ? this._builtinDict.has(norm(name)) : false; },

    /* ---------- saisons ---------- */
    seasonOf(date) {
      const m = date.getMonth();
      return (m >= 2 && m <= 4) ? 'printemps' : (m >= 5 && m <= 7) ? 'ete'
        : (m >= 8 && m <= 10) ? 'automne' : 'hiver';
    },
    seasonLabel(s) { return { printemps: 'Printemps', ete: 'Été', automne: 'Automne', hiver: 'Hiver' }[s] || s; },
    seasonEmoji(s) { return { printemps: '🌷', ete: '☀️', automne: '🍂', hiver: '❄️' }[s] || ''; },
    inSeason(r, season) {
      const ss = r.saisons || [];
      return !ss.length || ss.indexOf('toute') >= 0 || ss.indexOf(season) >= 0;
    },

    /* ---------- planning annuel (saisonnier, deterministe) ---------- */
    buildPlan() {
      const rndM = mulberry32(C.planSeed);
      const rndS = mulberry32(C.planSeed ^ 0x9e3779b9);
      const decks = {};
      const poolFor = (slot, season) => {
        let p = this.builtin.filter(r => r.types.indexOf(slot) >= 0 && this.inSeason(r, season));
        if (p.length < 3) p = this.builtin.filter(r => r.types.indexOf(slot) >= 0);
        return p;
      };
      const draw = (slot, season, rnd, avoid) => {
        const key = slot + '_' + season;
        let deck = decks[key];
        if (!deck || !deck.length) deck = decks[key] = shuffle(poolFor(slot, season).slice(), rnd);
        let i = 0;
        while (i < deck.length && deck[i].id === avoid) i++;
        if (i >= deck.length) i = 0;
        return deck.splice(i, 1)[0];
      };
      const base = new Date(2026, 0, 1);
      this.plan = [];
      for (let d = 0; d < C.planDays; d++) {
        const date = new Date(base.getTime() + d * 86400000);
        const season = this.seasonOf(date);
        const m = draw('m', season, rndM, null);
        const s = draw('s', season, rndS, m.id);
        this.plan.push({ m: m.id, s: s.id });
      }
    },
    dayOfYear(date) {
      const start = new Date(date.getFullYear(), 0, 1);
      return Math.floor((date - start) / 86400000);
    },
    planForDate(date) {
      const idx = ((this.dayOfYear(date) % C.planDays) + C.planDays) % C.planDays;
      const e = this.plan[idx] || this.plan[0];
      return { midi: this.byId[e.m], soir: this.byId[e.s] };
    },

    /* ---------- extraction d'ingredients depuis un texte colle ---------- */
    extractIngredients(text) {
      const t = ' ' + norm(text).replace(/[\n\r]+/g, ' ') + ' ';
      const dict = this._extractionDict();
      const found = [];
      dict.forEach(d => {
        const idx = indexOfWord(t, d.n);
        if (idx >= 0) found.push({ n: d.n, nom: d.display, qte: guessQty(t, idx) });
      });
      const kept = found.filter(f => !found.some(g => g !== f && g.n.length > f.n.length && g.n.indexOf(f.n) >= 0));
      const seen = new Set(); const out = [];
      kept.forEach(f => { if (!seen.has(f.n)) { seen.add(f.n); out.push({ nom: f.nom, qte: f.qte }); } });
      return out;
    },
    _extractionDict() {
      const map = new Map();
      const add = (s) => { const n = norm(s); if (n.length >= 3 && !map.has(n)) map.set(n, cap(s)); };
      (this._builtinDict || new Set()).forEach(n => map.set(n, cap(n)));
      this.custom.forEach(r => r.ingredients.forEach(i => add(i.nom)));
      ((App.Store && App.Store.state.customIngredients) || []).forEach(add);
      return Array.from(map, ([n, display]) => ({ n, display }));
    },

    /* ---------- recherche ---------- */
    search(query) {
      const { terms, filters } = parseQuery(query);
      const results = this.recipes.filter(r => {
        for (const t of terms) if (r._blob.indexOf(t) === -1) return false;
        for (const f of filters) {
          const v = metricValue(r, f.key);
          if (f.min != null && v < f.min) return false;
          if (f.max != null && v > f.max) return false;
        }
        return true;
      });
      return { results, terms, filters };
    },

    photoFor(r) {
      if (!r) return null;
      const u = App.Store && App.Store.recipePhotoFor && App.Store.recipePhotoFor(r.id);
      return u || r.image || null;
    },
    emojiFor(r) {
      if (!r) return '🍽️';
      if (r.famille === 'soupe') return '🥣';
      if (r.famille === 'salade') return '🥗';
      const map = { oeuf: '🍳', volaille: '🍗', poisson: '🐟', boeuf: '🥩', porc: '🥓', legumineuse: '🫘', vege: '🥗', perso: '📝' };
      return map[r.famille] || '🍽️';
    }
  };

  function metricValue(r, key) {
    switch (key) {
      case 'cg': return r.cg;
      case 'ig': return r.ig;
      case 'glucides': return r.nutrition.glucides;
      case 'calories': return r.nutrition.kcal;
      case 'proteines': return r.nutrition.proteines;
      case 'lipides': return r.nutrition.lipides;
      case 'fibres': return r.nutrition.fibres;
      case 'temps': return r.temps;
      case 'diff': return r.diff;
    }
    return 0;
  }

  /* ============================================================
     Analyse de la requete de recherche
     ============================================================ */
  const METRICS = [
    { key: 'cg', kw: /\b(?:charge glycemique|charge gly|charge|cg)\b/, unit: '' },
    { key: 'ig', kw: /\b(?:ig|index glycemique|indice glycemique)\b/, unit: '' },
    { key: 'glucides', kw: /\b(?:glucides?|carbs?|sucres?)\b/, unit: ' g' },
    { key: 'calories', kw: /\b(?:calories?|kcal|cal)\b/, unit: ' kcal' },
    { key: 'proteines', kw: /\b(?:proteines?|prot)\b/, unit: ' g' },
    { key: 'lipides', kw: /\b(?:lipides?|gras|graisses?)\b/, unit: ' g' },
    { key: 'fibres', kw: /\b(?:fibres?)\b/, unit: ' g' },
    { key: 'temps', kw: /\b(?:temps|minutes?|min|duree|preparation)\b/, unit: ' min' },
    { key: 'diff', kw: /\b(?:complexite|difficulte)\b/, unit: '/10' }
  ];
  const STOP = new Set(('je veux un une des de du d la le les l a au aux avec et ou pour repas plat plats recette recettes ' +
    'qui que dans sans en entre moins plus max min mini maxi inferieur inferieure superieure superieur sous jusqu dela ' +
    'environ autour index indice glycemique ig glucides glucide carbs carb sucre sucres calories calorie kcal cal ' +
    'proteines proteine prot lipides lipide gras graisse graisses fibres fibre temps minutes minute duree preparation ' +
    'complexite difficulte bas basse modere moderee modere eleve elevee elevees g gr gramme grammes note quelque chose ' +
    'cherche trouve montre veut idee idees menu midi soir charge cg ' +
    'facile simple rapide express complique complexe difficile dur tres').split(' '));

  function num(x) { return parseFloat(String(x).replace(',', '.')); }

  function parseConstraint(win) {
    let r;
    if ((r = /entre\s*(\d+(?:[.,]\d+)?)\s*(?:et|a|-|et de)\s*(\d+(?:[.,]\d+)?)/.exec(win)))
      return { min: num(r[1]), max: num(r[2]) };
    if ((r = /(\d+(?:[.,]\d+)?)\s*(?:a|-)\s*(\d+(?:[.,]\d+)?)/.exec(win)))
      return { min: num(r[1]), max: num(r[2]) };
    if ((r = /(?:moins de|inferieure?\s*a?|max\.?|maxi|sous|<=?|jusqu\s*a?|pas plus de)\s*(\d+(?:[.,]\d+)?)/.exec(win)))
      return { max: num(r[1]) };
    if ((r = /(?:plus de|superieure?\s*a?|mini|au moins|au dela de?|>=?|depasse)\s*(\d+(?:[.,]\d+)?)/.exec(win)))
      return { min: num(r[1]) };
    if ((r = /(\d+(?:[.,]\d+)?)/.exec(win)))
      return { max: num(r[1]) };  // nombre seul => borne haute
    return null;
  }

  function parseQuery(query) {
    const s = ' ' + norm(query).replace(/[^a-z0-9<>=. ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
    const have = {};
    const filters = [];
    const add = (key, c) => {
      if (!c || have[key]) return;
      have[key] = true;
      const m = METRICS.find(x => x.key === key);
      filters.push(Object.assign({ key: key, unit: m ? m.unit : '', label: fmtFilter(key, c, m ? m.unit : '') }, c));
    };

    // libelles qualitatifs
    if (/\big\s*bas\b|index glycemique bas|\bia?g bas\b/.test(s)) add('ig', { max: 50 });
    if (/\big\s*moder|index glycemique moder/.test(s)) add('ig', { min: 51, max: 69 });
    if (/\big\s*eleve|index glycemique eleve/.test(s)) add('ig', { min: 70 });
    if (/\b(tres facile|tres simple)\b/.test(s)) add('diff', { max: 2 });
    if (/\b(facile|simple)\b/.test(s)) add('diff', { max: 4 });
    if (/\b(rapide|express)\b/.test(s)) add('temps', { max: 20 });
    if (/\b(complique|complexe|difficile|dur)\b/.test(s)) add('diff', { min: 6 });

    // contraintes numeriques par metrique (fenetre autour du mot-cle)
    METRICS.forEach(m => {
      if (have[m.key]) return;
      const mt = m.kw.exec(s);
      if (!mt) return;
      const i = mt.index;
      const win = s.slice(Math.max(0, i - 24), Math.min(s.length, i + mt[0].length + 24));
      add(m.key, parseConstraint(win));
    });

    // termes ingredients (tout le reste, hors bruit)
    const terms = [];
    s.trim().split(' ').forEach(tok => {
      tok = tok.replace(/[<>=.]/g, '');
      if (tok.length < 2) return;
      if (/^\d+$/.test(tok)) return;
      if (STOP.has(tok)) return;
      if (!terms.includes(tok)) terms.push(tok);
    });

    return { terms, filters };
  }

  function fmtFilter(key, c, unit) {
    const names = { cg: 'Charge gly.', ig: 'IG', glucides: 'Glucides', calories: 'Calories', proteines: 'Protéines',
      lipides: 'Lipides', fibres: 'Fibres', temps: 'Temps', diff: 'Complexité' };
    const n = names[key] || key;
    if (c.min != null && c.max != null) return `${n} ${c.min}–${c.max}${unit}`;
    if (c.max != null) return `${n} ≤ ${c.max}${unit}`;
    if (c.min != null) return `${n} ≥ ${c.min}${unit}`;
    return n;
  }

  /* ============================================================
     Aides : extraction d'ingredients & mise a l'echelle
     ============================================================ */
  const EXTRA_INGREDIENTS = ['tomate', 'oignon', 'ail', 'carotte', 'courgette', 'aubergine', 'poivron', 'salade',
    'concombre', 'brocoli', 'chou', 'chou-fleur', 'champignon', 'epinard', 'poireau', 'pomme de terre', 'patate douce',
    'potiron', 'citron', 'avocat', 'haricot vert', 'navet', 'celeri', 'menthe', 'persil', 'basilic', 'ciboulette',
    'gingembre', 'echalote', 'radis', 'fenouil', 'poulet', 'dinde', 'boeuf', 'steak', 'porc', 'jambon', 'lardons',
    'saumon', 'cabillaud', 'colin', 'thon', 'truite', 'maquereau', 'sardine', 'crevette', 'tofu', 'oeuf', 'lait',
    'creme', 'fromage', 'feta', 'mozzarella', 'emmental', 'comte', 'parmesan', 'chevre', 'yaourt', 'beurre', 'riz',
    'pates', 'quinoa', 'boulgour', 'semoule', 'lentilles', 'pois chiches', 'haricots', 'mais', 'huile', 'vinaigre',
    'moutarde', 'olive', 'amande', 'noisette', 'sesame', 'farine', 'bouillon', 'curry', 'cumin', 'paprika', 'curcuma',
    'miel', 'flocons', 'avoine', 'pain', 'banane', 'pomme', 'poire', 'fraise', 'courge', 'butternut', 'saucisse',
    'chorizo', 'noix', 'raisin', 'petit pois', 'asperge', 'betterave', 'brebis', 'ricotta', 'creme fraiche',
    'sucre', 'vanille', 'cannelle', 'chocolat', 'levure', 'cacao', 'sirop', 'fruits rouges', 'abricot', 'peche'];

  function splitParts(s) {
    return String(s).split(/\s*\+\s*|,|\(|\)|\/| ou /i).map(x => x.trim()).filter(x => x.length >= 3);
  }
  function cap(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&'); }
  function indexOfWord(hay, n) {
    const m = new RegExp('(^|[^a-z0-9])' + escapeRe(n) + '(?:s|x)?([^a-z0-9]|$)').exec(hay);
    return m ? m.index : -1;
  }
  function guessQty(t, idx) {
    const before = t.slice(Math.max(0, idx - 18), idx);
    const m = before.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|cl|ml|l|c\.?\s*a\s*(?:soupe|cafe)|cuilleres?|gousses?|tranches?|boites?|pincees?|poignees?|sachets?|cas|cac)?\.?\s*(?:d['e]?\s*)?$/);
    return m ? (m[1] + (m[2] ? ' ' + m[2] : '')).trim() : '';
  }

  function fmtScaled(v) {
    if (!isFinite(v)) return '';
    let r;
    if (v >= 100) r = Math.round(v / 10) * 10;
    else if (v >= 20) r = Math.round(v / 5) * 5;
    else r = Math.round(v * 2) / 2;
    return Math.abs(r - Math.round(r)) < 1e-9 ? String(Math.round(r)) : String(r).replace('.', ',');
  }
  function scaleQty(qte, factor) {
    if (!qte || factor === 1 || !/\d/.test(qte)) return qte;
    return qte.replace(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)/g,
      (mm, fa, fb, nn) => {
        const val = (fa != null && fb != null)
          ? parseFloat(fa.replace(',', '.')) / parseFloat(fb.replace(',', '.'))
          : parseFloat(nn.replace(',', '.'));
        return fmtScaled(val * factor);
      });
  }
  App.scaleQty = scaleQty;

  /* ============================================================
     Classement par rayon (pour la liste de courses)
     ============================================================ */
  const RAYONS = [
    ['Pain & feculents frais', /\b(pain|galette|tortilla|wrap|baguette)\b/],
    ['Cremerie & oeufs', /\b(oeufs?|lait|creme|fromage|feta|mozzarella|emmental|comte|parmesan|chevre|yaourt|beurre|vache qui rit|burrata)\b/],
    ['Viandes & poissons', /\b(poulet|dinde|boeuf|steak|porc|filet mignon|jambon|lardons?|viande|hache|saumon|cabillaud|colin|lieu|merlu|thon|truite|maquereau|sardines?|crevettes?|gambas|saint-jacques|poisson|tofu)\b/],
    ['Fruits & legumes', /\b(tomates?|courgettes?|carottes?|oignons?|ail|poivrons?|salade|concombre|brocoli|chou|chou-fleur|champignons?|epinards?|aubergines?|poireaux?|pomme de terre|pommes de terre|patate douce|potiron|potimarron|butternut|citron|avocat|haricots? verts|navets?|celeri|menthe|persil|basilic|ciboulette|aneth|coriandre|gingembre|echalote|radis|fenouil|edamame|blettes|romanesco|herbes)\b/],
    ['Epicerie', /\b(riz|pates|spaghetti|nouilles|soba|quinoa|boulgour|semoule|orge|epeautre|lentilles|pois chiches|pois casses|haricots (?:rouges|blancs|noirs)|mais|tomates concassees|concassees|coulis|lait de coco|huile|vinaigre|moutarde|sauce soja|soja|teriyaki|olives?|capres|amandes|noisettes|pignons|sesame|graines|chapelure|farine|maizena|bouillon|curry|cumin|paprika|curcuma|ras el hanout|epices?|piment|origan|thym|romarin|miel|flocons|avoine|houmous|conserve|bocal)\b/]
  ];
  App.classifyRayon = function (name) {
    const n = norm(name);
    for (const [rayon, re] of RAYONS) if (re.test(n)) return rayon;
    return 'Autre';
  };
  App.RAYON_ORDER = ['Fruits & legumes', 'Viandes & poissons', 'Cremerie & oeufs', 'Epicerie',
    'Pain & feculents frais', 'Surgeles', 'Autre'];
  App.RAYON_EMOJI = {
    'Fruits & legumes': '🥕', 'Viandes & poissons': '🍖', 'Cremerie & oeufs': '🧀',
    'Epicerie': '🥫', 'Pain & feculents frais': '🥖', 'Surgeles': '❄️', 'Autre': '🛒'
  };

  App.Data = Data;
  App.parseQuery = parseQuery; // expose pour tests
})();
