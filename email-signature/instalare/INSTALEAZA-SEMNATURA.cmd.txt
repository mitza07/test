@echo off
setlocal EnableExtensions
title Instalare semnatura ITISTUL.RO

rem ---------------------------------------------------------------
rem  Instalator semnatura Outlook - ITISTUL.RO / Mihai Zamfir
rem  Batch pur: fara PowerShell, fara ExecutionPolicy, fara drepturi
rem  de administrator. Scrie doar in profilul utilizatorului (HKCU).
rem ---------------------------------------------------------------

set "NUME=Mihai Zamfir"
set "SURSA=%~dp0..\semnatura"
set "DEST=%APPDATA%\Microsoft\Signatures"

echo.
echo   ITISTUL.RO - instalare semnatura Outlook
echo   ========================================
echo.

rem --- implicit se instaleaza varianta grafica animata;
rem     "INSTALEAZA-SEMNATURA.cmd fara-imagini" instaleaza varianta statica
set "VARIANTA=animata"
if /I "%~1"=="fara-imagini" (
  set "SURSA=%~dp0..\semnatura\varianta-fara-imagini"
  set "VARIANTA=fara imagini"
)

if not exist "%SURSA%\%NUME%.htm" (
  echo   [EROARE] Nu gasesc "%SURSA%\%NUME%.htm".
  echo            Ruleaza acest fisier din folderul dezarhivat, nu din interiorul ZIP-ului.
  echo.
  pause
  exit /b 1
)

rem --- Outlook trebuie inchis, altfel suprascrie fisierele la iesire ---
tasklist /FI "IMAGENAME eq OUTLOOK.EXE" 2>nul | find /I "OUTLOOK.EXE" >nul
if not errorlevel 1 (
  echo   Outlook ruleaza. Inchide-l complet, apoi apasa o tasta.
  echo.
  pause
  tasklist /FI "IMAGENAME eq OUTLOOK.EXE" 2>nul | find /I "OUTLOOK.EXE" >nul
  if not errorlevel 1 (
    echo   [EROARE] Outlook inca ruleaza. Instalare oprita.
    echo.
    pause
    exit /b 1
  )
)

if not exist "%DEST%" mkdir "%DEST%" 2>nul

rem --- backup, daca exista deja o semnatura cu acest nume ---
rem  %DATE%/%TIME% depind de locale si pot contine caractere invalide in cai
set "STAMP=backup-%RANDOM%"
if exist "%DEST%\%NUME%.htm" (
  mkdir "%DEST%\_backup_ITISTUL" 2>nul
  mkdir "%DEST%\_backup_ITISTUL\%STAMP%" 2>nul
  copy /Y "%DEST%\%NUME%.*" "%DEST%\_backup_ITISTUL\%STAMP%\" >nul 2>&1
  if exist "%DEST%\%NUME%_files" xcopy "%DEST%\%NUME%_files" "%DEST%\_backup_ITISTUL\%STAMP%\%NUME%_files\" /E /I /Y /Q >nul 2>&1
  echo   Semnatura veche salvata in: %DEST%\_backup_ITISTUL\%STAMP%
)

rem --- fisierele trebuie sa fie scriibile inainte de copiere ---
attrib -R "%DEST%\%NUME%.htm" >nul 2>&1

copy /Y "%SURSA%\%NUME%.htm" "%DEST%\" >nul || goto :fail
copy /Y "%SURSA%\%NUME%.rtf" "%DEST%\" >nul || goto :fail
copy /Y "%SURSA%\%NUME%.txt" "%DEST%\" >nul || goto :fail

rem --- folderul companion "<nume>_files": Outlook citeste de aici imaginile
rem     semnaturii si le ataseaza inline (CID) in fiecare mesaj trimis.
rem     Fara el, in locul benzii ramane fundalul bleumarin.
if exist "%SURSA%\%NUME%_files" (
  if exist "%DEST%\%NUME%_files" rmdir /S /Q "%DEST%\%NUME%_files" 2>nul
  xcopy "%SURSA%\%NUME%_files" "%DEST%\%NUME%_files\" /E /I /Y /Q >nul || goto :fail
  echo   Banda animata copiata in: %DEST%\%NUME%_files
)
echo   Fisiere copiate in: %DEST%

rem --- Outlook rescrie .htm prin serializatorul Word la fiecare Save din
rem     dialogul Signatures, ceea ce strica formatarea. Read-only opreste asta.
rem     Se anuleaza cu:  attrib -R "%%APPDATA%%\Microsoft\Signatures\%NUME%.htm"
attrib +R "%DEST%\%NUME%.htm" >nul 2>&1

rem --- semnatura implicita pentru mesaje noi si pentru raspunsuri ---
set "MS=HKCU\Software\Microsoft\Office\16.0\Common\MailSettings"
reg add "%MS%" /v NewSignature   /t REG_EXPAND_SZ /d "%NUME%" /f >nul 2>&1
reg add "%MS%" /v ReplySignature /t REG_EXPAND_SZ /d "%NUME%" /f >nul 2>&1
echo   Setata ca semnatura implicita (mesaje noi + raspunsuri).

rem --- semnaturile roaming (Microsoft 365) suprascriu fisierele locale ---
set "OS16=HKCU\Software\Microsoft\Office\16.0\Outlook\Setup"
reg add "%OS16%" /v DisableRoamingSignaturesTemporaryToggle /t REG_DWORD /d 1 /f >nul 2>&1
echo   Semnaturi roaming dezactivate (altfel cloud-ul suprascrie fisierul local).

echo.
echo   GATA. Varianta instalata: %VARIANTA%
echo   Deschide Outlook si trimite-ti un e-mail de test.
echo.
if /I not "%~1"=="fara-imagini" (
  echo   Banda animata este atasata inline in fiecare mesaj, direct de Outlook.
  echo   Nu trebuie urcata nicaieri si nu se poate bloca de client.
  echo.
)
echo   Daca semnatura nu apare: Outlook ^> File ^> Options ^> Mail ^> Signatures
echo   si alege "%NUME%" la "New messages" si "Replies/forwards".
echo.
pause
exit /b 0

:fail
echo.
echo   [EROARE] Copierea a esuat. Verifica daca Outlook este inchis.
echo.
pause
exit /b 1
