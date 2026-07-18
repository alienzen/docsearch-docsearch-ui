
    // Lu une fois au chargement — dit si le pouce/le NPS/les suggestions
    // doivent être affichés (suspendables depuis l'admin, voir
    // /admin/engagement-config). Le tracking de clic n'a pas
    // d'équivalent ici : toujours actif.
    let engagementConfig = { feedback_enabled: false, nps_enabled: false, suggestions_enabled: false };
    async function loadEngagementConfig() {
      try {
        engagementConfig = await api('/engagement-config');
      } catch (e) {
        // Échec silencieux (API indisponible) : pouce/NPS/suggestions
        // restent simplement masqués, la recherche elle-même n'est pas affectée.
      }
      document.getElementById('suggestion-link').style.display = engagementConfig.suggestions_enabled ? '' : 'none';
    }

    // Liens "Administration"/"Statistiques" : visibles seulement si
    // l'utilisateur est admin (/is-admin) ET que le flag admin_links_enabled
    // est actif (/ui-config) — un ET logique entre deux sources chargées
    // en parallèle, d'où ces variables partagées plutôt qu'un seul appel :
    // même un utilisateur autorisé ne doit plus les voir si l'admin a
    // désactivé le flag (ex: pendant une maintenance des pages admin).
    let uiConfigCache = { chat_enabled: true, footer_enabled: true, admin_links_enabled: true, export_enabled: true, help_enabled: true, collections_enabled: true, custom_keywords_enabled: true, alerts_enabled: true, sort_enabled: true, show_current_user_enabled: true, show_current_user_groups_enabled: true, theme: 'default', header_logo_url: '', favicon_url: '', sources_mount: '/sources', sources_mount_display: '' };
    let isAdminCache = false;
    // Rempli par loadIsAdmin() — séparé de uiConfigCache (qui ne porte que
    // des bascules) pour que updateCurrentUserText() puisse recalculer le
    // texte du badge si show_current_user_groups_enabled résout APRES
    // /is-admin, sans dépendre de l'ordre des deux appels parallèles.
    let currentUserCache = { user: null, groups: [] };

    function updateAdminLinksVisibility() {
      const display = (isAdminCache && uiConfigCache.admin_links_enabled) ? '' : 'none';
      document.getElementById('admin-link').style.display = display;
      document.getElementById('footer-stats-link').style.display = display;
      document.getElementById('footer-admin-link').style.display = display;
    }

    // Badge "Connecté : <utilisateur>" — bascule /admin/ui-config
    // (show_current_user_enabled). Appelé depuis loadUiConfig() ET
    // loadIsAdmin() (chargées en parallèle, voir plus bas) pour rester
    // correct quel que soit l'ordre de résolution des deux appels.
    function updateCurrentUserVisibility() {
      document.getElementById('current-user').style.display = uiConfigCache.show_current_user_enabled ? '' : 'none';
    }

    // Texte du badge — séparé de la visibilité ci-dessus car
    // show_current_user_groups_enabled ne masque que le suffixe
    // " · <groupes>", pas le badge entier. Même raison de double appel
    // (loadUiConfig() ET loadIsAdmin()) que updateCurrentUserVisibility().
    function updateCurrentUserText() {
      if (!currentUserCache.user) return;
      const groupsSuffix = (uiConfigCache.show_current_user_groups_enabled && currentUserCache.groups.length)
        ? ` · ${currentUserCache.groups.join(', ')}`
        : '';
      document.getElementById('current-user').textContent = `Connecté : ${currentUserCache.user}${groupsSuffix}`;
    }

    // Bascules d'interface sans rapport avec la satisfaction (ex:
    // visibilité du lien "Assistant IA") — voir docsearch-api/ui_config.py.
    async function loadUiConfig() {
      try {
        uiConfigCache = await api('/ui-config');
      } catch (e) {
        // Échec silencieux (API indisponible) : repli sur "activé" par défaut.
      }
      document.getElementById('chat-link').style.display = uiConfigCache.chat_enabled ? '' : 'none';
      document.getElementById('page-footer').style.display = uiConfigCache.footer_enabled ? '' : 'none';
      // export-actions est imbriqué dans results-actions (masqué tant
      // qu'aucune recherche n'est lancée) — on ne fixe ici que la
      // visibilité liée au flag, indépendamment de l'état de la recherche.
      document.getElementById('export-actions').style.display = uiConfigCache.export_enabled ? 'inline-flex' : 'none';
      document.getElementById('help-link').style.display = uiConfigCache.help_enabled ? '' : 'none';
      document.getElementById('collections-wrap').style.display = uiConfigCache.collections_enabled ? '' : 'none';
      if (!uiConfigCache.collections_enabled) clearSelection();
      document.getElementById('alerts-wrap').style.display = uiConfigCache.alerts_enabled ? '' : 'none';
      document.getElementById('sort-select-wrap').style.display = uiConfigCache.sort_enabled ? '' : 'none';
      document.documentElement.dataset.theme = uiConfigCache.theme || 'default';
      try { localStorage.setItem('docsearch-theme', uiConfigCache.theme || 'default'); } catch (e) {}
      // Changement de thème ci-dessus : peut à lui seul changer la hauteur
      // du header (ex: dsfr agrandit .header-links-btn) — resynchronisé
      // même avant que le logo (async) n'ait fini de charger.
      syncSidebarOffset();
      // Vide -> repli sur le monogramme par défaut (même valeur que le
      // src initial posé dans index.html, pour ne rien afficher de cassé
      // avant que ce script ne s'exécute).
      const logoEl = document.getElementById('header-logo');
      if (logoEl) {
        // Resynchronise une fois la NOUVELLE image effectivement chargée —
        // sa taille intrinsèque (donc la hauteur rendue de .header-logo,
        // sans hauteur fixe en CSS) n'est connue qu'à ce moment-là, pas au
        // moment où .src est juste assigné ci-dessous.
        logoEl.onload = syncSidebarOffset;
        logoEl.src = uiConfigCache.header_logo_url ||
          "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23000091'/%3E%3Ctext x='16' y='23' text-anchor='middle' font-family='Arial, sans-serif' font-weight='700' font-size='18' fill='%23fff'%3ED%3C/text%3E%3C/svg%3E";
      }
      const faviconEl = document.querySelector('link[rel="icon"]');
      if (faviconEl) faviconEl.href = uiConfigCache.favicon_url || '/favicon.svg';
      updateAdminLinksVisibility();
      updateCurrentUserVisibility();
      updateCurrentUserText();
    }

    // Ces pages exigent déjà elles-mêmes le groupe admin (403 sinon) —
    // autant ne pas les proposer à un utilisateur qui n'y a pas accès.
    // /is-admin ne lève jamais d'erreur (voir admin_auth.is_admin()),
    // contrairement à un vrai appel /admin/*.
    async function loadIsAdmin() {
      try {
        const res = await api('/is-admin');
        isAdminCache = res.is_admin;
        currentUserCache = { user: res.user, groups: res.groups || [] };
        updateCurrentUserText();
      } catch (e) {
        // Échec silencieux (API indisponible) : les liens restent masqués par défaut.
      }
      updateAdminLinksVisibility();
      updateCurrentUserVisibility();
    }

    // ── Présélection de sources (avant recherche) ────────────────
    // Complète la facette "Source" de la sidebar (qui n'apparaît qu'APRÈS
    // une recherche, dérivée des résultats) — les deux partagent le même
    // state.source, donc une sélection faite ici reste reflétée là-bas
    // (et réciproquement) sans code de synchronisation supplémentaire.
    let allSources = [];   // [{name, label, type}], chargé une fois au démarrage

    async function loadSearchableSources() {
      try {
        allSources = await api('/searchable-sources');
      } catch (e) {
        // Échec silencieux (API indisponible) : la présélection reste
        // vide, la recherche fédérée sur toutes les sources continue de
        // fonctionner normalement.
      }
      updateSourcesButtonLabel();
    }

    async function loadCustomFacetOperators() {
      try {
        const fields = await api('/custom-facets');   // {es_field: label}
        customFacetOperators = {};
        Object.keys(fields).forEach(field => { customFacetOperators[field.toLowerCase()] = field; });
        // Pré-remplit customFacetLabels (voir sa déclaration) pour que la
        // toute première puce, avant toute recherche, affiche déjà le bon
        // libellé — sans écraser des libellés éventuellement déjà posés
        // par une recherche entre-temps (ordre d'arrivée réseau non
        // garanti, cet appel est lancé en parallèle des autres au
        // chargement de la page).
        Object.entries(fields).forEach(([field, label]) => {
          if (!(field in customFacetLabels)) customFacetLabels[field] = label;
        });
      } catch (e) {
        // Échec silencieux (API indisponible) : la syntaxe avancée
        // reconnaît simplement moins d'opérateurs — les facettes cliquées
        // depuis la sidebar (après une recherche) continuent de fonctionner.
      }
    }

    // Libellé d'affichage d'une source à partir de son nom (clé de
    // registre) — repli sur le nom brut si la source n'est pas (encore)
    // dans allSources (ex: chargement de /searchable-sources en échec).
    function sourceLabel(name) {
      const found = allSources.find(s => s.name === name);
      return found ? found.label : name;
    }

    // Une source absente de allSources (échec de /searchable-sources, ou
    // pas encore chargé) est traitée comme collectable par défaut — même
    // logique de repli tolérant que sourceLabel() ci-dessus : on ne
    // masque la case à cocher que si on SAIT positivement que la source
    // l'interdit, jamais par défaut sur une donnée manquante.
    function sourceCollectable(name) {
      const found = allSources.find(s => s.name === name);
      return found ? found.collectable !== false : true;
    }

    function updateSourcesButtonLabel() {
      const btn = document.getElementById('sources-select-toggle');
      if (!btn) return;
      let label;
      if (!state.source.length) label = 'Toutes les sources';
      else if (state.source.length === 1) label = sourceLabel(state.source[0]);
      else label = `${state.source.length} sources`;
      btn.textContent = label + ' ▾';
    }

    function renderSourcesPanel() {
      const panel = document.getElementById('sources-select-panel');
      if (!allSources.length) {
        panel.innerHTML = '<div class="saved-empty">Aucune source disponible</div>';
        return;
      }
      panel.innerHTML = allSources.map(s => `
        <label class="sources-select-item">
          <input type="checkbox" data-source="${escapeHtml(s.name)}" ${state.source.includes(s.name) ? 'checked' : ''} />
          ${escapeHtml(s.label)}
        </label>`).join('');
      panel.querySelectorAll('input[type=checkbox]').forEach(cb => {
        cb.addEventListener('change', () => {
          state.source = toggleArrayValue(state.source, cb.dataset.source);
          updateSourcesButtonLabel();
        });
      });
    }

    function toggleSourcesPanel() {
      const panel = document.getElementById('sources-select-panel');
      const opening = !panel.classList.contains('open');
      if (!opening) { panel.classList.remove('open'); return; }
      renderSourcesPanel();
      panel.classList.add('open');
    }
