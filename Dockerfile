# MichaModus-Medien: statischer Dateiserver mit allen Videos, Musik und den fertigen Lumia-Overlays
FROM halverneus/static-file-server:latest
COPY medien /web
COPY lumia /web/lumia
ENV FOLDER=/web PORT=8080 CORS=true SHOW_LISTING=false
EXPOSE 8080
LABEL org.opencontainers.image.source="https://github.com/flexisticker/lumia-animationen" \
      org.opencontainers.image.description="MichaModus – Videos und Musik für die Lumia-Overlays"
