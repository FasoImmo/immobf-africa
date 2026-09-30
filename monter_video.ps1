# ============================================================
# ImmoBF Africa - Montage automatique 60 secondes
# Usage : clic droit -> "Executer avec PowerShell"
# ============================================================

$ffmpeg = "C:\Cffmpeg\ffmpeg-9.0.1-essentials_build\bin\ffmpeg.exe"
$videos = "C:\Users\mahamady.koussoube\Videos"
$output = "$videos\ImmoBF-Promo-60s.mp4"
$tmp    = "$env:TEMP\immobf_tmp"

$scenes = @(
    @{ label="01-Inscription"; ss=2;  t=15 },
    @{ label="02-Publication"; ss=2;  t=18 },
    @{ label="03-Recherche";   ss=2;  t=13 },
    @{ label="04-Paiement";    ss=2;  t=14 }
)

# Recupere les clips MP4 tries par date, exclut la video finale
$clips = @(Get-ChildItem -Path "$videos\*.mp4" -File |
           Where-Object { $_.Name -notlike "*Promo*" } |
           Sort-Object LastWriteTime)

Write-Host "Clips trouves : $($clips.Count)"
$clips | ForEach-Object { Write-Host "  $($_.Name)" }

if ($clips.Count -lt 4) {
    Write-Host "ERREUR : il faut au moins 4 clips MP4 dans $videos" -ForegroundColor Red
    pause; exit 1
}

New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$listFile = "$tmp\concat.txt"
Set-Content $listFile ""

for ($i = 0; $i -lt 4; $i++) {
    $src  = $clips[$i].FullName
    $dest = "$tmp\scene_$i.mp4"
    $ss   = $scenes[$i].ss
    $t    = $scenes[$i].t
    $lbl  = $scenes[$i].label

    Write-Host "`nDecoupage $lbl (debut:$ss`s, duree:$t`s)..." -ForegroundColor Yellow
    & $ffmpeg -y -ss $ss -i $src -t $t `
        -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" `
        -c:v libx264 -preset fast -crf 20 -an "$dest"
    Add-Content $listFile "file '$dest'"
}

Write-Host "`nConcatenation -> $output" -ForegroundColor Green
& $ffmpeg -y -f concat -safe 0 -i $listFile -c copy $output

if (Test-Path $output) {
    Write-Host "`nVideo generee : $output" -ForegroundColor Green
} else {
    Write-Host "`nEchec de la generation" -ForegroundColor Red
}

Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
pause
