@echo off
title Renove - R9
echo ===================================================
echo     Iniciando Renove - R9 (Senac-DF)
echo ===================================================

cd /d "%~dp0"

echo [1/2] Iniciando Backend FastAPI (Porta 8000)...
start "Renove Backend (FastAPI)" cmd /k "cd backend && .\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Iniciando Frontend Vite (Porta 5173)...
start "Renove Frontend (Vite)" cmd /k "npm run dev"

echo.
echo ===================================================
echo   Aplicacao pronta para uso!
echo   Frontend: http://localhost:5173
echo   Backend / Docs: http://localhost:8000/docs
echo ===================================================
timeout /t 5 >nul
