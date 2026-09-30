@echo off
echo ===============================================
echo   ImmoBF Africa - Generateur de Documents
echo ===============================================
echo.

cd /d "%~dp0"

echo [1/3] Installation des dependances npm...
npm install
if %errorlevel% neq 0 (
    echo ERREUR: npm install a echoue. Verifiez que Node.js est installe.
    pause
    exit /b 1
)

echo.
echo [2/3] Generation de la fiche technique Word (.docx)...
node generate_fiche_technique.js
if %errorlevel% neq 0 (
    echo ERREUR: generation Word echouee.
    pause
    exit /b 1
)

echo.
echo [3/3] Generation de la presentation PowerPoint (.pptx)...
node generate_presentation.js
if %errorlevel% neq 0 (
    echo ERREUR: generation PowerPoint echouee.
    pause
    exit /b 1
)

echo.
echo ===============================================
echo   SUCCES ! Fichiers crees dans ce dossier :
echo   - ImmoBF_Africa_Fiche_Technique.docx
echo   - ImmoBF_Africa_Presentation.pptx
echo ===============================================
echo.
start "" "%~dp0"
pause
