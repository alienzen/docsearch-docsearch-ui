
    async function openDetail(id) {
      trackClick(id);
      const overlay = document.getElementById('modal-overlay');
      const card = document.getElementById('modal-card');
      card.innerHTML = '<p style="text-align:center;color:var(--color-text-faint);padding:40px 0;">Chargement…</p>';
      overlay.classList.add('open');

      try {
        const doc = await api('/document/' + id);
        renderDetail(doc, id);
      } catch (e) {
        card.innerHTML = `<button class="modal-close" onclick="closeModal()" aria-label="Fermer">✕</button>
          <p style="color:var(--color-danger-alt);padding:20px 0;">Impossible de charger ce document : ${e.message}</p>`;
      }
    }

    // Rafraîchit une modale DÉJÀ OUVERTE (après ajout/retrait d'un
    // mot-clé) sans repasser par l'état "Chargement…" d'openDetail() —
    // celui-ci vidait puis remplissait la modale à chaque appel, visible
    // comme un flash désormais que la requête est quasi instantanée
    // (refresh=True côté API, voir search_api.py).
    async function refreshDetail(id) {
      try {
        const doc = await api('/document/' + id);
        renderDetail(doc, id);
      } catch (e) {
        alert("Impossible de rafraîchir le document : " + e.message);
      }
    }

    function renderDetail(doc, id) {
      const card = document.getElementById('modal-card');
      const ec = EXT_COLORS[doc.extension] || { bg: '#F1EFE8', color: '#444441' };
      const isArchiveMember = (doc.filepath || '').includes('::');
      let archivePart = '', memberPart = '';
      if (isArchiveMember) {
        const parts = doc.filepath.split('::');
        archivePart = parts[0]; memberPart = parts[1];
      }

      const previewBanner = isArchiveMember
        ? `<div class="modal-banner">${ICON_INFO_CIRCLE}
             Aperçu non disponible : ce document n'existe que temporairement pendant l'indexation de l'archive.</div>`
        : `<a class="modal-preview-btn" href="/api/preview/${id}" target="_blank">
             ${ICON_EYE}Voir l'aperçu</a>`;

      const aclGroups = (doc.acl && doc.acl.groups) || [];
      const aclGroupsHtml = aclGroups.map(g =>
        `<span class="acl-tag">${ICON_LOCK}Groupe : ${g}</span>`
      ).join('');

      // Édition des mots-clés réservée aux documents de type fichier
      // ("document"/"archive_member" — pas email/web/SQL) et à la
      // bascule admin custom_keywords_enabled (voir ui_config.py).
      const canEditKeywords = uiConfigCache.custom_keywords_enabled
        && (doc.type === 'document' || doc.type === 'archive_member');
      const docKeywords = doc.keywords || [];
      const keywordsTagsHtml = docKeywords.map(k => canEditKeywords
        ? `<span class="acl-tag">${escapeHtml(k)}<button class="keyword-remove-btn" data-keyword="${escapeHtml(k)}"
             onclick="removeDocKeyword('${id}', this.dataset.keyword)" title="Retirer ce mot-clé" aria-label="Retirer ce mot-clé"
             style="margin-left:2px;border:none;background:none;cursor:pointer;color:inherit;padding:0;">${ICON_X}</button></span>`
        : `<span class="acl-tag">${escapeHtml(k)}</span>`
      ).join('');
      const keywordsAddHtml = canEditKeywords ? `
        <div style="display:flex;gap:6px;width:100%;">
          <input type="text" id="new-keyword-input" placeholder="Ajouter un ou plusieurs mots-clés (séparés par ;)…"
                 style="flex:1;padding:4px 8px;border:1px solid var(--color-border-input);border-radius:var(--radius-6);font-size:12px;"
                 onkeydown="if(event.key==='Enter'){event.preventDefault();addDocKeyword('${id}');}" />
          <button class="secondary" onclick="addDocKeyword('${id}')" style="padding:4px 10px;font-size:12px;">Ajouter</button>
        </div>` : '';
      const keywordsHtml = docKeywords.length ? keywordsTagsHtml : (canEditKeywords ? '' : '—');

      card.innerHTML = `
        <button class="modal-close" onclick="closeModal()" aria-label="Fermer">✕</button>
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px;">
          <div class="ext-icon" style="background:${ec.bg};color:${ec.color};width:44px;height:44px;font-size:11px;">${extLabel(doc.extension)}</div>
          <div style="flex:1;min-width:0;">
            <p style="font-weight:600;font-size:16px;">${doc.title || doc.filename}</p>
            ${isArchiveMember ? `<p style="font-size:12px;color:var(--color-text-faint);margin-top:2px;">Extrait de l'archive ${archivePart.split('/').pop()}</p>` : ''}
          </div>
        </div>
        ${previewBanner}
        <div style="margin-top:16px;">
          <div class="modal-row"><span class="k">${ICON_USER}Auteur</span><span class="v">${doc.author || '—'}</span></div>
          <div class="modal-row" style="align-items:flex-start;">
            <span class="k">${ICON_TAGS}Mots-clés</span>
            <span class="v" style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
              <span style="display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;">${keywordsHtml}</span>
              ${keywordsAddHtml}
            </span>
          </div>
          <div class="modal-row"><span class="k">${ICON_CALENDAR_PLUS}Créé le</span><span class="v">${doc.date_created ? doc.date_created.slice(0,10) : '—'}</span></div>
          <div class="modal-row"><span class="k">${ICON_CALENDAR}Modifié le</span><span class="v">${doc.date_modified ? doc.date_modified.slice(0,10) : '—'}</span></div>
          <div class="modal-row">
            <span class="k">${ICON_FOLDER}Dossier</span>
            <span class="v" style="display:inline-flex;align-items:center;gap:2px;">
              ${doc.folder || '—'}
              ${doc.filepath ? `
                <button class="copy-icon-btn" data-path="${escapeHtml(doc.filepath)}" data-copy="dir"
                        onclick="copyPathClick(event);"
                        title="Copier le chemin du dossier" aria-label="Copier le chemin du dossier">${ICON_FOLDER}</button>
                <button class="copy-icon-btn" data-path="${escapeHtml(doc.filepath)}" data-copy="full"
                        onclick="copyPathClick(event);"
                        title="Copier le chemin complet" aria-label="Copier le chemin complet">${ICON_COPY}</button>` : ''}
            </span>
          </div>
          <div class="modal-row"><span class="k">${ICON_FILE}Taille</span><span class="v">${fmtSize(doc.size)}</span></div>
          ${isArchiveMember ? `<div class="modal-row"><span class="k">${ICON_FILE_ZIP}Chemin dans l'archive</span><span class="v" style="font-family:monospace;font-size:12px;">${memberPart}</span></div>` : ''}
        </div>
        <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--color-bg-hover);">
          <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--color-text-faint);margin-bottom:8px;">Droits d'accès</p>
          <div class="modal-acl">
            ${doc.acl && doc.acl.owner ? `<span class="acl-tag">${ICON_USER}Propriétaire : ${doc.acl.owner}</span>` : ''}
            ${aclGroupsHtml}
            ${doc.acl && doc.acl.public ? `<span class="acl-tag">${ICON_WORLD}Public</span>` : ''}
          </div>
        </div>`;
    }

    function closeModal() {
      document.getElementById('modal-overlay').classList.remove('open');
    }

    // ── Mots-clés personnalisés ─────────────────────────────────────
    // Rappelle refreshDetail(id) après succès pour tout rafraîchir depuis
    // l'API plutôt que de patcher le DOM localement — sans repasser par
    // l'état "Chargement…" d'openDetail (voir refreshDetail ci-dessus).
    async function addDocKeyword(id) {
      const input = document.getElementById('new-keyword-input');
      // Plusieurs mots-clés séparés par ";" en une seule saisie (même
      // séparateur que get_keywords() côté indexer.py pour les métadonnées
      // Tika). Un par un, SÉQUENTIELLEMENT (pas Promise.all) : add_keyword()
      // fait un lire-modifier-écrire sur le même document custom_keywords
      // — en parallèle, deux requêtes liraient le même état de départ et la
      // dernière écriture effacerait l'ajout de l'autre.
      const keywords = (input?.value || '').split(';').map(k => k.trim()).filter(Boolean);
      if (!keywords.length) return;
      try {
        for (const keyword of keywords) {
          await api(`/document/${id}/keywords`, { method: 'POST', body: JSON.stringify({ keyword }) });
        }
        refreshDetail(id);
      } catch (e) {
        alert("Impossible d'ajouter ce(s) mot(s)-clé(s) : " + e.message);
      }
    }

    async function removeDocKeyword(id, keyword) {
      try {
        await api(`/document/${id}/keywords/${encodeURIComponent(keyword)}`, { method: 'DELETE' });
        refreshDetail(id);
      } catch (e) {
        alert("Impossible de retirer ce mot-clé : " + e.message);
      }
    }
