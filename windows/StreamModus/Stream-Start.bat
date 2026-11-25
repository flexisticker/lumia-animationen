@echo off
rem StreamModus starten: Clouds pausieren, Updates anhalten, Netzwerk optimieren, Stream-Programme starten.
rem Das Fenster bleibt minimiert offen und raeumt automatisch auf, sobald OBS geschlossen wird.
start "StreamModus" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0StreamModus\Stream-Start.ps1"
