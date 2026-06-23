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

    async load() {
      const res = await fetch(C.recipesPath, { cache: 'no-cache' });
      if (!res.ok) throw new Error('Impossible de charger les recettes (' + res.status + ')');
      const data = await res.json();
      this.recipes = data.recipes || [];
      this.recipes.forEach(r => {
        this.byId[r.id] = r;
        r._blob = norm([r.nom, r.ingredients.map(i => i.nom).join(' '),
          r.ingredients.map(i => (i.subs || []).join(' ')).join(' '),
          (r.tags || []).join(' '), r.famille, r.ig_label, (r.saisons || []).join(' ')].join(' '));
      });
      this.buildPlan();
      return this.recipes;
    },

    /* ---------- planning annuel ---------- */
    buildPlan() {
      const midiPool = this.recipes.filter(r => r.types.indexOf('m') >= 0);
      const soirPool = this.recipes.filter(r => r.types.indexOf('s') >= 0);
      const rndM = mulberry32(C.planSeed);
      const rndS = mulberry32(C.planSeed ^ 0x9e3779b9);
      let mDeck = [], sDeck = [];
      const draw = (pool, deck, rnd, avoid) => {
        if (!deck.length) deck.push.apply(deck, shuffle(pool.slice(), rnd));
        let i = 0;
        while (i < deck.length && deck[i].id === avoid) i++;
        if (i >= deck.length) i = 0;
        return deck.splice(i, 1)[0];
      };
      this.plan = [];
      for (let d = 0; d < C.planDays; d++) {
        const m = draw(midiPool, mDeck, rndM, null);
        const s = draw(soirPool, sDeck, rndS, m.id);
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

    emojiFor(r) {
      if (!r) return '🍽️';
      if (r.famille === 'soupe') return '🥣';
      if (r.famille === 'salade') return '🥗';
      const map = { oeuf: '🍳', volaille: '🍗', poisson: '🐟', boeuf: '🥩', porc: '🥓', legumineuse: '🫘', vege: '🥗' };
      return map[r.famille] || '🍽️';
    }
  };

  function metricValue(r, key) {
    switch (key) {
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
    { key: 'ig', kw: /\b(?:ig|index glycemique|indice glycemique|glycemique)\b/, unit: '' },
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
    'cherche trouve montre veut idee idees menu midi soir ' +
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
    const names = { ig: 'IG', glucides: 'Glucides', calories: 'Calories', proteines: 'Protéines',
      lipides: 'Lipides', fibres: 'Fibres', temps: 'Temps', diff: 'Complexité' };
    const n = names[key] || key;
    if (c.min != null && c.max != null) return `${n} ${c.min}–${c.max}${unit}`;
    if (c.max != null) return `${n} ≤ ${c.max}${unit}`;
    if (c.min != null) return `${n} ≥ ${c.min}${unit}`;
    return n;
  }

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
