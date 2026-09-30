# Lance la publication automatique des annonces ImmoBF Africa sur la page Facebook @immoafricabf
# et journalise le résultat. Remplace la tâche planifiée Cowork "facebook-listing-publisher-immoafricabf",
# bloquée car le bac à sable Cowork n'a pas accès à api.immoafrica.online ni graph.facebook.com.
# Appelé mar/jeu/sam 10h par une tâche planifiée Windows locale (même schéma que run-newsletter-auto.ps1).
#
# Retry intégré : le DNS du réseau d'entreprise est parfois lent/instable (timeouts observés le 30/07/2026).
# Relancer le script entier après échec est sans risque de doublon : chaque publication Facebook réussie
# est enregistrée immédiatement dans facebook-posted-ids.json (cooldown 21j), donc une nouvelle tentative
# ne republie jamais une annonce déjà postée.

$ErrorActionPreference = "Continue"
$root = "C:\Code\immobf-africa"
$logDir = Join-Path $root "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

$logFile = Join-Path $logDir ("facebook-publisher-{0}.log" -f (Get-Date -Format "yyyy-MM-dd_HH-mm"))
Set-Location $root

$maxAttempts = 3
$delaysSeconds = @(15, 45)  # entre les tentatives 1->2 et 2->3
$allOutput = @()
$success = $false

for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    $allOutput += "--- Tentative $attempt/$maxAttempts ($(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) ---"
    $output = node --env-file=".env.facebook" facebook-listing-publisher.js 2>&1
    $allOutput += $output

    if ($LASTEXITCODE -eq 0) {
        $success = $true
        break
    }

    if ($attempt -lt $maxAttempts) {
        $wait = $delaysSeconds[$attempt - 1]
        $allOutput += "Échec (code $LASTEXITCODE), nouvelle tentative dans ${wait}s…"
        Start-Sleep -Seconds $wait
    }
}

$allOutput | Out-File -FilePath $logFile -Encoding utf8

$stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$statusLabel = if ($success) { "OK" } else { "ÉCHEC après $maxAttempts tentatives" }
"$stamp - $statusLabel - voir $logFile" | Out-File -FilePath (Join-Path $logDir "facebook-publisher-last-run.txt") -Encoding utf8
