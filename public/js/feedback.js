
    // ── Pouce haut/bas ───────────────────────────────────────────
    function renderFeedbackBar() {
      const wrap = document.getElementById('feedback-bar');
      if (!engagementConfig.feedback_enabled || !state.searchId) { wrap.innerHTML = ''; return; }
      wrap.innerHTML = `
        <div class="feedback-bar">
          <span>Cette recherche vous a-t-elle été utile ?</span>
          <button class="feedback-btn" data-rating="up" aria-label="Oui">👍</button>
          <button class="feedback-btn" data-rating="down" aria-label="Non">👎</button>
        </div>`;
      wrap.querySelectorAll('.feedback-btn').forEach(btn => {
        btn.addEventListener('click', () => submitFeedback(btn.dataset.rating));
      });
    }

    async function submitFeedback(rating) {
      const wrap = document.getElementById('feedback-bar');
      const searchId = state.searchId;   // fige la valeur : une recherche suivante ne doit pas changer la cible
      wrap.querySelectorAll('.feedback-btn').forEach(b => b.disabled = true);
      try {
        await api('/feedback', { method: 'POST', body: JSON.stringify({ search_id: searchId, rating }) });
        wrap.innerHTML = '<div class="feedback-bar"><span>Merci pour votre retour !</span></div>';
      } catch (e) {
        wrap.querySelectorAll('.feedback-btn').forEach(b => b.disabled = false);
        alert("Impossible d'enregistrer votre avis : " + e.message);
      }
    }

    // ── Tracking de clic (toujours actif, pas de flag) ──────────
    function trackClick(docId) {
      if (!state.searchId) return;
      const position = state.resultIds.indexOf(docId);
      // Fire-and-forget : ne doit jamais retarder ni bloquer l'ouverture
      // du détail du document pour l'utilisateur.
      api('/click', {
        method: 'POST',
        body: JSON.stringify({ search_id: state.searchId, doc_id: docId, position }),
      }).catch(() => {});
    }

    // ── NPS (popup occasionnelle) ────────────────────────────────
    const NPS_EVERY_N_SEARCHES = 20;
    const NPS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;   // 30 jours

    function maybeShowNps() {
      if (!engagementConfig.nps_enabled) return;
      const count = parseInt(localStorage.getItem('docsearch-search-count') || '0', 10) + 1;
      localStorage.setItem('docsearch-search-count', String(count));
      if (count % NPS_EVERY_N_SEARCHES !== 0) return;

      const lastShown = parseInt(localStorage.getItem('docsearch-nps-last-shown') || '0', 10);
      if (Date.now() - lastShown < NPS_COOLDOWN_MS) return;

      showNpsModal();
    }

    function showNpsModal() {
      localStorage.setItem('docsearch-nps-last-shown', String(Date.now()));
      const card = document.getElementById('nps-card');
      const scores = Array.from({ length: 11 }, (_, i) => i);
      card.innerHTML = `
        <button class="modal-close" onclick="closeNps()" aria-label="Fermer">✕</button>
        <p style="font-weight:600;font-size:15px;margin-bottom:6px;">Une question rapide</p>
        <p style="font-size:13px;color:var(--color-text-muted);">Sur une échelle de 0 à 10, recommanderiez-vous DocSearch à un collègue ?</p>
        <div class="nps-scale">${scores.map(s => `<button class="nps-score-btn" data-score="${s}">${s}</button>`).join('')}</div>
        <div class="nps-labels"><span>Pas du tout probable</span><span>Très probable</span></div>`;
      document.getElementById('nps-overlay').classList.add('open');
      card.querySelectorAll('.nps-score-btn').forEach(btn => {
        btn.addEventListener('click', () => submitNps(parseInt(btn.dataset.score, 10)));
      });
    }

    async function submitNps(score) {
      const card = document.getElementById('nps-card');
      try {
        await api('/nps', { method: 'POST', body: JSON.stringify({ score }) });
      } catch (e) {
        // Échec silencieux : ne pas transformer un simple remerciement en erreur visible.
      }
      card.innerHTML = '<div class="nps-thanks">Merci pour votre retour !</div>';
      setTimeout(closeNps, 1500);
    }

    function closeNps() {
      document.getElementById('nps-overlay').classList.remove('open');
    }

    // ── Suggestions libres ───────────────────────────────────────
    // Anonyme par défaut (case décochée) — cocher "Ne pas rester anonyme"
    // envoie l'identité (résolue côté API via X-User, voir search_api.py).
    function openSuggestionModal() {
      const card = document.getElementById('suggestion-card');
      card.innerHTML = `
        <button class="modal-close" onclick="closeSuggestionModal()" aria-label="Fermer">✕</button>
        <p style="font-weight:600;font-size:15px;margin-bottom:6px;display:flex;align-items:center;gap:6px;"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3z"/></svg>Suggérer une idée</p>
        <p style="font-size:13px;color:var(--color-text-muted);margin-bottom:12px;">Une amélioration à proposer, un bug à signaler ? Dites-nous tout — votre suggestion est envoyée de façon anonyme par défaut.</p>
        <select id="suggestion-category" style="width:100%;padding:8px;border:1px solid var(--color-border-input);border-radius:var(--radius-8);font-size:13px;margin-bottom:10px;">
          <option value="idea">Idée / amélioration</option>
          <option value="bug">Bug</option>
          <option value="other">Autre</option>
        </select>
        <textarea id="suggestion-text" rows="5" placeholder="Votre suggestion…"
                  style="width:100%;padding:10px;border:1px solid var(--color-border-input);border-radius:var(--radius-8);font:inherit;font-size:13px;resize:vertical;"></textarea>
        <label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13px;color:var(--color-text-secondary);cursor:pointer;">
          <input type="checkbox" id="suggestion-not-anonymous" />
          Ne pas rester anonyme (associer mon identité à cette suggestion)
        </label>
        <button class="btn-primary" style="margin-top:12px;width:100%;" onclick="submitSuggestion()">Envoyer</button>`;
      document.getElementById('suggestion-overlay').classList.add('open');
      document.getElementById('suggestion-text').focus();
    }

    async function submitSuggestion() {
      const text = document.getElementById('suggestion-text').value.trim();
      if (!text) { alert('Le champ ne peut pas être vide.'); return; }
      const category = document.getElementById('suggestion-category').value;
      const anonymous = !document.getElementById('suggestion-not-anonymous').checked;
      const card = document.getElementById('suggestion-card');
      try {
        await api('/suggestions', { method: 'POST', body: JSON.stringify({ text, category, anonymous }) });
        card.innerHTML = '<div class="nps-thanks">Merci pour votre suggestion !</div>';
        setTimeout(closeSuggestionModal, 1500);
      } catch (e) {
        alert("Impossible d'envoyer votre suggestion : " + e.message);
      }
    }

    function closeSuggestionModal() {
      document.getElementById('suggestion-overlay').classList.remove('open');
    }
