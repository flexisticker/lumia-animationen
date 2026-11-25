@echo off
rem StreamModus von Hand beenden: Programme schliessen, Clouds und Windows-Updates wieder einschalten.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0StreamModus\Stream-Stop.ps1"
