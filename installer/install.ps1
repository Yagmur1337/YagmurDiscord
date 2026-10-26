# YagmurMelek DC Otomatik Kurulum Komut Dosyasi
# Bu komut dosyasi Windows Defender SmartScreen engellerini asarak en guncel YagmurMelek DC'yi kurar.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ErrorActionPreference = "Stop"
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  YagmurMelek Discord Hizli Kurulum      " -ForegroundColor Magenta
Write-Host "  Yagmures Holding Resmi Dagitimi        " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$tempExe = Join-Path $env:TEMP "YagmurMelekDcCli.exe"
$downloadUrl = "https://github.com/Yagmur1337/YagmurDiscord/releases/download/0.5.8/YagmurMelekDcCli.exe"

Write-Host "`n[1/3] En guncel YagmurMelek DC kurulum paketi indiriliyor..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $downloadUrl -OutFile $tempExe -UseBasicParsing

Write-Host "[2/3] Windows Defender SmartScreen engeli kaldiriliyor (Unblock-File)..." -ForegroundColor Yellow
Unblock-File -Path $tempExe -ErrorAction SilentlyContinue

Write-Host "[3/3] YagmurMelek DC kuruluyor..." -ForegroundColor Green
& $tempExe --install

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host " Tebrikler! YagmurMelek DC basariyla kuruldu! " -ForegroundColor Green
Write-Host " Discord'unuzu acip tum ozellikleri kullanabilirsiniz." -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Green
