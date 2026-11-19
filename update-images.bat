@echo off
rem Double-click this file after adding or replacing ORIGINAL photos in the source folders under images\about\
rem (bike / photos / activities / profile folders). It rebuilds the web-sized photos and the data files.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\make-web-images.ps1"
echo.
pause
