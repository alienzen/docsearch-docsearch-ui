
    document.addEventListener('click', (e) => {
      document.querySelectorAll('.saved-wrap').forEach(wrap => {
        if (!wrap.contains(e.target)) {
          wrap.querySelector('.saved-panel')?.classList.remove('open');
        }
      });
      const sourcesWrap = document.querySelector('.sources-select-wrap');
      if (sourcesWrap && !sourcesWrap.contains(e.target)) {
        document.getElementById('sources-select-panel').classList.remove('open');
      }
    });

    function getResultCards() {
      return Array.from(document.querySelectorAll('#results .result-card'));
    }

    function setFocusedResult(index) {
      const cards = getResultCards();
      if (!cards.length) return;
      cards.forEach(c => c.classList.remove('kbd-focus'));
      focusedResultIndex = Math.max(0, Math.min(index, cards.length - 1));
      const card = cards[focusedResultIndex];
      card.classList.add('kbd-focus');
      // Sur le 1er/dernier résultat, aller jusqu'en haut/bas de la page
      // (en-tête, ou pagination/barre de pouce sous le dernier résultat)
      // plutôt qu'un simple scrollIntoView, qui s'arrête au bord de la carte.
      if (focusedResultIndex === 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (focusedResultIndex === cards.length - 1) {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      } else {
        card.scrollIntoView({ block: 'nearest' });
      }
    }

    // .header-logo n'a plus de hauteur fixe (voir index.css) — sa hauteur
    // réelle dépend de l'image fournie via header_logo_url, donc celle du
    // header varie. Recalé ici plutôt qu'une valeur CSS figée, qui se
    // désynchroniserait à chaque logo d'un ratio différent. Appelé au
    // chargement (image par défaut déjà à sa taille finale), après le
    // chargement d'une image personnalisée (voir loadUiConfig()), et au
    // redimensionnement (le retour à la ligne de .header-links-list peut
    // changer la hauteur sur un viewport étroit).
    function syncSidebarOffset() {
      const header = document.querySelector('.header');
      const sidebar = document.querySelector('.sidebar');
      if (header && sidebar) sidebar.style.top = header.getBoundingClientRect().height + 'px';
    }

    function isTypingTarget(el) {
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    }

    // Même contenu que help.html (page autonome conservée pour un lien
    // direct partageable), affiché ici en modale pour rester dans le
    // layout de la recherche — pas d'appel réseau, tout est statique.
    function openHelpModal() {
      const card = document.getElementById('help-card');
      card.innerHTML = `
        <button class="modal-close" onclick="closeHelpModal()" aria-label="Fermer">✕</button>
        <p style="font-weight:600;font-size:15px;margin-bottom:10px;display:flex;align-items:center;gap:6px;"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4.6 1.3c0 1.5-2.1 1.7-2.1 3.2"/><path d="M12 17h.01"/></svg>Aide</p>
        <div class="help-content">
          <h2>Raccourcis clavier (page de recherche)</h2>
          <table>
            <thead><tr><th>Raccourci</th><th>Action</th></tr></thead>
            <tbody>
              <tr><td><kbd>/</kbd></td><td>Mettre le focus sur la barre de recherche</td></tr>
              <tr><td><kbd>Échap</kbd></td><td>Fermer la fenêtre ou le panneau ouvert</td></tr>
              <tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Parcourir la liste des résultats</td></tr>
              <tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>Page de résultats précédente / suivante</td></tr>
              <tr><td><kbd>Entrée</kbd></td><td>Déplier/replier le résultat sélectionné</td></tr>
              <tr><td><kbd>c</kbd></td><td>Basculer la vue compacte des résultats</td></tr>
              <tr><td><kbd>s</kbd></td><td>Enregistrer la recherche en cours</td></tr>
              <tr><td><kbd>r</kbd></td><td>Effacer tous les filtres</td></tr>
              <tr><td><kbd>n</kbd></td><td>Réinitialiser la recherche (requête, filtres et tri)</td></tr>
              <tr><td><kbd>h</kbd></td><td>Retourner en haut de la page et sélectionner le 1er résultat</td></tr>
              <tr><td><kbd>?</kbd></td><td>Ouvrir cette aide</td></tr>
            </tbody>
          </table>

          <h2>Syntaxe avancée (barre de recherche)</h2>
          <p>En plus des facettes de la colonne de gauche, ces opérateurs peuvent être tapés directement
             dans la barre de recherche, combinés entre eux et avec du texte libre — ex:
             <code>type:pdf auteur:"Jean Dupont" rapport annuel</code>. Une fois la recherche lancée, ils
             disparaissent de la barre et deviennent des puces de filtre (comme un clic sur la facette
             correspondante) — la valeur doit donc correspondre exactement à ce qu'affiche la facette
             (pas de recherche approximative sur ces champs-là).</p>
          <table>
            <thead><tr><th>Opérateur</th><th>Exemple</th><th>Équivaut à</th></tr></thead>
            <tbody>
              <tr><td><code>auteur:</code></td><td><code>auteur:"Jean Dupont"</code></td><td>Facette Auteur</td></tr>
              <tr><td><code>mots-cles:</code></td><td><code>mots-cles:urgent</code></td><td>Facette Mots-clés</td></tr>
              <tr><td><code>type:</code></td><td><code>type:pdf</code></td><td>Facette Type de fichier</td></tr>
              <tr><td><code>source:</code></td><td><code>source:documents</code></td><td>Facette Source</td></tr>
              <tr><td><code>dossier:</code></td><td><code>dossier:Finance</code></td><td>Facette Dossier</td></tr>
            </tbody>
          </table>
          <p class="muted">La valeur peut tenir en un seul mot (<code>type:pdf</code>) ou être entre
             guillemets si elle contient des espaces (<code>auteur:"Jean Dupont"</code>). Un opérateur
             seul, sans texte libre, cherche tous les documents correspondant à ce filtre.</p>

          <h3>Facettes personnalisées</h3>
          <p>Certaines sources (bases de données SQL) ajoutent leurs propres facettes — elles
             deviennent automatiquement des opérateurs supplémentaires, reconnus par leur nom de champ
             (visible dans la colonne de gauche une fois une facette de ce type dépliée). Sur cette
             installation par exemple : <code>bureau:Paris</code> ou <code>fonction:"Chef de service"</code>.
             Mêmes règles que ci-dessus (correspondance exacte, guillemets si espaces).</p>

          <h2>Besoin d'aide ?</h2>
          <p>Contactez l'équipe technique pour toute question sur l'utilisation de DocSearch.</p>
        </div>`;
      document.getElementById('help-overlay').classList.add('open');
    }

    function closeHelpModal() {
      document.getElementById('help-overlay').classList.remove('open');
    }

    function anyOverlayOpen() {
      return document.getElementById('modal-overlay').classList.contains('open')
          || document.getElementById('nps-overlay').classList.contains('open')
          || document.getElementById('suggestion-overlay').classList.contains('open')
          || document.getElementById('collections-overlay').classList.contains('open')
          || document.getElementById('help-overlay').classList.contains('open');
    }

    function closeAnyOpenPanel() {
      closeModal();
      closeNps();
      closeSuggestionModal();
      closeCollectionsModal();
      closeHelpModal();
      document.getElementById('saved-panel').classList.remove('open');
      document.getElementById('collections-panel').classList.remove('open');
      document.getElementById('sources-select-panel').classList.remove('open');
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeAnyOpenPanel(); return; }

      // Les raccourcis à une lettre ne doivent jamais interférer avec la
      // saisie (recherche, formulaires des modales…) — seule Échap reste
      // active en toute circonstance (voir ci-dessus).
      if (isTypingTarget(e.target) || anyOverlayOpen()) return;

      const resultsVisible = document.getElementById('results-actions').style.display !== 'none';

      switch (e.key) {
        case '/':
          e.preventDefault();
          document.getElementById('q').focus();
          break;
        case 'ArrowDown':
          if (getResultCards().length) { e.preventDefault(); setFocusedResult(focusedResultIndex + 1); }
          break;
        case 'ArrowUp':
          if (getResultCards().length) { e.preventDefault(); setFocusedResult(focusedResultIndex - 1); }
          break;
        case 'ArrowLeft': {
          const prevBtn = document.querySelector('#pagination .page-prev');
          if (prevBtn) { e.preventDefault(); prevBtn.click(); }
          break;
        }
        case 'ArrowRight': {
          const nextBtn = document.querySelector('#pagination .page-next');
          if (nextBtn) { e.preventDefault(); nextBtn.click(); }
          break;
        }
        case 'Enter': {
          const cards = getResultCards();
          if (focusedResultIndex >= 0 && cards[focusedResultIndex]) {
            e.preventDefault();
            toggleResultAccordion(cards[focusedResultIndex]);
          }
          break;
        }
        case 'c': case 'C':
          if (resultsVisible) toggleCompactView();
          break;
        case 's': case 'S':
          if (resultsVisible) saveCurrentSearch();
          break;
        case 'r': case 'R':
          if (resultsVisible) clearAllFilters();
          break;
        case 'n': case 'N':
          // Contrairement à 'r' (clearAllFilters, ne touche qu'aux
          // facettes/période) : réinitialisation complète, y compris la
          // requête elle-même et le tri — voir resetSearch().
          if (resultsVisible) resetSearch();
          break;
        case '?':
          if (uiConfigCache.help_enabled) openHelpModal();
          break;
        case 'h': case 'H':
          if (getResultCards().length) setFocusedResult(0);
          else window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
      }
    });

    // ── Bouton "Retour en haut" ──────────────────────────────────
    // Visible seulement une fois qu'on a scrollé un peu (sinon un bouton
    // "remonter" alors qu'on est déjà en haut n'a pas de sens).
    window.addEventListener('scroll', () => {
      document.getElementById('scroll-top-btn').classList.toggle('show', window.scrollY > 300);
    }, { passive: true });

    window.addEventListener('resize', syncSidebarOffset);
    syncSidebarOffset();

    loadEngagementConfig();
    loadUiConfig().then(refreshAlertsBadge);
    loadIsAdmin();
    loadSearchableSources();
    loadCustomFacetOperators();
    applyCollapsedFacets();
    updateCompactToggleLabel();
