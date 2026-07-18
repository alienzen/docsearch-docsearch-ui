
    // ── Accordéon des facettes (sidebar) ─────────────────────────
    // Repli/dépli persisté en localStorage (par navigateur/poste) — un
    // utilisateur qui replie systématiquement "Auteur" ou "Dossier" n'a
    // pas à le refaire à chaque recherche ou rechargement de page.
    const FACET_COLLAPSED_KEY = 'docsearch-collapsed-facets';

    function loadCollapsedFacets() {
      try {
        return new Set(JSON.parse(localStorage.getItem(FACET_COLLAPSED_KEY) || '[]'));
      } catch (e) {
        return new Set();
      }
    }

    const collapsedFacets = loadCollapsedFacets();

    function applyCollapsedFacets() {
      collapsedFacets.forEach(id => document.getElementById(id)?.classList.add('collapsed'));
    }

    function toggleFacetAccordion(id) {
      if (collapsedFacets.has(id)) collapsedFacets.delete(id); else collapsedFacets.add(id);
      document.getElementById(id)?.classList.toggle('collapsed', collapsedFacets.has(id));
      try {
        localStorage.setItem(FACET_COLLAPSED_KEY, JSON.stringify([...collapsedFacets]));
      } catch (e) {
        // localStorage indisponible : le pli reste actif pour cette session, simplement pas persisté.
      }
    }

    function renderFacets(facets) {
      if (!facets) return;

      const extensionsBox = document.getElementById('facet-extensions');
      extensionsBox.innerHTML = (facets.extensions || []).filter(f => f.key).map(f => `
        <div class="facet-row${state.ext.includes(f.key) ? ' active' : ''}" data-facet-type="ext" data-facet-value="${escapeHtml(f.key)}">
          <span>${extLabel(f.key)}</span><span class="facet-count">${f.doc_count.toLocaleString('fr-FR')}</span>
        </div>`).join('') || '<div class="facet-empty">Aucun type</div>';

      const sourcesBox = document.getElementById('facet-sources');
      sourcesBox.innerHTML = (facets.sources || []).filter(f => f.key).map(f => `
        <div class="facet-row${state.source.includes(f.key) ? ' active' : ''}" data-facet-type="source" data-facet-value="${escapeHtml(f.key)}">
          <span>${escapeHtml(sourceLabel(f.key))}</span><span class="facet-count">${f.doc_count.toLocaleString('fr-FR')}</span>
        </div>`).join('') || '<div class="facet-empty">Aucune source</div>';

      const authorsBox = document.getElementById('facet-authors');
      authorsBox.innerHTML = (facets.authors || []).filter(f => f.key).map(f => `
        <div class="facet-row${state.author.includes(f.key) ? ' active' : ''}" data-facet-type="author" data-facet-value="${escapeHtml(f.key)}">
          <span>${f.key}</span><span class="facet-count">${f.doc_count.toLocaleString('fr-FR')}</span>
        </div>`).join('') || '<div class="facet-empty">Aucun auteur</div>';

      const keywordsBox = document.getElementById('facet-keywords');
      keywordsBox.innerHTML = (facets.keywords || []).filter(f => f.key).map(f => `
        <div class="facet-row${state.keywords.includes(f.key) ? ' active' : ''}" data-facet-type="keywords" data-facet-value="${escapeHtml(f.key)}">
          <span>${escapeHtml(f.key)}</span><span class="facet-count">${f.doc_count.toLocaleString('fr-FR')}</span>
        </div>`).join('') || '<div class="facet-empty">Aucun mot-clé</div>';

      const foldersBox = document.getElementById('facet-folders');
      foldersBox.innerHTML = (facets.folders || []).filter(f => f.key).map(f => `
        <div class="facet-row${state.folder.includes(f.key) ? ' active' : ''}" data-facet-type="folder" data-facet-value="${escapeHtml(f.key)}" title="${escapeHtml(f.key)}">
          <span>${escapeHtml(folderBasename(f.key))}</span><span class="facet-count">${f.doc_count.toLocaleString('fr-FR')}</span>
        </div>`).join('') || '<div class="facet-empty">Aucun dossier</div>';

      // Gestionnaires attachés après le rendu plutôt qu'un onclick
      // interpolé directement dans le HTML (l'ancienne version cassait
      // le HTML dès qu'un nom d'auteur/dossier contenait un guillemet,
      // via JSON.stringify() injecté dans un attribut déjà délimité
      // par des guillemets doubles).
      document.querySelectorAll('#facet-extensions .facet-row, #facet-sources .facet-row, #facet-authors .facet-row, #facet-keywords .facet-row, #facet-folders .facet-row').forEach(row => {
        row.addEventListener('click', () => toggleFacet(row.dataset.facetType, row.dataset.facetValue));
      });

      renderCustomFacets(facets.custom || {});
    }

    // ── Facettes personnalisées par source (ex: "Bureau"/"Fonction" pour
    // la source "agents", voir sql_sources_config.py:FieldMapping.facet)
    // ─────────────────────────────────────────────────────────────────
    // Contrairement aux 5 facettes fixes ci-dessus (sections déjà présentes
    // dans le HTML, seul leur contenu est rebâti à chaque recherche), les
    // sections elles-mêmes n'existent pas d'avance : leur ensemble dépend
    // de la ou des sources actuellement en jeu. On reconstruit donc
    // entièrement #facet-custom-container à chaque recherche plutôt que
    // de diffing — une section dont le champ n'est plus dans `facets.custom`
    // (ex: source changée) disparaît naturellement, sans code de retrait
    // séparé.
    function renderCustomFacets(customFacets) {
      const container = document.getElementById('facet-custom-container');
      customFacetLabels = {};
      container.innerHTML = Object.entries(customFacets).map(([field, def]) => {
        customFacetLabels[field] = def.label || field;
        const sectionId = `facet-section-custom-${field}`;
        const selected = state.custom[field] || [];
        const rows = (def.buckets || []).filter(b => b.key !== undefined && b.key !== null && b.key !== '').map(b => `
          <div class="facet-row${selected.includes(String(b.key)) ? ' active' : ''}" data-facet-field="${escapeHtml(field)}" data-facet-value="${escapeHtml(String(b.key))}">
            <span>${escapeHtml(String(b.key))}</span><span class="facet-count">${b.doc_count.toLocaleString('fr-FR')}</span>
          </div>`).join('') || '<div class="facet-empty">Aucune valeur</div>';
        return `
        <div class="facet-section${collapsedFacets.has(sectionId) ? ' collapsed' : ''}" id="${sectionId}">
          <div class="facet-title" onclick="toggleFacetAccordion('${sectionId}')">${escapeHtml(customFacetLabels[field])}<span class="facet-caret">▾</span></div>
          <div class="facet-body"><div>${rows}</div></div>
        </div>`;
      }).join('');

      container.querySelectorAll('.facet-row').forEach(row => {
        row.addEventListener('click', () => toggleCustomFacet(row.dataset.facetField, row.dataset.facetValue));
      });
    }

    function toggleCustomFacet(field, value) {
      state.custom[field] = toggleArrayValue(state.custom[field] || [], value);
      if (!state.custom[field].length) delete state.custom[field];
      state.page = 1;
      doSearch();
    }

    function toggleFacet(type, value) {
      if (type === 'ext') state.ext = toggleArrayValue(state.ext, value);
      if (type === 'source') state.source = toggleArrayValue(state.source, value);
      if (type === 'author') state.author = toggleArrayValue(state.author, value);
      if (type === 'keywords') state.keywords = toggleArrayValue(state.keywords, value);
      if (type === 'folder') state.folder = toggleArrayValue(state.folder, value);
      state.page = 1;
      doSearch();
    }

    function applyDateRange() {
      state.dateFrom = document.getElementById('date-from').value || null;
      state.dateTo   = document.getElementById('date-to').value || null;
      state.page = 1;
      doSearch();
    }

    function renderActiveFilters() {
      const wrap = document.getElementById('active-filters');
      const chips = [];
      // Une puce PAR valeur sélectionnée (sélection cumulative) — la
      // retirer ne déselectionne que cette valeur-là, pas tout le facet.
      state.ext.forEach(e => chips.push({ label: 'Type : ' + extLabel(e), clear: () => { state.ext = state.ext.filter(v => v !== e); } }));
      state.source.forEach(s => chips.push({ label: 'Source : ' + s, clear: () => { state.source = state.source.filter(v => v !== s); } }));
      state.author.forEach(a => chips.push({ label: 'Auteur : ' + a, clear: () => { state.author = state.author.filter(v => v !== a); } }));
      state.keywords.forEach(k => chips.push({ label: 'Mot-clé : ' + k, clear: () => { state.keywords = state.keywords.filter(v => v !== k); } }));
      state.folder.forEach(f => chips.push({ label: 'Dossier : ' + f, clear: () => { state.folder = state.folder.filter(v => v !== f); } }));
      Object.entries(state.custom).forEach(([field, values]) => {
        values.forEach(v => chips.push({
          label: (customFacetLabels[field] || field) + ' : ' + v,
          clear: () => {
            state.custom[field] = (state.custom[field] || []).filter(x => x !== v);
            if (!state.custom[field].length) delete state.custom[field];
          }
        }));
      });
      if (state.dateFrom || state.dateTo) chips.push({
        label: 'Période : ' + (state.dateFrom || '…') + ' → ' + (state.dateTo || '…'),
        clear: () => {
          state.dateFrom = null; state.dateTo = null;
          document.getElementById('date-from').value = '';
          document.getElementById('date-to').value = '';
        }
      });
      wrap.innerHTML = chips.map((c, i) =>
        `<span class="active-filter-chip">${c.label}<button onclick="clearFilterAt(${i})" aria-label="Retirer ce filtre">${ICON_X}</button></span>`
      ).join('');
      window.__clearFns = chips.map(c => c.clear);
      document.getElementById('clear-all').style.display = chips.length ? 'inline-block' : 'none';
      updateSourcesButtonLabel();
    }

    function clearFilterAt(i) {
      window.__clearFns[i]();
      state.page = 1;
      doSearch();
    }

    function clearAllFilters() {
      state.ext = []; state.author = []; state.keywords = []; state.folder = []; state.source = []; state.custom = {}; state.dateFrom = null; state.dateTo = null; state.page = 1;
      document.getElementById('date-from').value = '';
      document.getElementById('date-to').value = '';
      doSearch();
    }

    function resetSearch() {
      // Remise à zéro complète — contrairement à clearAllFilters() (qui
      // ne touche qu'aux facettes/période), ceci efface aussi la requête
      // elle-même et le tri, et ramène l'affichage à l'état initial
      // (aucune recherche lancée).
      state = { ext: [], author: [], keywords: [], folder: [], source: [], custom: {}, dateFrom: null, dateTo: null, sort: '_score', page: 1, searchId: null, resultIds: [], resultsCompact: state.resultsCompact };
      customFacetLabels = {};
      clearSelection();

      document.getElementById('q').value = '';
      document.getElementById('sort').value = '_score';
      document.getElementById('date-from').value = '';
      document.getElementById('date-to').value = '';

      const resultCount = document.getElementById('result-count');
      resultCount.textContent = '';
      resultCount.style.display = 'none';
      const pageInfo = document.getElementById('result-page-info');
      pageInfo.textContent = '';
      pageInfo.style.display = 'none';
      document.getElementById('results-actions').style.display = 'none';
      document.getElementById('results').innerHTML = '<p class="empty">Lancez une recherche pour voir les résultats.</p>';
      document.getElementById('pagination').innerHTML = '';
      document.getElementById('feedback-bar').innerHTML = '';
      document.getElementById('active-filters').innerHTML = '';
      document.getElementById('facet-extensions').innerHTML = '<div class="facet-empty">Lancez une recherche</div>';
      document.getElementById('facet-sources').innerHTML = '<div class="facet-empty">Lancez une recherche</div>';
      document.getElementById('facet-authors').innerHTML = '<div class="facet-empty">Lancez une recherche</div>';
      document.getElementById('facet-keywords').innerHTML = '<div class="facet-empty">Lancez une recherche</div>';
      document.getElementById('facet-folders').innerHTML = '<div class="facet-empty">Lancez une recherche</div>';
      document.getElementById('facet-custom-container').innerHTML = '';
      document.getElementById('clear-all').style.display = 'none';
      updateSourcesButtonLabel();
    }
