# ── docsearch-ui — Interface web statique ─────────────────────
# Nginx sert les fichiers statiques ; les appels /search, /document,
# /metrics etc. sont proxifiés vers docsearch-api par le reverse
# proxy Nginx de docsearch-infra (voir son nginx.conf).

FROM nginx:1.27-alpine

COPY public/ /usr/share/nginx/html/

EXPOSE 80
