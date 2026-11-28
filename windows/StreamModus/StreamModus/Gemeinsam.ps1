# StreamModus – gemeinsame Hilfsfunktionen
$ErrorActionPreference = 'Continue'
$Basis      = $PSScriptRoot
$ZustandDir = Join-Path $env:LOCALAPPDATA 'StreamModus'
$Zustand    = Join-Path $ZustandDir 'zustand.json'
$Protokoll  = Join-Path $ZustandDir 'protokoll.txt'
$StopSperre = Join-Path $ZustandDir 'stop.lock'
New-Item -ItemType Directory -Force -Path $ZustandDir | Out-Null
. (Join-Path $Basis 'Einstellungen.ps1')

function Schreib([string]$Text, [string]$Farbe = 'Gray') {
    $z = (Get-Date -Format 'HH:mm:ss') + '  ' + $Text
    Write-Host $z -ForegroundColor $Farbe
    Add-Content -Path $Protokoll -Value ((Get-Date -Format 'yyyy-MM-dd ') + $z) -Encoding UTF8
}

function Finde-Verknuepfung([string]$Muster) {
    if (-not $Muster) { return $null }
    $orte = @(
        (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'),
        (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs'),
        [Environment]::GetFolderPath('Desktop'),
        (Join-Path $env:PUBLIC 'Desktop')
    )
    foreach ($o in $orte) {
        if (-not (Test-Path $o)) { continue }
        $f = Get-ChildItem -Path $o -Recurse -Filter ($Muster + '.lnk') -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($f) { return $f.FullName }
    }
    return $null
}

function Verknuepfung-Ziel([string]$Lnk) {
    try { return (New-Object -ComObject WScript.Shell).CreateShortcut($Lnk).TargetPath } catch { return $null }
}

function Ermittle-Start($App) {
    if ($App.Pfad -and (Test-Path $App.Pfad)) { return $App.Pfad }
    $lnk = Finde-Verknuepfung $App.Suche
    if ($lnk) { return $lnk }
    # Rückfall für Streamer.bot: übliche Orte durchsuchen
    if ($App.Name -eq 'Streamer.bot') {
        foreach ($o in @([Environment]::GetFolderPath('Desktop'), (Join-Path $env:USERPROFILE 'Downloads'), (Join-Path $env:USERPROFILE 'Documents'), 'C:\', 'D:\')) {
            if (-not (Test-Path $o)) { continue }
            $f = Get-ChildItem -Path $o -Recurse -Depth 3 -Filter 'Streamer.bot.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($f) { return $f.FullName }
        }
    }
    return $null
}

function Laeuft([string[]]$Namen) {
    return @(Get-Process -Name $Namen -ErrorAction SilentlyContinue).Count -gt 0
}

function Beende-Prozesse([string[]]$Namen, [string]$Anzeige, [int]$Sanft = 5) {
    $p = @(Get-Process -Name $Namen -ErrorAction SilentlyContinue)
    if (-not $p.Count) { return }
    Schreib "Schließe $Anzeige ..."
    foreach ($x in $p) { try { [void]$x.CloseMainWindow() } catch {} }
    $bis = (Get-Date).AddSeconds($Sanft)
    while ((Get-Date) -lt $bis -and (Laeuft $Namen)) { Start-Sleep -Milliseconds 500 }
    Get-Process -Name $Namen -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

function Lade-Zustand {
    if (Test-Path $Zustand) { try { return Get-Content $Zustand -Raw -Encoding UTF8 | ConvertFrom-Json } catch {} }
    return $null
}

function System-Anpassung([string]$Modus) {
    if (-not $SystemOptimieren) { return }
    $skript = Join-Path $Basis 'System-Anpassung.ps1'
    Schreib "System-Anpassung ($Modus) – bitte die Windows-Abfrage mit „Ja“ bestätigen." 'Yellow'
    try {
        $p = Start-Process -FilePath 'powershell.exe' -Verb RunAs -Wait -PassThru -WindowStyle Hidden `
            -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$skript`"", '-Modus', $Modus)
        if ($p.ExitCode -eq 0) { Schreib "System-Anpassung ($Modus) erledigt." 'Green' } else { Schreib "System-Anpassung ($Modus) meldet Fehler (Code $($p.ExitCode)), siehe Protokoll." 'Red' }
    } catch { Schreib "System-Anpassung ($Modus) abgebrochen (keine Administratorrechte?)." 'Red' }
}

# OBS-Einstellung „Hardwarebeschleunigung für Browserquellen“ (BrowserHWAccel im Abschnitt [General]) setzen.
# OBS 31+ speichert sie in user.ini, ältere Versionen in global.ini – beide werden angepasst, wenn vorhanden. Nur wenn OBS zu ist.
function Setze-BrowserBeschleunigung([bool]$An) {
    $ordner = Join-Path $env:APPDATA 'obs-studio'
    $wert = $(if ($An) { 'true' } else { 'false' })
    $geaendert = $false
    foreach ($datei in @('user.ini', 'global.ini')) {
        $p = Join-Path $ordner $datei
        if (-not (Test-Path $p)) { continue }
        $zeilen = [System.Collections.Generic.List[string]]([System.IO.File]::ReadAllLines($p))
        $gen = -1; $ende = $zeilen.Count; $treffer = -1
        for ($i = 0; $i -lt $zeilen.Count; $i++) {
            $z = $zeilen[$i].Trim()
            if ($z -match '^\[(.+)\]$') { if ($gen -ge 0 -and $ende -eq $zeilen.Count) { $ende = $i }; if ($Matches[1] -eq 'General') { $gen = $i; $ende = $zeilen.Count } }
            elseif ($gen -ge 0 -and $i -lt $ende -and $z -like 'BrowserHWAccel=*') { $treffer = $i }
        }
        if ($treffer -ge 0) { if ($zeilen[$treffer].Trim() -eq "BrowserHWAccel=$wert") { continue }; $zeilen[$treffer] = "BrowserHWAccel=$wert" }
        elseif ($gen -ge 0) { $zeilen.Insert($gen + 1, "BrowserHWAccel=$wert") }
        else { $zeilen.Add('[General]'); $zeilen.Add("BrowserHWAccel=$wert") }
        Copy-Item $p "$p.streammodus-sicherung" -Force -ErrorAction SilentlyContinue
        [System.IO.File]::WriteAllLines($p, $zeilen, (New-Object System.Text.UTF8Encoding($false)))
        $geaendert = $true
    }
    return $geaendert
}
