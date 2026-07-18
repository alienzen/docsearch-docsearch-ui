    let myCollectionsCache = [];   // dernière liste de /collections chargée (panneau + modale)

    // ── Collections de documents ("📋 Mes collections") ─────────────────
    // Panneau déroulant (comme "★ Mes recherches") listant les collections de
    // l'utilisateur ; la modale #collections-overlay est réutilisée pour deux
    // usages distincts et mutuellement exclusifs : consulter le contenu
    // d'une collection (viewCollection) ou choisir/créer la collection où ajouter la
    // sélection courante (openAddToCollectionModal).
    async function toggleMyCollectionsPanel() {
      const panel = document.getElementById('collections-panel');
      const opening = !panel.classList.contains('open');
      if (!opening) { panel.classList.remove('open'); return; }

      panel.classList.add('open');
      panel.innerHTML = '<div class="saved-empty">Chargement…</div>';
      try {
        myCollectionsCache = await api('/collections');
        renderMyCollectionsPanel();
      } catch (e) {
        panel.innerHTML = `<div class="saved-empty">${e.message}</div>`;
      }
    }

    function renderMyCollectionsPanel() {
      const panel = document.getElementById('collections-panel');
      if (!myCollectionsCache.length) {
        panel.innerHTML = '<div class="saved-empty">Aucune collection pour l’instant.</div>';
        return;
      }
      panel.innerHTML = myCollectionsCache.map(l => `
        <div class="saved-item" data-collection-id="${l.id}">
          <div class="saved-item-main">
            <div class="saved-item-name">${escapeHtml(l.name)}</div>
            <div class="saved-item-query">${l.doc_ids.length} document${l.doc_ids.length > 1 ? 's' : ''}</div>
          </div>
          <button class="saved-item-delete" title="Supprimer la collection" aria-label="Supprimer la collection">✕</button>
        </div>`).join('');

      panel.querySelectorAll('.saved-item').forEach(row => {
        const id = row.dataset.collectionId;
        row.querySelector('.saved-item-main').addEventListener('click', () => viewCollection(id));
        row.querySelector('.saved-item-delete').addEventListener('click', async (e) => {
          e.stopPropagation();
          const entry = myCollectionsCache.find(l => l.id === id);
          if (!confirm(`Supprimer la collection « ${entry.name} » ? Les documents eux-mêmes ne sont pas supprimés.`)) return;
          try {
            myCollectionsCache = await api(`/collections/${id}`, { method: 'DELETE' });
            renderMyCollectionsPanel();
          } catch (err) {
            alert('Impossible de supprimer : ' + err.message);
          }
        });
      });
    }

    // Affiche le contenu d'une collection dans la modale — chaque document est
    // relu via /document/{id} (pas un simple mget ES) pour que la
    // vérification ACL déjà faite par cet endpoint s'applique aussi ici :
    // un document devenu inaccessible entre-temps n'est jamais exposé.
    async function viewCollection(collectionId) {
      document.getElementById('collections-panel').classList.remove('open');
      const overlay = document.getElementById('collections-overlay');
      const card = document.getElementById('collections-card');
      card.innerHTML = '<p style="text-align:center;color:var(--color-text-faint);padding:20px 0;">Chargement…</p>';
      overlay.classList.add('open');

      const collection = myCollectionsCache.find(l => l.id === collectionId);
      if (!collection) { card.innerHTML = '<p>Collection introuvable.</p>'; return; }

      if (!collection.doc_ids.length) {
        card.innerHTML = `<button class="modal-close" onclick="closeCollectionsModal()" aria-label="Fermer">✕</button>
          <p style="font-weight:600;font-size:15px;margin-bottom:12px;">${escapeHtml(collection.name)}</p>
          <p class="muted" style="font-size:13px;color:var(--color-text-faint);">Collection vide.</p>`;
        return;
      }

      const results = await Promise.allSettled(collection.doc_ids.map(id => api('/document/' + id)));
      const rows = results.map((r, i) => {
        const docId = collection.doc_ids[i];
        const inner = r.status === 'fulfilled'
          ? `<a href="#" onclick="closeCollectionsModal(); openDetail('${docId}'); return false;">${escapeHtml(r.value.title || r.value.filename)}</a>`
          : `<span style="flex:1;font-size:13px;color:var(--color-danger);">Document indisponible</span>`;
        return `<div class="collection-doc-row">
          ${inner}
          <button class="copy-icon-btn" title="Retirer de la collection" aria-label="Retirer de la collection" onclick="removeFromCollection('${collectionId}', '${docId}')">${ICON_X}</button>
        </div>`;
      }).join('');

      card.innerHTML = `<button class="modal-close" onclick="closeCollectionsModal()" aria-label="Fermer">✕</button>
        <p style="font-weight:600;font-size:15px;margin-bottom:12px;">${escapeHtml(collection.name)}</p>
        <div style="max-height:340px;overflow-y:auto;">${rows}</div>`;
    }

    async function removeFromCollection(collectionId, docId) {
      try {
        myCollectionsCache = await api(`/collections/${collectionId}/documents/${docId}`, { method: 'DELETE' });
        viewCollection(collectionId);
      } catch (e) {
        alert('Erreur : ' + e.message);
      }
    }

    async function openAddToCollectionModal() {
      if (!selectedDocs.size) return;
      const overlay = document.getElementById('collections-overlay');
      const card = document.getElementById('collections-card');
      card.innerHTML = '<p style="text-align:center;color:var(--color-text-faint);padding:20px 0;">Chargement…</p>';
      overlay.classList.add('open');
      try {
        myCollectionsCache = await api('/collections');
        renderAddToCollectionModal();
      } catch (e) {
        card.innerHTML = `<button class="modal-close" onclick="closeCollectionsModal()" aria-label="Fermer">✕</button>

          <p style="color:var(--color-danger-alt);padding:20px 0;">${e.message}</p>`;
      }
    }

    function renderAddToCollectionModal() {
      const card = document.getElementById('collections-card');
      const n = selectedDocs.size;
      card.innerHTML = `
        <button class="modal-close" onclick="closeCollectionsModal()" aria-label="Fermer">✕</button>
        <p style="font-weight:600;font-size:15px;margin-bottom:12px;display:flex;align-items:center;gap:6px;">${ICON_CLIPBOARD}Ajouter ${n} document${n > 1 ? 's' : ''} à une collection</p>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;margin-bottom:12px;">
          ${myCollectionsCache.map(l => `
            <button class="collection-picker-btn" data-collection-id="${l.id}">
              <span>${escapeHtml(l.name)}</span><span style="color:var(--color-text-faint);">${l.doc_ids.length}</span>
            </button>`).join('') || '<p class="muted" style="font-size:13px;color:var(--color-text-faint);">Aucune collection pour l’instant.</p>'}
        </div>
        <div style="display:flex;gap:8px;">
          <input type="text" id="new-collection-name" placeholder="Nouvelle collection…"
                 style="flex:1;padding:8px 10px;border:1px solid var(--color-border-input);border-radius:var(--radius-8);font-size:13px;" />
          <button class="btn-primary" id="create-collection-btn">Créer</button>
        </div>`;
      card.querySelectorAll('[data-collection-id]').forEach(btn => {
        btn.addEventListener('click', () => addSelectedDocsToCollection(btn.dataset.collectionId));
      });
      document.getElementById('create-collection-btn').addEventListener('click', createCollectionAndAdd);
      document.getElementById('new-collection-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') createCollectionAndAdd();
      });
    }

    async function createCollectionAndAdd() {
      const name = document.getElementById('new-collection-name').value.trim();
      if (!name) { alert('Le nom de la collection ne peut pas être vide.'); return; }
      try {
        const newCollection = await api('/collections', { method: 'POST', body: JSON.stringify({ name }) });
        await addSelectedDocsToCollection(newCollection.id);
      } catch (e) {
        alert('Erreur : ' + e.message);
      }
    }

    async function addSelectedDocsToCollection(collectionId) {
      const card = document.getElementById('collections-card');
      card.innerHTML = '<p style="text-align:center;color:var(--color-text-faint);padding:20px 0;">Ajout en cours…</p>';
      try {
        for (const docId of selectedDocs) {
          await api(`/collections/${collectionId}/documents`, { method: 'POST', body: JSON.stringify({ doc_id: docId }) });
        }
        card.innerHTML = '<div class="nps-thanks">Ajouté !</div>';
        clearSelection();
        setTimeout(closeCollectionsModal, 1200);
      } catch (e) {
        card.innerHTML = `<button class="modal-close" onclick="closeCollectionsModal()" aria-label="Fermer">✕</button>

          <p style="color:var(--color-danger-alt);padding:20px 0;">${e.message}</p>`;
      }
    }

    function closeCollectionsModal() {
      document.getElementById('collections-overlay').classList.remove('open');
    }
