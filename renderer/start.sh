#!/bin/bash
# Startet den unsichtbaren Bildschirm, die Web-Oberfläche (noVNC) und OBS. OBS-Einstellungen liegen in /config (bleiben bei Updates erhalten).
set -u
PW="${OBS_WS_PASSWORT:-}"
VNCPW="${VNC_PASSWORT:-}"
AUFL="${AUFLOESUNG:-1920x1080}"
mkdir -p /config/obs-studio/plugin_config/obs-websocket
ln -sfn /config/obs-studio /home/obs/.config/obs-studio
# Erststart: Assistent aus, WebSocket an (Passwort aus der Unraid-Vorlage)
for f in global.ini user.ini; do [ -f "/config/obs-studio/$f" ] || printf '[General]\nFirstRun=false\nEnableAutoUpdates=false\n' > "/config/obs-studio/$f"; done
# Schlüssel in einer OBS-ini-Datei setzen (Abschnitt anlegen, falls er fehlt)
setze() { # datei abschnitt schluessel wert
  awk -v S="[$2]" -v K="$3" -v V="$4" '
    BEGIN { inS = 0; done = 0 }
    /^\[/ { if (inS && !done) { print K "=" V; done = 1 } inS = ($0 == S) }
    { if (inS && index($0, K "=") == 1) { if (!done) { print K "=" V; done = 1 } next } print }
    END { if (!done) { if (!inS) print S; print K "=" V } }' "$1" > "$1.neu" && mv "$1.neu" "$1"
}
# WebSocket-Server (OBS ≥ 30 liest ihn aus der ini, nicht mehr aus config.json)
for f in global.ini user.ini; do p="/config/obs-studio/$f"
  setze "$p" OBSWebSocket FirstLoad false
  setze "$p" OBSWebSocket ServerEnabled true
  setze "$p" OBSWebSocket ServerPort 4455
  setze "$p" OBSWebSocket AlertsEnabled false
  setze "$p" OBSWebSocket AuthRequired "$([ -n "$PW" ] && echo true || echo false)"
  setze "$p" OBSWebSocket ServerPassword "$PW"
done
cat > /config/obs-studio/plugin_config/obs-websocket/config.json <<J
{"alerts_enabled":false,"auth_required":$([ -n "$PW" ] && echo true || echo false),"first_load":false,"server_enabled":true,"server_password":"$PW","server_port":4455}
J
# Chromium-Sperrdateien eines früheren Containers entfernen (sonst „CEF failed to initialize. Exit code: 21“ = Profil in Benutzung → keine Browserquellen, kein Bild, kein Ton)
find /config/obs-studio -name 'Singleton*' -delete 2>/dev/null || true
chown -R 99:100 /config /home/obs
rm -f /tmp/.X1-lock /tmp/.X11-unix/X1
W="${AUFL%x*}"; H="${AUFL#*x}"
# ---------- Grafik: Nvidia-Karte (echter X-Server ohne Monitor) oder Software (Xvfb + Mesa) ----------
# GRAFIK=auto (Standard): Nvidia nehmen, wenn eine Karte durchgereicht ist; GRAFIK=software erzwingt die Software-Grafik.
nvidia_start() {
  command -v nvidia-smi >/dev/null 2>&1 || { echo "Grafik: keine Nvidia-Karte im Container (nvidia-smi fehlt – --runtime=nvidia gesetzt?)"; return 1; }
  VER=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null | head -1 | tr -d ' ')
  BUS=$(nvidia-smi --query-gpu=pci.bus_id --format=csv,noheader 2>/dev/null | head -1 | tr -d ' ')
  [ -n "$VER" ] && [ -n "$BUS" ] || { echo "Grafik: nvidia-smi liefert keine Karte"; return 1; }
  echo "Grafik: Nvidia $(nvidia-smi --query-gpu=name --format=csv,noheader | head -1), Treiber $VER, Bus $BUS"
  # Treiber-Bibliotheken (ohne Kernel-Teil) in genau der Version des Unraid-Treibers – einmal laden, in /config aufheben
  if ! [ -f /tmp/nvidia-installiert ] || [ "$(cat /tmp/nvidia-installiert)" != "$VER" ]; then
    RUN="/config/nvidia/NVIDIA-Linux-x86_64-$VER.run"
    mkdir -p /config/nvidia
    if [ ! -s "$RUN" ]; then
      echo "Grafik: lade Nvidia-Treiber $VER (einmalig, ca. 300 MB) …"
      curl -fsSL "https://download.nvidia.com/XFree86/Linux-x86_64/$VER/NVIDIA-Linux-x86_64-$VER.run" -o "$RUN.teil" && mv "$RUN.teil" "$RUN" || { rm -f "$RUN.teil"; echo "Grafik: Download fehlgeschlagen"; return 1; }
    fi
    echo "Grafik: richte Nvidia-Bibliotheken ein …"
    # Treiberpaket nur auspacken und die Grafik-Teile kopieren (Dateien, die Docker schon bereitstellt, z. B. libnvidia-ml, bleiben unangetastet)
    rm -rf /tmp/nv && sh "$RUN" -x --target /tmp/nv >/dev/null 2>&1 || { echo "Grafik: Treiberpaket lässt sich nicht auspacken"; return 1; }
    L=/usr/lib/x86_64-linux-gnu
    for f in /tmp/nv/*.so.$VER; do n=$(basename "$f"); [ -e "$L/$n" ] || cp "$f" "$L/$n"; done
    mkdir -p /usr/lib/xorg/modules/drivers /usr/lib/xorg/modules/extensions /usr/share/glvnd/egl_vendor.d
    cp /tmp/nv/nvidia_drv.so /usr/lib/xorg/modules/drivers/ 2>/dev/null
    cp /tmp/nv/libglxserver_nvidia.so.$VER /usr/lib/xorg/modules/extensions/libglxserver_nvidia.so 2>/dev/null
    cp /tmp/nv/10_nvidia.json /usr/share/glvnd/egl_vendor.d/ 2>/dev/null
    ldconfig; ln -sf libGLX_nvidia.so.$VER $L/libGLX_nvidia.so.0; ln -sf libEGL_nvidia.so.$VER $L/libEGL_nvidia.so.0
    rm -rf /tmp/nv
    [ -f /usr/lib/xorg/modules/drivers/nvidia_drv.so ] || { echo "Grafik: nvidia_drv.so fehlt im Treiberpaket"; return 1; }
    echo "$VER" > /tmp/nvidia-installiert
  fi
  # Bus-ID „00000000:01:00.0“ → Xorg „PCI:1:0:0“ (dezimal)
  IFS=":." read -r B D F <<< "${BUS#*:}"
  XBUS="PCI:$((16#$B)):$((16#$D)):$((16#$F))"
  mkdir -p /etc/X11
  cat > /etc/X11/xorg.conf <<X
Section "ServerLayout"
  Identifier "Layout0"
  Screen 0 "Screen0"
  Option "AutoAddDevices" "false"
EndSection
Section "Device"
  Identifier "Card0"
  Driver "nvidia"
  BusID "$XBUS"
  Option "AllowEmptyInitialConfiguration" "True"
  Option "HardDPMS" "false"
EndSection
Section "Screen"
  Identifier "Screen0"
  Device "Card0"
  DefaultDepth 24
  Option "UseDisplayDevice" "None"
  SubSection "Display"
    Depth 24
    Virtual $W $H
  EndSubSection
EndSection
X
  unset __EGL_VENDOR_LIBRARY_FILENAMES; export __GLX_VENDOR_LIBRARY_NAME=nvidia
  # im Container gibt es kein echtes Terminal: erst mit vt7 versuchen, sonst ohne Terminal-Umschaltung (-keeptty)
  for VT in "vt7" "-keeptty"; do
    rm -f /tmp/.X1-lock /tmp/.X11-unix/X1
    Xorg :1 $VT -noreset -novtswitch -sharevts -nolisten tcp -config /etc/X11/xorg.conf -logfile /tmp/Xorg.1.log >/dev/null 2>&1 &
    for i in $(seq 1 20); do [ -S /tmp/.X11-unix/X1 ] && break; sleep 0.5; done
    [ -S /tmp/.X11-unix/X1 ] && pgrep -x Xorg >/dev/null && break
    echo "Grafik: Xorg ($VT) startet nicht"; pkill Xorg 2>/dev/null; sleep 1
  done
  if ! su obs -s /bin/bash -c "glxinfo -B 2>/dev/null | grep -qi nvidia"; then
    echo "Grafik: Xorg mit Nvidia läuft nicht:"; grep -E "\(EE\)" /tmp/Xorg.1.log | tail -8
    pkill Xorg 2>/dev/null; sleep 1; rm -f /tmp/.X1-lock /tmp/.X11-unix/X1
    export __GLX_VENDOR_LIBRARY_NAME=mesa __EGL_VENDOR_LIBRARY_FILENAMES=/usr/share/glvnd/egl_vendor.d/50_mesa.json
    return 1
  fi
  return 0
}
GPU=0
if [ "${GRAFIK:-auto}" != "software" ] && nvidia_start; then GPU=1; echo "Grafik: Nvidia aktiv – OBS und Browserquellen zeichnen auf der Grafikkarte"
else
  echo "Grafik: Software (Prozessor) – langsamer"
  # -extension MIT-SHM: Mesa kann im Container keinen gemeinsamen X-Speicher nutzen („Failed to attach to x11 shm“ → schwarzes Bild)
  Xvfb :1 -screen 0 "${AUFL}x24" -nolisten tcp -extension MIT-SHM &
  sleep 1
fi
# Browserquellen: mit Nvidia über die Grafikkarte, sonst über den Prozessor (BROWSER_GPU=0/1 überschreibt)
HW=$([ "${BROWSER_GPU:-$GPU}" = "1" ] && echo true || echo false)
for f in global.ini user.ini; do setze "/config/obs-studio/$f" General BrowserHWAccel "$HW"; done
su obs -s /bin/bash -c 'openbox' >/dev/null 2>&1 &
if [ -n "$VNCPW" ]; then x11vnc -storepasswd "$VNCPW" /tmp/vncpw >/dev/null; VNCOPT="-rfbauth /tmp/vncpw"; else VNCOPT="-nopw"; fi
x11vnc -display :1 -forever -shared -noshm -localhost -rfbport 5900 $VNCOPT >/tmp/x11vnc.log 2>&1 &   # -noshm: Bildschirm ohne MIT-SHM (siehe Xvfb)
websockify --web /usr/share/novnc 6080 localhost:5900 >/dev/null 2>&1 &
# Grafik-Prüfung fürs Protokoll (docker logs): welcher OpenGL-Treiber zeichnet
su obs -s /bin/bash -c "glxinfo -B 2>&1 | grep -E 'OpenGL renderer|direct rendering'" || echo "glxinfo: kein OpenGL"
echo "Render-Server läuft: Web-Oberfläche auf Port 6080 (vnc.html), OBS-WebSocket auf Port 4455"
# Vorrang: OBS, Browserquellen (CEF) und Bildschirm bekommen hohe Priorität (PRIO -20…0, Standard -10; braucht --cap-add=SYS_NICE).
# Läuft alle 15 s, damit auch neu gestartete Browserquellen-Prozesse mitkommen.
PRIO="${PRIO:--10}"
( erst=1
  while true; do
    ok=1
    for pid in $(pgrep -u obs) $(pgrep -x Xorg) $(pgrep -x Xvfb); do
      renice -n "$PRIO" -p "$pid" >/dev/null 2>&1 || ok=0
      ionice -c2 -n0 -p "$pid" >/dev/null 2>&1 || true
    done
    if [ -n "$erst" ] && [ -n "$(pgrep -u obs -x obs)" ]; then
      [ "$ok" = 1 ] && echo "Vorrang: OBS läuft mit Priorität $PRIO" || echo "Vorrang: Priorität $PRIO nicht möglich – unter Extra Parameters --cap-add=SYS_NICE ergänzen"
      erst=""
    fi
    sleep 15
  done ) &
# OBS laufen lassen; stürzt es ab, startet es nach 3 s neu
while true; do
  su obs -s /bin/bash -c 'cd /home/obs && dbus-launch --exit-with-session obs --disable-shutdown-check --multi --minimize-to-tray' || true
  echo "OBS beendet – Neustart in 3 s"; sleep 3
done
