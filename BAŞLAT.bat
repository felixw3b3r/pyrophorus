@echo off
title Pyrophorus Server & App Starter
echo ========================================================
echo   PYROPHORUS - SUNUCU VE MASAUSTU UYGULAMASI
echo ========================================================
echo.

echo [1/3] Backend Sunucu (Cargo Axum) baslatiliyor...
start /min "Pyrophorus Backend Server" cmd /k "cd /d %~dp0server && cargo run"

ping 127.0.0.1 -n 4 >nul

echo [2/3] Cloudflare Tunnel baslatiliyor...
echo.
echo Bilgisayariniz kapanip acilsa bile dc.yusuftaha.sbs adresi uzerinden
echo sunucunuz canliya gecmektedir.
echo.

start /min "Pyrophorus Cloudflare Tunnel" cmd /k ""C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel run --token eyJhIjoiOGRmNDQ2OWYxOThhZDJjOTkwZGExZjNkZGE0ODY4NjAiLCJ0IjoiMjExZDRlNzktYjZjYy00M2FiLWJmMGEtZTcxOWMxMDdhMTJjIiwicyI6Ik9EQTNOR0ptTmpRdFpUUXpZUzAwTlRsaExXSXlZVGt0Wmpsak1tVmxOekJpTkdWaCJ9"

echo [3/3] Pyrophorus Masaüstü Uygulaması başlatılıyor...
start /min "Pyrophorus Client" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ========================================================
echo   TUM SERVISLER BASARIYLA AYAGA KALDIRILDI!
echo   Pencereleri kapatmadiginiz surece sistem 7/24 aktiftir.
echo ========================================================
echo.
pause
