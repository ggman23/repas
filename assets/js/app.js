/* Point d'entree : charge les donnees puis demarre l'interface. */
(async function () {
  const view = document.getElementById('view');
  try {
    App.Store.load();
    await App.Data.load();
    App.Data.syncCustom(App.Store.state.customRecipes);
    App.UI.init();
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="empty"><span class="big">😕</span>
      Impossible de charger les recettes.<br><span class="small">${e.message}</span></div>`;
  }
  // Le service worker est enregistre tot via le script inline du <head>.
})();
