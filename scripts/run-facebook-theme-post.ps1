# Lance la publication automatique du post thematique hebdomadaire (astuce /
# fonctionnalite / marche / appel a publier) sur la page Facebook @immoafricabf
# et journalise le resultat.
#
# Complete facebook-listing-publisher.js (annonces reelles, mar/jeu/sam) et
# post-newsletter-to-facebook.js (resume newsletter, lundi) : ce script publie
# le contenu genere par la tache planifiee Cowork "immobf-facebook-theme-post"
# (mer/ven 09:00) dans .facebook-theme-post.json.
#
# Appele mer/ven 09:15 par une tache planifiee Windows locale (meme schema que
# run-newsletter-auto.ps1 et run-facebook-publisher.ps1), car le sandbox Cowork
# n'a pas d'acces reseau a graph.facebook.com.

$ErrorActionPreference = "Continue"
$root = "C:\Code\immobf-africa"
$logDir = Join-Path $root "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

$logFile = Join-Path $logDir ("facebook-theme-post-{0}.log" -f (Get-Date -Format "yyyy-MM-dd_HH-mm"))
Set-Location $root

$maxAttempts = 3
$delaysSeconds = @(15, 45)
$allOutput = @()
$success = $false

if (-not (Test-Path (Join-Path $root ".env.facebook"))) {
    "[ATTENTION] .env.facebook introuvable - publication Facebook ignoree." | Out-File -FilePath $logFile -Encoding utf8
} elseif (-not (Test-Path (Join-Path $root ".facebook-theme-post.json"))) {
    "[ATTENTION] .facebook-theme-post.json introuvable - la tache Cowork 'immobf-facebook-theme-post' n'a peut-etre pas tourne. Publication ignoree." | Out-File -FilePath $logFile -Encoding utf8
} else {
    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        $allOutput += "--- Tentative $attempt/$maxAttempts ($(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) ---"
        $output = node --env-file=".env.facebook" scripts\post-facebook-theme.js 2>&1
        $allOutput += $output

        if ($LASTEXITCODE -eq 0) {
            $success = $true
            break
        }

        if ($attempt -lt $maxAttempts) {
            $wait = $delaysSeconds[$attempt - 1]
            $allOutput += "Echec (code $LASTEXITCODE), nouvelle tentative dans ${wait}s..."
            Start-Sleep -Seconds $wait
        }
    }

    $allOutput | Out-File -FilePath $logFile -Encoding utf8
}

$stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$statusLabel = if ($success) { "OK" } else { "ECHEC / ignore - voir detail" }
"$stamp - $statusLabel - voir $logFile" | Out-File -FilePath (Join-Path $logDir "facebook-theme-post-last-run.txt") -Encoding utf8
