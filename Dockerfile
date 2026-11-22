# Live-Studio (MichaModus / 3dbymicha): Verwaltung, Tablet-Steuerung, Browserquellen, Lumia-Anbindung
FROM node:22-alpine
WORKDIR /app
COPY app/server.mjs ./server.mjs
COPY app/public ./public
COPY medien ./medien
ENV PORT=8080 DATA_DIR=/data MEDIA_DIR=/app/medien KANAL=michamodus NODE_ENV=production
VOLUME /data
EXPOSE 8080
CMD ["node", "server.mjs"]
LABEL org.opencontainers.image.source="https://github.com/flexisticker/lumia-animationen" \
      org.opencontainers.image.description="Live-Studio für TikTok-Lives: Animationen, Tablet-Steuerung, Browserquellen"
