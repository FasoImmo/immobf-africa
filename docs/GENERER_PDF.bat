@echo off
cd /d "%~dp0"
echo =============================================
echo   ImmoBF Africa - Generation des PDF
echo =============================================
echo.
echo Installation de reportlab...
pip install reportlab --quiet
echo.
echo Generation de la fiche technique PDF...
python generate_fiche_technique_pdf.py
echo.
echo Generation de la presentation PDF...
python generate_presentation_pdf.py
echo.
echo =============================================
echo   Documents generes dans ce dossier :
echo   - ImmoBF_Africa_Fiche_Technique.pdf
echo   - ImmoBF_Africa_Presentation.pdf
echo =============================================
echo.
explorer "%~dp0"
pause
