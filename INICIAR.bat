@echo off
chcp 65001 >nul
echo ==========================================
echo  R9 - Gestao de Notebooks
echo ==========================================
echo.
echo Iniciando backend...
cd /d "%~dp0backend"
start "R9 Backend" cmd /k "python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 3 >nul
echo.
echo Abrindo dashboard no navegador...
start "" "%~dp0dashboard.html"
echo.
echo ==========================================
echo  Pronto! O navegador deve abrir em segundos.
echo  Backend: http://localhost:8000
echo  Dashboard: dashboard.html
echo ==========================================
pause

