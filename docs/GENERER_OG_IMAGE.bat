@echo off
cd /d "%~dp0"
echo Installation de canvas...
call npm install canvas
echo.
echo Generation de og-image.png...
node generate_og_image.js
echo.
echo Ouverture du dossier public...
explorer "..\frontend-web\public"
pause
