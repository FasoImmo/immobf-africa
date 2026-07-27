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

$stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"$stamp - voir $logFile" | Out-File -FilePath (Join-Path $logDir "newsletter-auto-last-run.txt") -Encoding utf8
