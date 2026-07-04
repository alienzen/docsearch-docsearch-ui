# docsearch-ui

Interface web statique de **DocSearch** : page de recherche et assistant
conversationnel (RAG). Fait partie de l'écosystème DocSearch :

| Dépôt | Rôle |
|---|---|
| [docsearch-ingestion](../docsearch-ingestion) | Extraction, ACL, indexation |
| [docsearch-api](../docsearch-api) | API de recherche |
| **docsearch-ui** (ce dépôt) | Interface web statique |
| [docsearch-infra](../docsearch-infra) | Orchestration Docker Compose |
| [docsearch-docs](../docsearch-docs) | Documents commerciaux |

## Contenu

```
public/
├── index.html   # Page de recherche
└── chat.html    # Assistant conversationnel (option RAG)
```

HTML/CSS/JS vanilla, aucune dépendance de build. Les pages appellent l'API
en relatif (`fetch('/search')`, `fetch('/ask')`) — le reverse proxy Nginx
de `docsearch-infra` route ces chemins vers `docsearch-api`.

## Développement local

```bash
# Servir directement sans Docker
cd public && python3 -m http.server 8080
# Nécessite un docsearch-api tournant en local sur le même host,
# avec un proxy (voir nginx.conf de docsearch-infra) pour que
# /search fonctionne — ou adapter temporairement les URLs fetch().
```

## Build de l'image

```bash
docker build -t docsearch-ui .
docker run -p 8080:80 docsearch-ui
```

## Migration future vers un framework JS

Si l'interface grossit, ce dépôt est le bon endroit pour introduire
React/Vue/Svelte sans toucher à l'API ni à l'ingestion — `public/`
deviendrait alors le dossier de build (`dist/`, `build/`).
