// ── Personnalisation manuelle des .result-card par source ──────────
// Chaque entrée ci-dessous s'enregistre sous la clé technique de la
// source (r.source, ex: "sharepoint_rh" — pas le libellé affiché, voir
// name dans file_sources_config.py / web_sources_config.py /
// sql_sources_config.py côté API). Cette clé est aussi visible dans
// l'attribut data-source de la carte (inspecteur du navigateur) ou dans
// l'admin des sources.
//
// Le hook reçoit :
//   cardEl : l'élément DOM .result-card déjà inséré dans la page (voir
//            renderCard() dans results.js pour sa structure —
//            .result-header, .result-title, .result-meta, .result-path,
//            .snippet, ...)
//   r      : l'objet résultat brut (id, title, source, filepath, author,
//            date_modified, score, highlight, ...)
//
// Une erreur dans un hook est interceptée et journalée dans la console
// (voir applySourceCardHooks() dans results.js) : elle n'empêche pas
// l'affichage des autres cartes.
//
// Chargé après constants.js (qui déclare l'objet sourceCardHooks) — voir
// index.html. Le pendant visuel de cette personnalisation se fait dans
// public/css/custom-sources.css.

/*
sourceCardHooks['sharepoint_rh'] = function(cardEl, r) {
  const title = cardEl.querySelector('.result-title');
  if (title) title.textContent = '[RH] ' + title.textContent;
};

sourceCardHooks['partage_dg'] = function(cardEl, r) {
  const meta = cardEl.querySelector('.result-meta');
  if (meta) {
    const note = document.createElement('span');
    note.textContent = 'Confidentiel';
    meta.appendChild(note);
  }
};
*/
