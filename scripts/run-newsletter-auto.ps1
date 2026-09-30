# Lance le push + envoi automatique de la newsletter hebdomadaire et journalise le résultat.
# Appelé chaque lundi par une tâche planifiée Windows (voir README de mise en place).

$ErrorActionPreference = "Continue"
$root = "C:\Code\immobf-africa"
$logDir = Join-Path $root "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

$logFile = Join-Path $logDir ("newsletter-auto-{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))

Set-Location $root
$output = node scripts\push-and-send-newsletter.js 2>&1
$output | Out-File -FilePath $logFile -Encoding utf8

# Publication Facebook (@immoafricabf) — appelée ici car le sandbox de la tâche
# planifiée Cowork "immobf-newsletter-hebdo" n'a pas d'accès réseau à
# graph.facebook.com (proxy avec allowlist). Ce script tourne sur la machine
# Windows de l'utilisateur, qui a un accès réseau normal.
$fbLogFile = Join-Path $logDir ("newsletter-fb-{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))
if (Test-Path (Join-Path $root ".env.facebook")) {
    $fbOutput = node --env-file=.env.facebook scripts\post-newsletter-to-facebook.js 2>&1
    $fbOutput | Out-File -FilePath $fbLogFile -Encoding utf8
} else {
    "⚠️ .env.facebook introuvable — publication Facebook ignorée." | Out-File -FilePath $fbLogFile -Encoding utf8
}

$stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"$stamp - voir $logFile (newsletter) et $fbLogFile (facebook)" | Out-File -FilePath (Join-Path $logDir "newsletter-auto-last-run.txt") -Encoding utf8
