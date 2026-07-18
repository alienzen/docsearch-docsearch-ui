
    function renderSelectionToolbar() {
      const bar = document.getElementById('selection-toolbar');
      if (!bar) return;
      if (!uiConfigCache.collections_enabled || selectedDocs.size === 0) {
        bar.style.display = 'none';
        return;
      }
      bar.style.display = 'flex';
      const n = selectedDocs.size;
      bar.querySelector('.selection-count').textContent =
        n + ' document' + (n > 1 ? 's' : '') + ' sélectionné' + (n > 1 ? 's' : '');
    }

    function toggleDocSelection(docId, checked) {
      if (checked) selectedDocs.add(docId); else selectedDocs.delete(docId);
      renderSelectionToolbar();
    }

    function clearSelection() {
      selectedDocs.clear();
      document.querySelectorAll('.result-select-cb').forEach(cb => { cb.checked = false; });
      renderSelectionToolbar();
    }

    function renderResults(data, q) {
      const box = document.getElementById('results');
      focusedResultIndex = -1;   // les cartes précédentes n'existent plus après ce rendu
      const resultCount = document.getElementById('result-count');
      resultCount.style.display = '';
      document.getElementById('results-actions').style.display = 'flex';
      resultCount.textContent =
        data.total.toLocaleString('fr-FR') + ' résultat' + (data.total > 1 ? 's' : '') +
        (q ? ` pour « ${q} »` : '');

      // Même info que renderPagination() (Page X sur Y), dupliquée ici pour
      // rester visible sans avoir à défiler jusqu'au bas des résultats —
      // masquée dans les mêmes conditions (une seule page, ou aucun résultat).
      const pageInfo = document.getElementById('result-page-info');
      const pages = Math.ceil(data.total / PER_PAGE);
      pageInfo.style.display = pages > 1 ? '' : 'none';
      pageInfo.textContent = pages > 1 ? `Page ${state.page} sur ${pages}` : '';

      if (!data.results.length) {
        box.innerHTML = `<p class="empty">${ICON_SEARCH_OFF}Aucun résultat ne correspond à ces critères.</p>`;
        document.getElementById('pagination').innerHTML = '';
        return;
      }

      box.innerHTML = data.results.map(r => renderCard(r)).join('');
      applySourceCardHooks(data.results);

      renderPagination(data.total);
      renderSelectionToolbar();
    }

    // Applique sourceCardHooks (voir constants.js et public/js/custom-sources.js)
    // une fois les cartes réellement insérées dans le DOM — un hook a besoin de
    // l'élément DOM pour le modifier, pas du HTML encore sous forme de chaîne
    // dans renderCard(). L'ordre de querySelectorAll suit celui de
    // data.results.map() ci-dessus, d'où le zip par index plutôt que par
    // data-doc-id. Chaque hook est isolé par un try/catch : une erreur dans
    // un fichier de personnalisation (édité à la main) ne doit pas casser
    // l'affichage des autres cartes.
    function applySourceCardHooks(results) {
      const cards = document.querySelectorAll('#results .result-card');
      results.forEach((r, i) => {
        const hook = sourceCardHooks[r.source];
        if (!hook) return;
        try {
          hook(cards[i], r);
        } catch (e) {
          console.error(`sourceCardHooks['${r.source}'] a échoué :`, e);
        }
      });
    }

    // Case de sélection pour les collections — décalage du corps de carte
    // (métadonnées/chemin/extrait) pour rester aligné sous le titre selon
    // qu'elle précède ou non l'icône (voir bodyIndent dans renderCard()).
    function _showSelectCb(r) {
      return uiConfigCache.collections_enabled && sourceCollectable(r.source);
    }

    function renderCard(r) {
      const showSelectCb = _showSelectCb(r);
      const checkboxHtml = showSelectCb ? `<input type="checkbox" class="result-select-cb" data-doc-id="${r.id}" ${selectedDocs.has(r.id) ? 'checked' : ''}
                   onclick="event.stopPropagation();" onchange="toggleDocSelection('${r.id}', this.checked)"
                   aria-label="Sélectionner ce document" />` : '';
      const ec = EXT_COLORS[r.extension] || { bg: '#F1EFE8', color: '#444441' };
      const scorePct = Math.min(100, Math.round((r.score || 0) * 20));
      const sourceNote = r.source
        ? (() => {
            // Couleur dérivée du nom brut (stable même si le libellé change),
            // mais texte et initiale affichés basés sur le libellé.
            const sc = sourceColor(r.source);
            const label = sourceLabel(r.source);
            return `<span class="source-badge" title="Source : ${escapeHtml(label)}">
              <span class="source-dot" style="background:${sc.bg};color:${sc.color};">${escapeHtml(label.charAt(0).toUpperCase())}</span>
              ${escapeHtml(label)}
            </span>`;
          })()
        : '';

      // bodyIndent aligne le corps (métadonnées/chemin/extrait) sous le
      // titre selon que la case de sélection précède ou non l'icône.
      const snippets = (r.highlight || []).join(' … ');
      const isArchiveMember = (r.filepath || '').includes('::');
      const archiveNote = isArchiveMember
        ? `<span class="archive-badge">${ICON_FILE_ZIP}Extrait d'une archive</span>`
        : '';
      // 52 = ext-icon (38px) + gap .result-header (14px) ; 81 = + case à
      // cocher (15px) + son propre gap — garde le corps (métadonnées,
      // chemin) aligné visuellement sous le titre, pas sous l'icône.
      const bodyIndent = showSelectCb ? 81 : 52;
      return `
      <div class="result-card${state.resultsCompact ? ' collapsed' : ''}" data-doc-id="${r.id}" data-source="${escapeHtml(r.source || '')}">
        <div class="result-header" onclick="toggleResultAccordion(this.closest('.result-card'))">
          ${checkboxHtml}
          <div class="ext-icon" style="background:${ec.bg};color:${ec.color};">${extLabel(r.extension)}</div>
          <div style="flex:1;min-width:0;">
            <div class="result-title">${r.title || r.filename}</div>
          </div>
          <span class="score-pill">${scorePct}%</span>
          <span class="result-caret">▾</span>
        </div>
        <div class="result-body">
          <div class="result-meta" style="margin-left:${bodyIndent}px;">
            ${sourceNote}
            ${r.author ? `<span>${ICON_USER}${r.author}</span>` : ''}
            <span>${ICON_CALENDAR}${r.date_modified ? r.date_modified.slice(0,10) : '—'}</span>
            ${r.folder ? `<span>${ICON_FOLDER}${r.folder}</span>` : ''}
            <span>${ICON_FILE}${fmtSize(r.size)}</span>
            ${r.acl && r.acl.groups && r.acl.groups.length ? `<span>${ICON_LOCK}${r.acl.groups[0]}</span>` : ''}
            ${r.telephone ? `<span>${ICON_PHONE}${r.telephone}</span>` : ''}
            ${r.bureau ? `<span>${ICON_BUILDING}${r.bureau}</span>` : ''}
            ${archiveNote}
          </div>
          ${r.filepath ? `
            <div class="result-path" style="margin-left:${bodyIndent}px;" title="${escapeHtml(r.filepath)}">
              ${ICON_ROUTE}
              <span class="path-text">${r.filepath}</span>
              <button class="copy-icon-btn" data-path="${escapeHtml(r.filepath)}" data-copy="dir"
                      onclick="copyPathClick(event);"
                      title="Copier le chemin du dossier" aria-label="Copier le chemin du dossier">${ICON_FOLDER}</button>
              <button class="copy-icon-btn" data-path="${escapeHtml(r.filepath)}" data-copy="full"
                      onclick="copyPathClick(event);"
                      title="Copier le chemin complet" aria-label="Copier le chemin complet">${ICON_COPY}</button>
            </div>` : ''}
          ${snippets ? `<div class="snippet" style="margin-left:${bodyIndent}px;">${snippets}</div>` : ''}
          <button class="result-detail-btn" style="margin-left:${bodyIndent}px;" onclick="openDetail('${r.id}')">Voir le détail complet (droits d'accès, aperçu…)</button>
        </div>
      </div>`;
    }

    // Accordéon des résultats — l'en-tête (icône/titre/score) reste
    // toujours visible, le corps (métadonnées, chemin, extrait) se
    // déplie/replie individuellement. Indépendant de state.resultsCompact
    // (qui fixe seulement l'état INITIAL au rendu, voir toggleCompactView).
    function toggleResultAccordion(card) {
      card?.classList.toggle('collapsed');
    }

    function updateCompactToggleLabel() {
      const btn = document.getElementById('compact-view-toggle');
      if (btn) btn.innerHTML = state.resultsCompact ? `${ICON_LIST}Vue détaillée` : `${ICON_GRID}Vue compacte`;
    }

    function toggleCompactView() {
      state.resultsCompact = !state.resultsCompact;
      try {
        localStorage.setItem(COMPACT_RESULTS_KEY, state.resultsCompact ? '1' : '0');
      } catch (e) {
        // localStorage indisponible : la préférence reste active pour cette session, simplement pas persistée.
      }
      updateCompactToggleLabel();
      // Applique le nouveau mode à TOUS les résultats actuellement affichés,
      // en écrasant tout dépli/repli individuel fait entre-temps — un
      // bouton "vue d'ensemble" doit donner une vue uniforme, pas
      // composer avec l'état précédent carte par carte.
      document.querySelectorAll('#results .result-card').forEach(card => {
        card.classList.toggle('collapsed', state.resultsCompact);
      });
    }

    function renderPagination(total) {
      const pages = Math.ceil(total / PER_PAGE);
      const pag = document.getElementById('pagination');
      if (pages <= 1) { pag.innerHTML = ''; return; }
      const range = [];
      for (let i = Math.max(1, state.page - 2); i <= Math.min(pages, state.page + 2); i++) range.push(i);
      pag.innerHTML =
        `<span class="pagination-info">Page ${state.page} sur ${pages}</span>` +
        `<div class="pagination-buttons">` +
        (state.page > 1 ? `<button type="button" class="page-btn page-prev" aria-label="Page précédente" onclick="goPage(${state.page - 1})">←</button>` : '') +
        range.map(i => `<button type="button" class="page-btn${i === state.page ? ' active' : ''}" aria-label="Page ${i}"${i === state.page ? ' aria-current="page"' : ''} onclick="goPage(${i})">${i}</button>`).join('') +
        (state.page < pages ? `<button type="button" class="page-btn page-next" aria-label="Page suivante" onclick="goPage(${state.page + 1})">→</button>` : '') +
        `</div>`;
    }

    function goPage(n) { state.page = n; doSearch(); }

    async function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }
      // Repli pour les contextes non sécurisés (http:// hors localhost, ex:
      // accès direct par IP en dev) — l'API Clipboard moderne y est
      // indisponible, seul execCommand('copy') fonctionne encore.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }

    // Remplace le préfixe SOURCES_MOUNT (chemin de montage interne aux
    // conteneurs, ex: "/sources" — voir uiConfigCache.sources_mount,
    // exposé en lecture seule par /ui-config) par la valeur admin
    // configurable sources_mount_display (ex: "\\serveur\partage"), pour
    // que le chemin copié soit réellement utilisable par l'utilisateur
    // final. Vide (réglage par défaut) : chemin brut inchangé, comme
    // avant l'ajout de ce réglage. Préfixe uniquement (pas de remplacement
    // ailleurs dans la chaîne) pour ne pas toucher un membre d'archive
    // ("archive.zip::inner/fichier.txt", voir dirOfPath()).
    function displayPath(filepath) {
      const display = uiConfigCache.sources_mount_display;
      const mount   = uiConfigCache.sources_mount || '/sources';
      if (!display || !filepath.startsWith(mount)) return filepath;
      // "rest" commence toujours par un séparateur ("/tips/fichier.docx") :
      // on retire un éventuel séparateur final sur "display" (ex: "Z:\"
      // ou "\\serveur\partage\") pour ne pas le doubler à la jointure.
      const base = display.replace(/[\\/]+$/, '');
      let rest = filepath.slice(mount.length);
      // Les chemins stockés dans ES gardent toujours des "/" (montage
      // Linux, voir identity dans indexer.py), même quand la valeur
      // affichée est un chemin Windows (UNC ou lecteur mappé) — sans ça
      // on obtiendrait un mélange "\\serveur\partage/tips/fichier.docx".
      if (display.includes('\\') && !display.includes('/')) {
        rest = rest.replace(/\//g, '\\');
      }
      return base + rest;
    }

    function dirOfPath(filepath) {
      // Pour un membre d'archive ("archive.zip::inner/fichier.txt"), le
      // dossier réel sur le disque est celui de l'archive elle-même, pas
      // un chemin interne à l'archive.
      const outer = filepath.split('::')[0];
      const idx = Math.max(outer.lastIndexOf('/'), outer.lastIndexOf('\\'));
      return idx >= 0 ? outer.slice(0, idx) : outer;
    }

    // Dernier segment d'un chemin de dossier — la facette "Dossier" garde
    // le chemin complet en valeur/tooltip (title), mais n'affiche que ce
    // segment pour rester lisible dans la largeur étroite de la sidebar.
    function folderBasename(path) {
      const trimmed = path.replace(/[/\\]+$/, '');
      const idx = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
      return idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
    }

    async function copyPathClick(e) {
      const btn      = e.currentTarget;
      const filepath = displayPath(btn.dataset.path);
      const text     = btn.dataset.copy === 'dir' ? dirOfPath(filepath) : filepath;
      try {
        await copyText(text);
        const original = btn.innerHTML;
        btn.innerHTML = ICON_CHECK;
        btn.classList.add('copied');
        setTimeout(() => { btn.innerHTML = original; btn.classList.remove('copied'); }, 1200);
      } catch (err) {
        alert("Impossible de copier dans le presse-papier : " + err.message);
      }
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
