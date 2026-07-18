
    // ── Recherches sauvegardées ─────────────────────────────────
    async function saveCurrentSearch() {
      const q = document.getElementById('q').value.trim();
      if (!hasActiveCriteria(q)) { alert("Lancez une recherche avant de l'enregistrer."); return; }
      const name = prompt('Nom de cette recherche :', q || 'Recherche sans titre');
      if (!name || !name.trim()) return;

      const body = {
        name,
        query:     q,
        ext:       state.ext,
        author:    state.author,
        keywords:  state.keywords,
        folder:    state.folder,
        source:    state.source,
        custom:    state.custom,
        date_from: state.dateFrom,
        date_to:   state.dateTo,
        sort:      state.sort,
      };
      try {
        await api('/saved-searches', { method: 'POST', body: JSON.stringify(body) });
      } catch (e) {
        alert("Impossible d'enregistrer la recherche : " + e.message);
      }
    }

    async function toggleSavedPanel() {
      const panel = document.getElementById('saved-panel');
      const opening = !panel.classList.contains('open');
      if (!opening) { panel.classList.remove('open'); return; }

      panel.classList.add('open');
      panel.innerHTML = '<div class="saved-empty">Chargement…</div>';
      try {
        const list = await api('/saved-searches');
        renderSavedPanel(list);
      } catch (e) {
        panel.innerHTML = `<div class="saved-empty">${e.message}</div>`;
      }
    }

    function multiLabel(v) {
      // author/source peuvent être une liste (nouveau, sélection
      // cumulative) ou une simple chaîne (anciennes recherches
      // enregistrées avant ce changement) — normalise les deux en texte
      // affichable, ou null si rien n'est sélectionné.
      if (Array.isArray(v)) return v.length ? v.join(', ') : null;
      return v || null;
    }

    function criteriaSummary(s) {
      const tags = [];
      // s.ext : liste (nouveau, sélection cumulative) ou chaîne unique/
      // 'all' (anciennes recherches enregistrées) — 'all' ou vide = pas
      // de filtre de type, rien à afficher.
      const extList = Array.isArray(s.ext) ? s.ext : (s.ext && s.ext !== 'all' ? [s.ext] : []);
      if (extList.length) tags.push(extList.map(e => extLabel(e)).join(', '));
      if (s.search_in && s.search_in !== 'all') tags.push('Champ : ' + (SEARCH_IN_LABELS[s.search_in] || s.search_in));
      const authorLabel = multiLabel(s.author);
      if (authorLabel) tags.push('Auteur : ' + authorLabel);
      const keywordsLabel = multiLabel(s.keywords);
      if (keywordsLabel) tags.push('Mots-clés : ' + keywordsLabel);
      const folderLabel = multiLabel(s.folder);
      if (folderLabel) tags.push('Dossier : ' + folderLabel);
      const sourceLabel = multiLabel(s.source);
      if (sourceLabel) tags.push('Source : ' + sourceLabel);
      // Pas de libellé humain disponible hors d'une recherche en cours
      // (voir customFacetLabels, rempli par renderFacets()) — le nom brut
      // du champ ES sert de repli, largement suffisant pour un résumé.
      if (s.custom) Object.entries(s.custom).forEach(([field, values]) => {
        if (values && values.length) tags.push((customFacetLabels[field] || field) + ' : ' + values.join(', '));
      });
      if (s.date_from || s.date_to) tags.push('Période : ' + (s.date_from || '…') + ' → ' + (s.date_to || '…'));
      if (s.sort && s.sort !== '_score') tags.push('Tri : ' + (SORT_LABELS[s.sort] || s.sort));
      return tags;
    }

    function renderSavedPanel(list) {
      const panel = document.getElementById('saved-panel');
      if (!list.length) {
        panel.innerHTML = '<div class="saved-empty">Aucune recherche enregistrée.</div>';
        return;
      }
      panel.innerHTML = list.map(s => {
        const crit = criteriaSummary(s);
        return `
        <div class="saved-item" data-id="${s.id}">
          <div class="saved-item-main">
            <div class="saved-item-name">${escapeHtml(s.name)}</div>
            <div class="saved-item-query">« ${escapeHtml(s.query)} »</div>
            ${crit.length ? `<div class="saved-item-criteria">${crit.map(t => `<span class="saved-crit-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
            <div class="saved-item-alert">
              <label class="alert-toggle-label">
                <input type="checkbox" class="alert-toggle" ${s.alert_enabled ? 'checked' : ''} />
                ${ICON_BELL}M'alerter
              </label>
              <select class="alert-frequency" ${s.alert_enabled ? '' : 'disabled'}>
                <option value="daily" ${s.alert_frequency !== 'weekly' ? 'selected' : ''}>tous les jours</option>
                <option value="weekly" ${s.alert_frequency === 'weekly' ? 'selected' : ''}>toutes les semaines</option>
              </select>
            </div>
          </div>
          <button class="saved-item-delete" title="Supprimer" aria-label="Supprimer">✕</button>
        </div>`;
      }).join('');

      panel.querySelectorAll('.saved-item').forEach(row => {
        const id = row.dataset.id;
        const entry = list.find(s => s.id === id);
        row.querySelector('.saved-item-main').addEventListener('click', () => applySavedSearch(entry));
        row.querySelector('.saved-item-delete').addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm(`Supprimer la recherche « ${entry.name} » ?`)) return;
          try {
            const updated = await api(`/saved-searches/${id}`, { method: 'DELETE' });
            renderSavedPanel(updated);
          } catch (err) {
            alert('Impossible de supprimer : ' + err.message);
          }
        });

        // Bloc alerte : à l'intérieur de .saved-item-main (pour s'empiler
        // sous le nom/la requête comme le reste), donc stopPropagation
        // indispensable ici — sinon cliquer la case ou le menu relancerait
        // la recherche sauvegardée (voir le listener 'click' ci-dessus).
        const alertBlock = row.querySelector('.saved-item-alert');
        alertBlock.addEventListener('click', (e) => e.stopPropagation());
        const alertToggle = row.querySelector('.alert-toggle');
        const alertFrequency = row.querySelector('.alert-frequency');
        alertToggle.addEventListener('change', async (e) => {
          const enabled = e.target.checked;
          alertFrequency.disabled = !enabled;
          try {
            await api(`/saved-searches/${id}/alert`, {
              method: 'PATCH',
              body: JSON.stringify({ enabled, frequency: alertFrequency.value }),
            });
          } catch (err) {
            e.target.checked = !enabled;
            alertFrequency.disabled = !e.target.checked;
            alert("Impossible de modifier l'alerte : " + err.message);
          }
        });
        alertFrequency.addEventListener('change', async (e) => {
          try {
            await api(`/saved-searches/${id}/alert`, {
              method: 'PATCH',
              body: JSON.stringify({ enabled: true, frequency: e.target.value }),
            });
          } catch (err) {
            alert('Impossible de modifier la fréquence : ' + err.message);
          }
        });
      });
    }

    // ── Alertes (notifications in-app des recherches sauvegardées) ──
    function updateAlertsBadge(count) {
      const badge = document.getElementById('alerts-badge');
      if (count > 0) {
        badge.textContent = count > 9 ? '9+' : String(count);
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    }

    // Appelé au chargement de la page (après loadUiConfig, voir plus bas)
    // pour que le badge reflète les alertes accumulées depuis la dernière
    // visite, sans attendre que l'utilisateur ouvre le panneau.
    async function refreshAlertsBadge() {
      if (!uiConfigCache.alerts_enabled) return;
      try {
        const notifications = await api('/alerts');
        updateAlertsBadge(notifications.filter(n => !n.seen).length);
      } catch (e) {
        // Échec silencieux (API indisponible, ou fonctionnalité désactivée
        // entre-temps) : le badge reste simplement à son dernier état connu.
      }
    }

    async function toggleAlertsPanel() {
      const panel = document.getElementById('alerts-panel');
      const opening = !panel.classList.contains('open');
      if (!opening) { panel.classList.remove('open'); return; }

      panel.classList.add('open');
      panel.innerHTML = '<div class="saved-empty">Chargement…</div>';
      try {
        // La liste des recherches sauvegardées est nécessaire pour pouvoir
        // relancer celle visée par une notification au clic (une
        // notification ne stocke que son id/nom, pas ses critères complets
        // — voir alert_notifications.py).
        const [notifications, saved] = await Promise.all([api('/alerts'), api('/saved-searches')]);
        renderAlertsPanel(notifications, saved);
        // Ouvrir le panneau vaut consultation : on marque tout comme lu et
        // on vide le badge, plutôt que d'exiger un clic par notification.
        if (notifications.some(n => !n.seen)) {
          await api('/alerts/mark-all-seen', { method: 'POST' });
        }
        updateAlertsBadge(0);
      } catch (e) {
        panel.innerHTML = `<div class="saved-empty">${e.message}</div>`;
      }
    }

    function renderAlertsPanel(notifications, savedList) {
      const panel = document.getElementById('alerts-panel');
      if (!notifications.length) {
        panel.innerHTML = '<div class="saved-empty">Aucune alerte pour le moment.</div>';
        return;
      }
      panel.innerHTML = notifications.map(n => {
        const date = new Date(n.checked_at).toLocaleString('fr-FR', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        });
        const resultLabel = n.new_count > 1 ? `${n.new_count} nouveaux résultats` : '1 nouveau résultat';
        return `
        <div class="saved-item alert-item" data-saved-id="${n.saved_search_id}">
          <div class="saved-item-main">
            <div class="saved-item-name">${escapeHtml(n.saved_search_name)}</div>
            <div class="saved-item-query">${resultLabel} · ${date}</div>
          </div>
        </div>`;
      }).join('');

      panel.querySelectorAll('.alert-item').forEach(row => {
        row.addEventListener('click', () => {
          const entry = savedList.find(s => s.id === row.dataset.savedId);
          if (!entry) {
            alert('Cette recherche sauvegardée a été supprimée depuis.');
            return;
          }
          panel.classList.remove('open');
          applySavedSearch(entry);
        });
      });
    }

    function toArray(v) {
      // Normalise author/source vers un tableau, en acceptant aussi bien
      // le nouveau format (liste) que l'ancien (chaîne unique, recherches
      // enregistrées avant le passage à la sélection cumulative).
      if (Array.isArray(v)) return v;
      return v ? [v] : [];
    }

    function applySavedSearch(s) {
      // s.ext : liste (nouveau) ou chaîne unique/'all' (anciennes
      // recherches) — 'all' redevient un tableau vide (pas de filtre).
      const extList = Array.isArray(s.ext) ? s.ext : (s.ext && s.ext !== 'all' ? [s.ext] : []);
      state = {
        ext: extList, author: toArray(s.author), keywords: toArray(s.keywords), folder: toArray(s.folder),
        source: toArray(s.source), custom: s.custom || {},
        dateFrom: s.date_from || null, dateTo: s.date_to || null,
        sort: s.sort || '_score', page: 1,
      };

      document.getElementById('q').value = s.query;
      document.getElementById('sort').value = state.sort;
      document.getElementById('date-from').value = state.dateFrom || '';
      document.getElementById('date-to').value = state.dateTo || '';

      document.getElementById('saved-panel').classList.remove('open');
      doSearch();
    }
