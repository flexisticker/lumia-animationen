# Live-Studio Render-Server: OBS ohne Bildschirm auf dem Unraid-Server. Rechnet die Live-Studio-Browserquellen
# und schickt das fertige Bild (mit Durchsichtigkeit + Ton) per NDI an das OBS auf dem Stream-PC.
# Web-Oberfläche zum Nachsehen: http://<server>:6080/vnc.html  ·  OBS-WebSocket: Port 4455 (Live-Studio richtet alles darüber ein)
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8 DISPLAY=:1 HOME=/home/obs \
    NVIDIA_DRIVER_CAPABILITIES=all
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl jq software-properties-common gpg-agent \
      xvfb x11vnc novnc websockify openbox dbus-x11 xauth fonts-dejavu fonts-noto-color-emoji \
      avahi-daemon libnss3 libxss1 libasound2t64 pulseaudio \
    && add-apt-repository -y ppa:obsproject/obs-studio && apt-get update \
    && apt-get install -y --no-install-recommends obs-studio \
    && rm -rf /var/lib/apt/lists/*
# NDI-Laufzeit (vom Hersteller, Lizenz wird beim Bau bestätigt) + DistroAV (NDI-Plugin für OBS), jeweils neueste Fassung
RUN curl -fsSL https://raw.githubusercontent.com/DistroAV/DistroAV/master/CI/libndi-get.sh -o /tmp/libndi-get.sh \
    && bash /tmp/libndi-get.sh install && ldconfig \
    && URL=$(curl -fsSL https://api.github.com/repos/DistroAV/DistroAV/releases/latest | jq -r '.assets[] | select(.name | test("x86_64.*\\.deb$")) | .browser_download_url' | head -1) \
    && echo "DistroAV: $URL" && curl -fsSL "$URL" -o /tmp/distroav.deb && apt-get update && apt-get install -y /tmp/distroav.deb \
    && rm -rf /tmp/*.deb /tmp/libndi-get.sh /var/lib/apt/lists/*
# Benutzer wie bei Unraid üblich (nobody:users = 99:100), OBS läuft nicht als root (Chromium der Browserquellen mag das nicht)
RUN (getent group users || groupadd -g 100 users) && useradd -u 99 -g 100 -o -d /home/obs -m -s /bin/bash obs || true \
    && mkdir -p /config /home/obs/.config && chown -R 99:100 /config /home/obs
COPY start.sh /start.sh
RUN chmod +x /start.sh
VOLUME ["/config"]
EXPOSE 6080 4455
ENTRYPOINT ["/start.sh"]
