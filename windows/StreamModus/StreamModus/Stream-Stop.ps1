# StreamModus – STOP: Programme schließen, System und Clouds wiederherstellen
param([switch]$NachObs)
. (Join-Path $PSScriptRoot 'Gemeinsam.ps1')
$Host.UI.RawUI.WindowTitle = 'StreamModus – Ende'

function Stop-StreamModus([switch]$NachObs) {
    Schreib '=== StreamModus wird beendet ===' 'Cyan'
    Set-Content -Path $StopSperre -Value (Get-Date) -ErrorAction SilentlyContinue   # Start-Fenster soll nicht zusätzlich aufräumen
    $z = Lade-Zustand

    # 1) Stream-Programme schließen (umgekehrte Reihenfolge; OBS nur, wenn es noch läuft)
    if ($AllesSchliessenNachObs -or -not $NachObs) {
        for ($i = $Programme.Count - 1; $i -ge 0; $i--) {
            $a = $Programme[$i]
            Beende-Prozesse $a.Prozesse $a.Name ($(if ($a.Prozesse -contains 'obs64') { 20 } else { 4 }))
        }
    }

    # 2) System wiederherstellen (Updates, Netzwerk, Energie)
    System-Anpassung 'Stop'

    # 3) Clouds und weitere Programme wieder starten (als normaler Benutzer)
    $neu = @()
    if ($z -and $z.clouds) { $neu += @($z.clouds) }
    if ($z -and $z.weitere) { $neu += @($z.weitere) }
    foreach ($c in $neu) {
        if (-not $c.Pfad -or -not (Test-Path $c.Pfad)) { continue }
        if (Laeuft @([IO.Path]::GetFileNameWithoutExtension($c.Pfad))) { continue }
        try {
            if ($c.Args) { Start-Process -FilePath $c.Pfad -ArgumentList $c.Args -WorkingDirectory (Split-Path $c.Pfad) }
            else { Start-Process -FilePath $c.Pfad -WorkingDirectory (Split-Path $c.Pfad) }
            Schreib "$($c.Name) wieder gestartet." 'Green'
        } catch { Schreib "$($c.Name) konnte nicht gestartet werden: $_" 'Red' }
    }
    if (-not $z) {
        # kein gemerkter Stand (z. B. Neustart dazwischen): Clouds an ihren üblichen Orten starten
        $ueblich = @(
            @{ Name = 'OneDrive';  Pfad = (Join-Path $env:LOCALAPPDATA 'Microsoft\OneDrive\OneDrive.exe'); Args = '/background' },
            @{ Name = 'Nextcloud'; Pfad = 'C:\Program Files\Nextcloud\nextcloud.exe'; Args = '--background' }
        )
        $gd = Get-ChildItem 'C:\Program Files\Google\Drive File Stream' -Recurse -Filter 'GoogleDriveFS.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
        if ($gd) { $ueblich += @{ Name = 'Google Drive'; Pfad = $gd.FullName; Args = '' } }
        foreach ($c in $ueblich) {
            if ((Test-Path $c.Pfad) -and -not (Laeuft @([IO.Path]::GetFileNameWithoutExtension($c.Pfad)))) {
                if ($c.Args) { Start-Process -FilePath $c.Pfad -ArgumentList $c.Args } else { Start-Process -FilePath $c.Pfad }
                Schreib "$($c.Name) gestartet." 'Green'
            }
        }
    }
    Remove-Item $Zustand -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 4; Remove-Item $StopSperre -Force -ErrorAction SilentlyContinue
    Schreib '=== Normalbetrieb wiederhergestellt ===' 'Green'
}

# direkt aufgerufen (Stream-Stop.bat) → ausführen
if ($MyInvocation.InvocationName -ne '.') {
    Stop-StreamModus -NachObs:$NachObs
    Start-Sleep -Seconds 4
}
