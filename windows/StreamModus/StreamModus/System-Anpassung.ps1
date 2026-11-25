# StreamModus – System-Anpassung (läuft mit Administratorrechten)
#   -Modus Start : Updates/Uploads pausieren, Netzwerk und Energie für Streaming einstellen, alten Stand merken
#   -Modus Stop  : gemerkten Stand wiederherstellen
param([ValidateSet('Start', 'Stop')][string]$Modus = 'Start')
$ErrorActionPreference = 'Continue'
$Dir   = Join-Path $env:ProgramData 'StreamModus'
$Datei = Join-Path $Dir 'system.json'
$Log   = Join-Path $Dir 'system-protokoll.txt'
New-Item -ItemType Directory -Force -Path $Dir | Out-Null
function Log($t) { Add-Content -Path $Log -Value ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + "  [$Modus] " + $t) -Encoding UTF8 }

# Windows Update, Update-Orchestrator, Hintergrund-Übertragung, Übermittlungsoptimierung (lädt Updates auch zu anderen PCs hoch)
$Dienste  = @('wuauserv', 'UsoSvc', 'BITS', 'DoSvc')
# Standardwerte, falls kein gemerkter Stand vorhanden ist (Start: 2 = automatisch, 3 = manuell)
$Standard = @{ wuauserv = @{ Start = 3; Delayed = 0 }; UsoSvc = @{ Start = 2; Delayed = 1 }; BITS = @{ Start = 3; Delayed = 0 }; DoSvc = @{ Start = 2; Delayed = 1 } }
$MM       = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile'
$Store    = 'HKLM:\SOFTWARE\Policies\Microsoft\WindowsStore'
$QosName  = 'StreamModus-OBS'
$Fehler   = 0

function RegWert($Pfad, $Name) { try { return (Get-ItemProperty -Path $Pfad -Name $Name -ErrorAction Stop).$Name } catch { return $null } }
function Setze-Starttyp($Name, $Start, $Delayed) {
    $sc = switch ($Start) { 2 { if ($Delayed) { 'delayed-auto' } else { 'auto' } } 3 { 'demand' } 4 { 'disabled' } default { 'demand' } }
    $r = & sc.exe config $Name start= $sc 2>&1
    if ($LASTEXITCODE -ne 0) {
        # geschützter Dienst: direkt in der Registry versuchen
        try { Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\$Name" -Name Start -Value $Start -ErrorAction Stop; Log "$Name Starttyp per Registry = $Start" }
        catch { Log "$Name Starttyp nicht änderbar: $r"; return $false }
    }
    return $true
}

if ($Modus -eq 'Start') {
    $alt = Get-Content $Datei -Raw -ErrorAction SilentlyContinue
    if ($alt) { Log 'Es gab schon einen gemerkten Stand (StreamModus lief bereits) – er wird nicht überschrieben.'; $stand = $alt | ConvertFrom-Json }
    else {
        $stand = [ordered]@{ zeit = (Get-Date).ToString('s'); dienste = @{}; reg = @{}; energie = '' }
        foreach ($d in $Dienste) {
            $k = "HKLM:\SYSTEM\CurrentControlSet\Services\$d"
            $s = Get-Service -Name $d -ErrorAction SilentlyContinue
            if (-not $s) { continue }
            $stand.dienste[$d] = @{ Start = RegWert $k 'Start'; Delayed = [int](RegWert $k 'DelayedAutostart'); Lief = ($s.Status -eq 'Running') }
        }
        $stand.reg['NetworkThrottlingIndex'] = RegWert $MM 'NetworkThrottlingIndex'
        $stand.reg['SystemResponsiveness']   = RegWert $MM 'SystemResponsiveness'
        $stand.reg['StoreAutoDownload']      = RegWert $Store 'AutoDownload'
        $akt = (& powercfg /getactivescheme) -join ' '
        if ($akt -match '([0-9a-fA-F\-]{36})') { $stand.energie = $Matches[1] }
        $stand | ConvertTo-Json -Depth 5 | Set-Content -Path $Datei -Encoding UTF8
        Log 'Alter Stand gemerkt.'
    }

    # 1) Updates & Uploads pausieren
    foreach ($d in $Dienste) {
        if (-not (Get-Service -Name $d -ErrorAction SilentlyContinue)) { continue }
        [void](Setze-Starttyp $d 4 0)   # geschützte Dienste (z. B. UsoSvc) lassen sich evtl. nicht umstellen – Stoppen reicht
        Stop-Service -Name $d -Force -ErrorAction SilentlyContinue
        Log "$d gestoppt."
    }
    # Microsoft Store: keine automatischen App-Updates
    try { New-Item -Path $Store -Force | Out-Null; Set-ItemProperty -Path $Store -Name AutoDownload -Value 2 -Type DWord; Log 'Store-Updates aus.' } catch { $Fehler++; Log "Store: $_" }

    # 2) Netzwerk für Streaming: keine Drosselung bei Multimedia, mehr Rechenzeit für Vordergrund
    try { Set-ItemProperty -Path $MM -Name NetworkThrottlingIndex -Value 0xffffffff -Type DWord; Set-ItemProperty -Path $MM -Name SystemResponsiveness -Value 10 -Type DWord; Log 'Netzwerk-Drosselung aus.' } catch { $Fehler++; Log "Multimedia: $_" }
    # OBS-Pakete im Netzwerk bevorzugt kennzeichnen (wirkt, wenn der Router QoS/DSCP beachtet)
    try {
        Remove-NetQosPolicy -Name $QosName -Confirm:$false -ErrorAction SilentlyContinue
        New-NetQosPolicy -Name $QosName -AppPathNameMatchCondition 'obs64.exe' -DSCPAction 46 -NetworkProfile All -ErrorAction Stop | Out-Null
        Log 'QoS für OBS gesetzt.'
    } catch { Log "QoS nicht gesetzt: $_" }

    # 3) Energie: Höchstleistung (kein Stromsparen bei Netzwerkkarte/CPU)
    & powercfg /setactive SCHEME_MIN 2>&1 | Out-Null
    Log 'Energieplan Höchstleistung.'
}
else {
    $stand = $null
    if (Test-Path $Datei) { try { $stand = Get-Content $Datei -Raw -Encoding UTF8 | ConvertFrom-Json } catch {} }
    if (-not $stand) { Log 'Kein gemerkter Stand – stelle Windows-Standardwerte her.' }

    foreach ($d in $Dienste) {
        if (-not (Get-Service -Name $d -ErrorAction SilentlyContinue)) { continue }
        $w = if ($stand -and $stand.dienste.$d) { $stand.dienste.$d } else { $null }
        $start = if ($w -and $w.Start) { [int]$w.Start } else { $Standard[$d].Start }
        $del   = if ($w) { [int]$w.Delayed } else { $Standard[$d].Delayed }
        if ($start -eq 4 -and -not $w) { $start = $Standard[$d].Start }
        [void](Setze-Starttyp $d $start $del)
        if (($w -and $w.Lief) -or (-not $w -and $start -eq 2)) { Start-Service -Name $d -ErrorAction SilentlyContinue }
        Log "$d wiederhergestellt (Start=$start)."
    }
    function Zurueck($Pfad, $Name, $Wert) {
        if ($null -eq $Wert) { Remove-ItemProperty -Path $Pfad -Name $Name -ErrorAction SilentlyContinue }
        else { Set-ItemProperty -Path $Pfad -Name $Name -Value $Wert -Type DWord -ErrorAction SilentlyContinue }
    }
    if ($stand) {
        Zurueck $MM 'NetworkThrottlingIndex' $stand.reg.NetworkThrottlingIndex
        Zurueck $MM 'SystemResponsiveness'   $stand.reg.SystemResponsiveness
        Zurueck $Store 'AutoDownload'        $stand.reg.StoreAutoDownload
        if ($stand.energie) { & powercfg /setactive $stand.energie 2>&1 | Out-Null }
    } else {
        Set-ItemProperty -Path $MM -Name NetworkThrottlingIndex -Value 10 -Type DWord -ErrorAction SilentlyContinue
        Set-ItemProperty -Path $MM -Name SystemResponsiveness -Value 20 -Type DWord -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path $Store -Name AutoDownload -ErrorAction SilentlyContinue
        & powercfg /setactive SCHEME_BALANCED 2>&1 | Out-Null
    }
    Remove-NetQosPolicy -Name $QosName -Confirm:$false -ErrorAction SilentlyContinue
    Remove-Item $Datei -Force -ErrorAction SilentlyContinue
    Log 'Alles wiederhergestellt.'
}
exit $Fehler
