# Verschluesselt content/intern.md und baut die Seite neu.
#
# Das Passwort wird hier abgefragt, nicht in der Datei gespeichert und
# nicht in der Verlaufsliste von PowerShell abgelegt. Es verlaesst
# diesen Rechner nicht. Herauskommt assets/intern.enc.json, und die
# Datei besteht nur aus Chiffretext, sie darf ins Repo.
#
# Aufruf im Portfolio Ordner:   .\intern.ps1

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

if (-not (Test-Path "content\intern.md")) {
  Write-Host "content\intern.md fehlt. Erst den Inhalt anlegen, dann nochmal." -ForegroundColor Yellow
  exit 1
}

$sicher = Read-Host "Passwort fuer den internen Bereich" -AsSecureString
$klar = [System.Net.NetworkCredential]::new("", $sicher).Password

if ([string]::IsNullOrWhiteSpace($klar)) {
  Write-Host "Kein Passwort eingegeben, abgebrochen." -ForegroundColor Yellow
  exit 1
}

$pruef = Read-Host "Zur Sicherheit nochmal" -AsSecureString
$klar2 = [System.Net.NetworkCredential]::new("", $pruef).Password

if ($klar -ne $klar2) {
  Write-Host "Die beiden Eingaben stimmen nicht ueberein, abgebrochen." -ForegroundColor Yellow
  $klar = $null; $klar2 = $null
  exit 1
}

try {
  $env:INTERN_PASSWORT = $klar
  node build.mjs
}
finally {
  Remove-Item Env:INTERN_PASSWORT -ErrorAction SilentlyContinue
  $klar = $null
  $klar2 = $null
}

if (Test-Path "assets\intern.enc.json") {
  Write-Host ""
  Write-Host "Fertig. assets\intern.enc.json ist neu geschrieben." -ForegroundColor Green
  Write-Host "Diese Datei mit committen, sonst fehlt der Bereich auf der veroeffentlichten Seite."
}
