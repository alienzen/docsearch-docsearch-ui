
    function fmtSize(bytes) {
      if (!bytes) return '—';
      if (bytes < 1024) return bytes + ' o';
      if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' Ko';
      return (bytes / 1048576).toFixed(1) + ' Mo';
    }

    function extLabel(ext) {
      return (ext || '').replace('.', '').toUpperCase() || '—';
    }

    async function api(path, options = {}) {
      const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = new Error(body.detail || `Erreur ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    }

    // Critères communs à /search et /search/export (pagination exclue —
    // chacun des deux appelants fixe from/size selon son propre besoin).
    function buildSearchCriteria(q) {
      return {
        query: q,
        sort: state.sort,
        extension: state.ext.length ? state.ext : null,
        author: state.author,
        keywords: state.keywords,
        folder: state.folder,
        source: state.source,
        custom: state.custom,
        date_from: state.dateFrom,
        date_to: state.dateTo,
      };
    }

    // ── Syntaxe avancée de recherche ────────────────────────────
    // "auteur:", "mots-cles:", "type:", "source:", "dossier:" (+ alias
    // anglais) dans la barre de recherche — convertis en filtres
    // cumulatifs (state.author/keywords/ext/source/folder), EXACTEMENT
    // comme un clic sur la facette
    // correspondante : même mécanisme de sélection cumulative, mêmes
    // puces retirables, même correspondance EXACTE (pas de recherche
    // floue — la valeur doit correspondre à ce qu'affiche la facette,
    // ex: copier-coller le nom d'auteur depuis la liste "Auteur").
    // Valeur sur un seul mot (auteur:dupont) ou entre guillemets pour les
    // espaces (auteur:"Jean Dupont"). Un opérateur non reconnu (ex:
    // "foo:bar") est laissé tel quel dans le texte libre plutôt que
    // silencieusement supprimé.
    //
    // Ces opérateurs fixes sont volontairement prioritaires sur les
    // facettes SQL personnalisées dynamiques (customFacetOperators,
    // ci-dessous) : une source qui déclarerait par mégarde un champ
    // "source" ou "type" ne doit jamais pouvoir masquer ces dimensions
    // core, communes à toutes les installations.
    const ADVANCED_QUERY_OPERATORS = {
      auteur: 'author', author: 'author',
      // Pas d'accent dans les clés : ADVANCED_QUERY_RE ne matche que
      // [a-zA-Z0-9_-]+ avant les ":" (comme "auteur"/"dossier", déjà sans
      // accent) — "mots-clés:" ne serait jamais reconnu à cause du "é".
      'mots-cles': 'keywords', motscles: 'keywords', keywords: 'keywords', keyword: 'keywords',
      type: 'ext', ext: 'ext', extension: 'ext',
      source: 'source',
      dossier: 'folder', folder: 'folder',
    };
    // Chiffres et underscore en plus des lettres/tiret (par rapport aux
    // seuls opérateurs fixes ci-dessus) : les noms de champ ES des
    // facettes SQL personnalisées (customFacetOperators) suivent des
    // conventions de nommage plus larges (ex: "num_tel") que les
    // opérateurs fixes d'origine.
    const ADVANCED_QUERY_RE = /\b([a-zA-Z0-9_-]+):(?:"([^"]*)"|(\S+))/g;

    function parseAdvancedQuery(text) {
      const extracted = { author: [], keywords: [], ext: [], source: [], folder: [], custom: {} };
      const remaining = text.replace(ADVANCED_QUERY_RE, (match, key, quoted, bare) => {
        const lowerKey = key.toLowerCase();
        const dim = ADVANCED_QUERY_OPERATORS[lowerKey];
        const customField = dim ? null : customFacetOperators[lowerKey];
        if (!dim && !customField) return match;
        let value = (quoted !== undefined ? quoted : bare).trim();
        if (!value) return match;
        if (dim === 'ext') value = (value.startsWith('.') ? value : '.' + value).toLowerCase();
        if (dim) {
          extracted[dim].push(value);
        } else {
          (extracted.custom[customField] = extracted.custom[customField] || []).push(value);
        }
        return '';
      }).replace(/\s+/g, ' ').trim();
      return { remaining, extracted };
    }

    // Vrai s'il y a quelque chose à chercher : texte libre, ou au moins
    // un filtre actif (facette cliquée ou extraite de la syntaxe avancée,
    // ou période) — une recherche à critères tous vides ne part jamais.
    function hasActiveCriteria(q) {
      return !!q || state.ext.length || state.author.length || state.keywords.length || state.folder.length ||
             state.source.length || state.dateFrom || state.dateTo ||
             Object.values(state.custom).some(values => values.length);
    }

    async function doSearch() {
      const rawQ = document.getElementById('q').value.trim();
      const { remaining, extracted } = parseAdvancedQuery(rawQ);
      extracted.author.forEach(v => { if (!state.author.includes(v)) state.author.push(v); });
      extracted.keywords.forEach(v => { if (!state.keywords.includes(v)) state.keywords.push(v); });
      extracted.ext.forEach(v    => { if (!state.ext.includes(v))    state.ext.push(v); });
      extracted.source.forEach(v => { if (!state.source.includes(v)) state.source.push(v); });
      extracted.folder.forEach(v => { if (!state.folder.includes(v)) state.folder.push(v); });
      Object.entries(extracted.custom).forEach(([field, values]) => {
        const current = state.custom[field] || [];
        values.forEach(v => { if (!current.includes(v)) current.push(v); });
        state.custom[field] = current;
      });
      // La barre ne garde que le texte libre restant — les opérateurs
      // reconnus deviennent des puces de filtre (voir renderActiveFilters),
      // seule source de vérité ensuite (les retirer via leur puce ✕ ne
      // doit pas les faire réapparaître au prochain Entrée).
      if (remaining !== rawQ) document.getElementById('q').value = remaining;

      const q = remaining;
      if (!hasActiveCriteria(q)) return;
      state.sort = document.getElementById('sort').value;

      const body = {
        ...buildSearchCriteria(q),
        size: PER_PAGE,
        from: (state.page - 1) * PER_PAGE,
      };

      const box = document.getElementById('results');
      try {
        const data = await api('/search', { method: 'POST', body: JSON.stringify(body) });
        state.searchId   = data.search_id || null;
        state.resultIds  = data.results.map(r => r.id);
        renderResults(data, q);
        renderFacets(data.facets);
        renderActiveFilters();
        renderFeedbackBar();
        maybeShowNps();
      } catch (e) {
        box.innerHTML = `<p class="empty">Impossible de contacter l'API : ${e.message}</p>`;
      }
    }

    // ── Export des résultats (XLSX / DOCX) ──────────────────────
    // POST (pas GET comme /admin/search-logs/export) : les critères de
    // recherche peuvent dépasser la taille raisonnable d'une query
    // string. fetch + blob plutôt que window.open(), qui ne sait faire
    // qu'un GET.
    async function exportResults(format) {
      const q = document.getElementById('q').value.trim();
      if (!hasActiveCriteria(q)) return;
      const body = { ...buildSearchCriteria(q), format };
      try {
        const res = await fetch('/search/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.detail || `Erreur ${res.status}`);
        }
        const blob = await res.blob();
        const disposition = res.headers.get('Content-Disposition') || '';
        const match = disposition.match(/filename="?([^"]+)"?/);
        const filename = match ? match[1] : `resultats.${format}`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (e) {
        alert("Impossible d'exporter les résultats : " + e.message);
      }
    }
