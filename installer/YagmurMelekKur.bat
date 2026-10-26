@echo off
chcp 65001 >nul
title YagmurMelek Discord Kurulumu - Yagmures Holding
echo ===================================================
echo   YagmurMelek Discord Hizli Kurulum (SmartScreen Korumali)
echo   Yagmures Holding
echo ===================================================
echo.

set "EXE_FILE=%~dp0YagmurMelekDcInstaller.exe"

if exist "%EXE_FILE%" (
    echo [1/2] Windows Defender SmartScreen engeli kaldiriliyor...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -Path '%EXE_FILE%' -ErrorAction SilentlyContinue"
    
    echo [2/2] YagmurMelek Kurulum Yoneticisi baslatiliyor...
    start "" "%EXE_FILE%"
) else (
    echo [!] YagmurMelekDcInstaller.exe bulunamadi!
    echo Otomatik olarak indiriliyor ve baslatiliyor...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $dest = Join-Path $env:TEMP 'YagmurMelekDcInstaller.exe'; Invoke-WebRequest -Uri 'https://github.com/Yagmur1337/YagmurDiscord/releases/download/0.5.8/YagmurMelekDcInstaller.exe' -OutFile $dest -UseBasicParsing; Unblock-File -Path $dest; Start-Process $dest"
)

echo.
echo Kurulum ekrani acildi. Bu pencereyi kapatabilirsiniz.
timeout /t 3 >nul
exit
