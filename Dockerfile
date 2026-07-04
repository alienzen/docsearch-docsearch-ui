# ── docsearch-ui — Interface web statique ─────────────────────
# Nginx sert les fichiers statiques ET proxifie /search, /document,
# /metrics, /ask, /api/preview vers docsearch-api (service "api" du
# même réseau Docker) — l'UI fonctionne donc seule en développement
# (port 8080), sans dépendre du reverse proxy de production.

FROM nginx:1.27-alpine

COPY public/     /usr/share/nginx/html/
COPY nginx.conf  /etc/nginx/nginx.conf

EXPOSE 80
