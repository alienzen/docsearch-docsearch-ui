
    // ── Vue compacte (ensemble de la liste) ──────────────────────
    const COMPACT_RESULTS_KEY = 'docsearch-compact-results';

    function loadCompactPreference() {
      try {
        return localStorage.getItem(COMPACT_RESULTS_KEY) === '1';
      } catch (e) {
        return false;
      }
    }

    let state = {
      // ext/author/source/folder : sélection cumulative (plusieurs
      // valeurs à la fois, combinées en OR côté ES). ext stocke
      // directement les valeurs brutes du champ ES (".pdf", ".docx"...),
      // identiques aux clés retournées par facets.extensions.
      ext: [], author: [], keywords: [], folder: [], source: [], dateFrom: null, dateTo: null,
      // custom : facettes propres à une source SQL (ex: "Bureau"/"Fonction"
      // pour la source "agents"), voir search_api.py:_active_custom_facets()
      // — {es_field: [valeurs sélectionnées]}, même sélection cumulative
      // que les facettes fixes ci-dessus. Les sections correspondantes de
      // la sidebar apparaissent/disparaissent dynamiquement selon la ou
      // les sources en jeu (voir renderFacets()).
      custom: {},
      sort: '_score', page: 1,
      // searchId/resultIds : rattachent le pouce et le tracking de clic
      // à LA recherche qui a produit les résultats actuellement affichés
      // (voir renderFeedbackBar() et openDetail()).
      searchId: null, resultIds: [],
      // Préférence d'affichage, pas un critère de recherche — persistée en
      // localStorage (voir loadCompactPreference), donc jamais réinitialisée
      // par resetSearch() (comme collapsedFacets pour les facettes).
      resultsCompact: loadCompactPreference(),
    };

    // Libellés des facettes personnalisées de la DERNIÈRE recherche —
    // rempli par renderFacets(), lu par renderActiveFilters() pour
    // composer les puces (ex: "Bureau : Paris") sans redemander le
    // libellé au serveur à chaque clic. Pré-rempli une première fois par
    // loadCustomFacetOperators() au chargement de la page (voir
    // ci-dessous), pour que la toute première puce affiche déjà le bon
    // libellé plutôt que le nom de champ ES brut — renderFacets() écrase
    // ensuite ces valeurs à chaque recherche avec les facettes réellement
    // actives, sans perte : les deux sources partagent le même format.
    let customFacetLabels = {};

    // {es_field en minuscules: es_field} — TOUTES les facettes SQL
    // personnalisées actives, toutes sources cherchables confondues (pas
    // seulement celles de la dernière recherche, contrairement à
    // customFacetLabels ci-dessus) — permet à la syntaxe avancée de la
    // barre de recherche (ex: "bureau:Paris") de reconnaître un opérateur
    // personnalisé dès le chargement de la page, avant même une première
    // recherche. Voir loadCustomFacetOperators() et parseAdvancedQuery().
    let customFacetOperators = {};

    function toggleArrayValue(arr, value) {
      return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
    }

    // ── Sélection de documents / collections personnelles ──────────
    // Persiste tant que l'utilisateur ne l'annule pas explicitement ou ne
    // fait pas un resetSearch() complet — survit volontairement à un
    // changement de page/tri/filtre (permet de composer une sélection au
    // fil de plusieurs pages avant de l'ajouter à une collection).
    let selectedDocs = new Set();

    // ── Raccourcis clavier ────────────────────────────────────────
    // Focus courant sur la liste de résultats, pour ↑/↓/Entrée — remis à
    // -1 à chaque nouveau rendu (renderResults), les cartes précédentes
    // n'existant plus dans le DOM.
    let focusedResultIndex = -1;
