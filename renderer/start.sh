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
# Browserquellen im Container über den Prozessor zeichnen (Chromium bekommt hier keinen Grafikkarten-Bildschirm → sonst schwarzes Bild, nur Ton).
# BROWSER_GPU=1 schaltet die Hardwarebeschleunigung wieder ein.
HW=$([ "${BROWSER_GPU:-0}" = "1" ] && echo true || echo false)
for f in global.ini user.ini; do p="/config/obs-studio/$f"
  if grep -q '^BrowserHWAccel=' "$p"; then sed -i "s/^BrowserHWAccel=.*/BrowserHWAccel=$HW/" "$p"
  elif grep -q '^\[General\]' "$p"; then sed -i "/^\[General\]/a BrowserHWAccel=$HW" "$p"
  else printf '[General]\nBrowserHWAccel=%s\n' "$HW" >> "$p"; fi
done
cat > /config/obs-studio/plugin_config/obs-websocket/config.json <<J
{"alerts_enabled":false,"auth_required":$([ -n "$PW" ] && echo true || echo false),"first_load":false,"server_enabled":true,"server_password":"$PW","server_port":4455}
J
chown -R 99:100 /config /home/obs
rm -f /tmp/.X1-lock /tmp/.X11-unix/X1
Xvfb :1 -screen 0 "${AUFL}x24" -nolisten tcp &
sleep 1
su obs -s /bin/bash -c 'openbox' >/dev/null 2>&1 &
if [ -n "$VNCPW" ]; then x11vnc -storepasswd "$VNCPW" /tmp/vncpw >/dev/null; VNCOPT="-rfbauth /tmp/vncpw"; else VNCOPT="-nopw"; fi
x11vnc -display :1 -forever -shared -quiet -localhost -rfbport 5900 $VNCOPT >/dev/null 2>&1 &
websockify --web /usr/share/novnc 6080 localhost:5900 >/dev/null 2>&1 &
# Grafik-Prüfung fürs Protokoll (docker logs): welcher OpenGL-Treiber zeichnet
su obs -s /bin/bash -c "glxinfo -B 2>&1 | grep -E 'OpenGL renderer|direct rendering'" || echo "glxinfo: kein OpenGL"
echo "Render-Server läuft: Web-Oberfläche auf Port 6080 (vnc.html), OBS-WebSocket auf Port 4455"
# OBS laufen lassen; stürzt es ab, startet es nach 3 s neu
while true; do
  su obs -s /bin/bash -c 'cd /home/obs && dbus-launch --exit-with-session obs --disable-shutdown-check --multi --minimize-to-tray' || true
  echo "OBS beendet – Neustart in 3 s"; sleep 3
done
