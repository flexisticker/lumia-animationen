# =====================================================================
#  StreamModus – Einstellungen (hier anpassen)
#  Pfade leer lassen = automatisch über das Startmenü suchen.
# =====================================================================

# Programme, die in dieser Reihenfolge gestartet werden.
#   Name      = Anzeige
#   Pfad      = fester Pfad zur .exe oder .lnk (leer = automatisch suchen)
#   Suche     = Name der Startmenü-Verknüpfung (Platzhalter * erlaubt)
#   Prozesse  = Prozessnamen (ohne .exe) zum Erkennen und Beenden
#   Warten    = Sekunden Pause nach dem Start, bevor das nächste kommt
$Programme = @(
    @{ Name = 'Discord';            Pfad = '';  Suche = 'Discord';              Prozesse = @('Discord');                          Warten = 5  },
    @{ Name = 'OBS Studio';         Pfad = '';  Suche = 'OBS Studio*';          Prozesse = @('obs64', 'obs');                     Warten = 8  },
    @{ Name = 'Lumia Stream';       Pfad = '';  Suche = 'Lumia*';               Prozesse = @('Lumia Stream', 'LumiaStream', 'lumiastream'); Warten = 8 },
    @{ Name = 'TikTok LIVE Studio'; Pfad = '';  Suche = 'TikTok LIVE Studio*';  Prozesse = @('TikTok LIVE Studio', 'TikTokLIVEStudio'); Warten = 5 },
    # Streamer.bot hat meist keinen Startmenü-Eintrag -> hier den Pfad zur Streamer.bot.exe eintragen, z. B. 'C:\Streamer.bot\Streamer.bot.exe'
    @{ Name = 'Streamer.bot';       Pfad = '';  Suche = 'Streamer.bot*';        Prozesse = @('Streamer.bot');                     Warten = 0  }
)

# Woran das Ende des Streams erkannt wird (wird OBS geschlossen, endet der StreamModus)
$Hauptprogramm = @('obs64', 'obs')

# Cloud-Programme: werden beim Start beendet und danach wieder gestartet
$Clouds = @(
    @{ Name = 'Google Drive'; Prozesse = @('GoogleDriveFS');  StartArgs = '' },
    @{ Name = 'OneDrive';     Prozesse = @('OneDrive');       StartArgs = '/background' },
    @{ Name = 'Nextcloud';    Prozesse = @('nextcloud');      StartArgs = '--background' }
)

# Weitere Bandbreiten-Fresser, die während des Streams geschlossen werden (Prozessnamen), z. B. 'Dropbox', 'steam'
# Achtung: Battle.net/Steam nicht eintragen, wenn du darüber spielst.
$WeitereBeenden = @()

# Netzwerk/System-Optimierung (braucht Administratorrechte – es kommt eine Windows-Abfrage)
$SystemOptimieren = $true

# Programme beim Ende automatisch schließen, wenn OBS geschlossen wird
$AllesSchliessenNachObs = $true
