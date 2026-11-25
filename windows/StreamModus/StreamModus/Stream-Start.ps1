# StreamModus – START: Clouds pausieren, System optimieren, Stream-Programme starten,
# danach warten, bis OBS geschlossen wird, und alles wiederherstellen.
. (Join-Path $PSScriptRoot 'Gemeinsam.ps1')
. (Join-Path $PSScriptRoot 'Stream-Stop.ps1')
$Host.UI.RawUI.WindowTitle = 'StreamModus – läuft (Fenster offen lassen)'

if ((Lade-Zustand) -and (Laeuft $Hauptprogramm)) {
    Schreib 'StreamModus läuft bereits (OBS ist offen).' 'Yellow'; Start-Sleep 4; exit
}
Remove-Item $StopSperre -Force -ErrorAction SilentlyContinue
Schreib '=== StreamModus startet ===' 'Cyan'
$stand = [ordered]@{ zeit = (Get-Date).ToString('s'); clouds = @(); weitere = @() }

# 1) Clouds beenden (Pfad merken, damit sie danach wieder starten)
foreach ($c in $Clouds) {
    $p = @(Get-Process -Name $c.Prozesse -ErrorAction SilentlyContinue)
    if (-not $p.Count) { continue }
    $pfad = ($p | Where-Object { $_.Path } | Select-Object -First 1).Path
    $stand.clouds += @{ Name = $c.Name; Pfad = $pfad; Args = $c.StartArgs }
    Schreib "Pausiere $($c.Name) ..."
    if ($pfad -and $c.Name -eq 'OneDrive')  { Start-Process -FilePath $pfad -ArgumentList '/shutdown' -ErrorAction SilentlyContinue; Start-Sleep 3 }
    if ($pfad -and $c.Name -eq 'Nextcloud') { Start-Process -FilePath $pfad -ArgumentList '--quit' -ErrorAction SilentlyContinue; Start-Sleep 3 }
    Beende-Prozesse $c.Prozesse $c.Name 3
}
foreach ($n in $WeitereBeenden) {
    $p = Get-Process -Name $n -ErrorAction SilentlyContinue | Where-Object { $_.Path } | Select-Object -First 1
    if ($p) { $stand.weitere += @{ Name = $n; Pfad = $p.Path; Args = '' } }
    Beende-Prozesse @($n) $n 3
}
# Wurde ein früherer StreamModus nicht sauber beendet: dessen gemerkte Clouds übernehmen (sonst starten sie nie wieder)
$alt = Lade-Zustand
if ($alt) {
    foreach ($x in @($alt.clouds) + @($alt.weitere)) {
        if ($x -and $x.Pfad -and -not (@($stand.clouds) + @($stand.weitere) | Where-Object { $_.Pfad -eq $x.Pfad })) { $stand.clouds += @{ Name = $x.Name; Pfad = $x.Pfad; Args = $x.Args } }
    }
}
$stand | ConvertTo-Json -Depth 5 | Set-Content -Path $Zustand -Encoding UTF8

# 2) System für Streaming einstellen (Windows-Abfrage bestätigen)
System-Anpassung 'Start'

# 3) Programme der Reihe nach starten
foreach ($a in $Programme) {
    if (Laeuft $a.Prozesse) { Schreib "$($a.Name) läuft schon." 'DarkGray'; continue }
    $start = Ermittle-Start $a
    if (-not $start) { Schreib "$($a.Name) nicht gefunden – in Einstellungen.ps1 den Pfad eintragen." 'Red'; continue }
    Schreib "Starte $($a.Name) ..." 'White'
    try {
        if ($start -like '*.lnk') { Start-Process -FilePath $start }
        else { Start-Process -FilePath $start -WorkingDirectory (Split-Path $start) }   # OBS braucht seinen Programmordner
    } catch { Schreib "$($a.Name) ließ sich nicht starten: $_" 'Red'; continue }
    $bis = (Get-Date).AddSeconds(45)
    while ((Get-Date) -lt $bis -and -not (Laeuft $a.Prozesse)) { Start-Sleep -Milliseconds 500 }
    if (-not (Laeuft $a.Prozesse)) { Schreib "$($a.Name): Prozess nicht erkannt – Prozessname in Einstellungen.ps1 prüfen." 'Yellow' }
    if ($a.Prozesse -contains 'obs64') { Get-Process -Name $a.Prozesse -ErrorAction SilentlyContinue | ForEach-Object { try { $_.PriorityClass = 'AboveNormal' } catch {} } }
    if ($a.Warten) { Start-Sleep -Seconds $a.Warten }
}

# 4) Warten, bis OBS geschlossen wird
Schreib 'Alles läuft. Viel Spaß beim Streamen! Wird OBS geschlossen, stellt sich alles von selbst wieder her.' 'Green'
$weg = 0
while ($true) {
    Start-Sleep -Seconds 3
    if ((Test-Path $StopSperre) -or -not (Test-Path $Zustand)) { Schreib 'StreamModus wird von Hand beendet (Stream-Stop).'; break }
    if (Laeuft $Hauptprogramm) { $weg = 0 } else { $weg++ }
    if ($weg -ge 2) {
        Schreib 'OBS wurde geschlossen.' 'Cyan'
        Stop-StreamModus -NachObs
        break
    }
}
Start-Sleep -Seconds 4
