# MichaModus-Medien: statischer Dateiserver mit Startseite, allen Videos, Musik und den fertigen Lumia-Overlays
FROM halverneus/static-file-server:latest
COPY medien /web
COPY lumia /web/lumia
COPY lumia/index.html /web/index.html
ENV FOLDER=/web PORT=8080 CORS=true SHOW_LISTING=false
EXPOSE 8080
LABEL org.opencontainers.image.source="https://github.com/flexisticker/lumia-animationen" \
      org.opencontainers.image.description="MichaModus – Videos und Musik für die Lumia-Overlays" \
      net.unraid.docker.icon="https://medien.flexisticker.de/icon.png" \
      net.unraid.docker.webui="http://[IP]:[PORT:8080]/index.html"
