    const PER_PAGE = 10;

    // Hooks de personnalisation des .result-card par source, remplis dans
    // public/js/custom-sources.js (fichier séparé, éditable sans toucher
    // au reste du code) — voir applySourceCardHooks() dans results.js.
    const sourceCardHooks = {};
    // Un chip "Word"/"Excel"/"PowerPoint" doit couvrir à la fois le
    // format moderne et l'ancien format binaire 97-2003 — sinon
    // sélectionner "Word" exclurait silencieusement les .doc.
    const SEARCH_IN_LABELS = { title: 'Titre', author: 'Auteur', keywords: 'Mots-clés', filepath: 'Chemin' };
    const SORT_LABELS     = { date_modified: 'Date de modification', filename: 'Nom', size: 'Taille' };

    const EXT_COLORS = {
      '.pdf':  { bg:'#FCEBEB', color:'#A32D2D' },
      '.docx': { bg:'#E6F1FB', color:'#0C447C' }, '.doc': { bg:'#E6F1FB', color:'#0C447C' },
      '.xlsx': { bg:'#EAF3DE', color:'#27500A' }, '.xls': { bg:'#EAF3DE', color:'#27500A' },
      '.pptx': { bg:'#EEEDFE', color:'#3C3489' }, '.ppt': { bg:'#EEEDFE', color:'#3C3489' },
      '.pst':  { bg:'#FAEEDA', color:'#633806' },
      '.txt':  { bg:'#F1EFE8', color:'#444441' },
    };

    // Les sources (sources_config.py côté API) sont un ensemble ouvert,
    // enregistré dynamiquement — pas de palette fixe possible comme
    // EXT_COLORS. On dérive une couleur stable par simple hachage du
    // nom : la même source garde toujours la même couleur d'une
    // recherche à l'autre, sans avoir besoin de connaître la liste des
    // sources à l'avance.
    const SOURCE_PALETTE = [
      { bg:'#E6F1FB', color:'#0C447C' },
      { bg:'#EAF3DE', color:'#27500A' },
      { bg:'#EEEDFE', color:'#3C3489' },
      { bg:'#FFF3E0', color:'#B34000' },
      { bg:'#FCEBEB', color:'#A32D2D' },
      { bg:'#FAEEDA', color:'#633806' },
      { bg:'#E0F7F5', color:'#0A6B62' },
      { bg:'#FDE8F3', color:'#8C1D6B' },
    ];

    function sourceColor(name) {
      let hash = 0;
      for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
      return SOURCE_PALETTE[hash % SOURCE_PALETTE.length];
    }

    // Icônes en SVG inline plutôt qu'une police d'icônes (aucune n'est
    // chargée dans ce projet — les classes "ti ti-*" utilisées un peu
    // partout dans les cartes de résultat et les modales ne rendaient
    // RIEN visuellement jusqu'ici, silencieusement). Toutes réunies ici
    // plutôt qu'un ICON_XXX isolé par cas d'usage, avec une classe
    // "icon" commune (voir règle svg.icon plus bas) pour un gabarit et
    // un alignement homogènes partout où elles apparaissent.
    const ICON_FOLDER       = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h5l2 3h9a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-13a1 1 0 0 1 1 -1"/></svg>';
    const ICON_COPY         = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8v-3a1 1 0 0 0 -1 -1h-9a1 1 0 0 0 -1 1v9a1 1 0 0 0 1 1h3"/></svg>';
    const ICON_CHECK        = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l10 -10"/></svg>';
    const ICON_X            = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6l-12 12"/><path d="M6 6l12 12"/></svg>';
    const ICON_USER         = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/></svg>';
    const ICON_CALENDAR     = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16"/><path d="M8 3v4"/><path d="M16 3v4"/></svg>';
    const ICON_CALENDAR_PLUS = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M12 13v5"/><path d="M9.5 15.5h5"/></svg>';
    const ICON_FILE         = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/></svg>';
    const ICON_FILE_ZIP     = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><path d="M11 9v1M11 12v1M11 15v1M11 18v1"/></svg>';
    const ICON_LOCK         = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
    const ICON_PHONE        = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5l1.5-2.5 5 2v3a1 1 0 0 1-1 1c-8 0-14-6-14-14a1 1 0 0 1 1-1"/></svg>';
    const ICON_BUILDING     = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="10" height="18"/><path d="M15 21v-4h4v4"/><path d="M8 7h1M11 7h1M8 11h1M11 11h1M8 15h1M11 15h1"/></svg>';
    const ICON_SEARCH_OFF   = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L20 20"/><path d="M4 4l16 16"/></svg>';
    const ICON_INFO_CIRCLE  = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v5h1"/></svg>';
    const ICON_EYE          = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
    const ICON_TAGS         = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h7l9 9-7 7-9-9z"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/></svg>';
    const ICON_WORLD        = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18"/></svg>';
    const ICON_ROUTE        = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M6 8v4a4 4 0 0 0 4 4h4"/></svg>';
    const ICON_GRID         = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></svg>';
    const ICON_LIST         = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>';
    const ICON_DOWNLOAD     = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="M8 11l4 4 4-4"/><path d="M5 19h14"/></svg>';
    const ICON_BELL         = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>';
    const ICON_CLIPBOARD    = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2.5" width="6" height="3" rx="1"/><path d="M9 11h6M9 15h6"/></svg>';
