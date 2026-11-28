#!/bin/bash
# Lädt die neueste Linux-Fassung von obs-shaderfilter (exeldro) und installiert sie systemweit für OBS.
# Unterstützt .deb und Archive (.tar.xz/.tar.gz/.zip); bricht den Bau ab, wenn danach kein shaderfilter-Modul da ist.
set -e
J=$(curl -fsSL https://api.github.com/repos/exeldro/obs-shaderfilter/releases/latest)
echo "Shaderfilter: $(echo "$J" | jq -r .tag_name)"; echo "$J" | jq -r '.assets[].name'
URL=$(echo "$J" | jq -r '.assets[] | select(.name | test("(x86_64|amd64).*\\.deb$")) | .browser_download_url' | head -1)
mkdir -p /tmp/sf && cd /tmp/sf
if [ -n "$URL" ]; then
  curl -fsSL "$URL" -o sf.deb && apt-get update && apt-get install -y ./sf.deb && rm -rf /var/lib/apt/lists/*
else
  URL=$(echo "$J" | jq -r '.assets[] | select(.name | test("(linux|ubuntu).*(x86_64|amd64)?.*\\.(tar\\.xz|tar\\.gz|zip)$"; "i")) | .browser_download_url' | head -1)
  [ -n "$URL" ] || { echo "Keine Linux-Datei für obs-shaderfilter gefunden"; exit 1; }
  curl -fsSL "$URL" -o sf.pkg
  case "$URL" in *.zip) (apt-get update && apt-get install -y unzip >/dev/null; unzip -q sf.pkg) ;; *) tar -xf sf.pkg ;; esac
  SO=$(find . -name '*shader*filter*.so' | head -1); [ -n "$SO" ] || { echo "Kein .so im Archiv"; exit 1; }
  NAME=$(basename "$SO" .so)
  install -D "$SO" "/usr/lib/x86_64-linux-gnu/obs-plugins/$NAME.so"
  DATA=$(find . -type d -path '*data*' -name 'data' | head -1)
  [ -n "$DATA" ] && mkdir -p "/usr/share/obs/obs-plugins/$NAME" && cp -r "$DATA"/. "/usr/share/obs/obs-plugins/$NAME/"
fi
cd / && rm -rf /tmp/sf
echo 'Prüfung Shaderfilter:'; find / -xdev -name '*shader*filter*.so' 2>/dev/null | grep -q . && find / -xdev -name '*shader*filter*.so' 2>/dev/null | head -3 || { echo "shaderfilter.so fehlt"; exit 1; }
