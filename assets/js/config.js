/* Configuration globale de l'outil. Modifiable dans Reglages (sauf owner/repo). */
window.App = window.App || {};
App.CONFIG = {
  owner: 'ggman23',
  repo: 'repas',
  defaultDataBranch: 'main',   // branche ou est stocke data/state.json (modifiable dans Reglages)
  statePath: 'data/state.json',
  recipesPath: 'data/recipes.json',
  planSeed: 20260623,          // graine fixe => meme planning sur tous les appareils
  planDays: 366,
  pollMs: 15000,               // intervalle de rafraichissement auto sur l'ecran Courses
  pushDebounceMs: 1200,
  appName: 'Mes Repas'
};
