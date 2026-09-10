@echo off
setlocal EnableExtensions
title Instalare semnaturi ITISTUL.RO

rem ---------------------------------------------------------------
rem  Instalator semnaturi Outlook - ITISTUL.RO / Mihai Zamfir
rem
rem  Instaleaza AMBELE semnaturi:
rem    "Mihai Zamfir"           - designul compact
rem    "Mihai Zamfir - Clasic"  - designul original, protejat
rem    "Mihai Zamfir - Signet"  - designul executiv, fara nicio imagine
rem    "Mihai Zamfir - Puls"    - bloc intunecat cu unda de semnal din celule, fara imagini
rem
rem  Implicita ramane cea compacta. Pentru ca implicita sa fie cea
rem  clasica, ruleaza:  INSTALEAZA-SEMNATURA.cmd clasic
rem  Pentru cea executiva:   INSTALEAZA-SEMNATURA.cmd signet
rem  Pentru Puls:            INSTALEAZA-SEMNATURA.cmd puls
rem  Pentru variantele fara nicio imagine, adauga:  fara-imagini
rem    ex.  INSTALEAZA-SEMNATURA.cmd clasic fara-imagini
rem
rem  Batch pur: fara PowerShell, fara ExecutionPolicy, fara drepturi
rem  de administrator. Scrie doar in profilul utilizatorului (HKCU).
rem ---------------------------------------------------------------

set "ROOT=%~dp0.."
set "DEST=%APPDATA%\Microsoft\Signatures"
set "LOG=%~dp0jurnal-instalare.txt"
> "%LOG%" echo ITISTUL.RO - jurnal instalare
>>"%LOG%" echo Data: %DATE% %TIME%
>>"%LOG%" echo Argumente: %*
>>"%LOG%" echo ROOT: %ROOT%
>>"%LOG%" echo DEST: %DEST%
set "SUB="
set "IMPLICITA=Mihai Zamfir"

for %%A in (%*) do (
  if /I "%%~A"=="banda-html" set "SUB=\varianta-banda-html"
  if /I "%%~A"=="clasic"       set "IMPLICITA=Mihai Zamfir - Clasic"
  if /I "%%~A"=="signet"       set "IMPLICITA=Mihai Zamfir - Signet"
  if /I "%%~A"=="puls"         set "IMPLICITA=Mihai Zamfir - Puls"
)

echo.
echo   ITISTUL.RO - instalare semnaturi Outlook
echo   ========================================
echo.

if not exist "%ROOT%\semnatura%SUB%\Mihai Zamfir.htm" (
  echo   [EROARE] Nu gasesc fisierele semnaturii.
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

rem  %DATE%/%TIME% depind de locale si pot contine caractere invalide in cai
set "STAMP=backup-%RANDOM%"
set "BK=%DEST%\_backup_ITISTUL\%STAMP%"

call :instaleaza "Mihai Zamfir"          "%ROOT%\semnatura%SUB%"        || goto :fail
call :instaleaza "Mihai Zamfir - Clasic" "%ROOT%\semnatura-clasic%SUB%" || goto :fail
rem  Signet nu are variante: e fara imagini prin constructie, deci nu primeste %SUB%
call :instaleaza "Mihai Zamfir - Signet" "%ROOT%\semnatura-signet"        || goto :fail
call :instaleaza "Mihai Zamfir - Puls"   "%ROOT%\semnatura-puls"          || goto :fail

rem --- semnatura implicita pentru mesaje noi si pentru raspunsuri ---
set "MS=HKCU\Software\Microsoft\Office\16.0\Common\MailSettings"
reg add "%MS%" /v NewSignature   /t REG_EXPAND_SZ /d "%IMPLICITA%" /f >nul 2>&1
reg add "%MS%" /v ReplySignature /t REG_EXPAND_SZ /d "%IMPLICITA%" /f >nul 2>&1
echo   Implicita pentru mesaje noi si raspunsuri: "%IMPLICITA%"

rem --- fara asta, Outlook trimite imaginile semnaturii ca legaturi
rem     file:///C:/Users/... catre discul local, in loc sa le atasseze inline
rem     in mesaj. Legatura e moarta la destinatar, deci imaginea nu apare.
reg add "%MS%" /v "Send Pictures With Document" /t REG_DWORD /d 1 /f >nul 2>&1
echo   Incorporarea imaginilor in mesaj activata (Send Pictures With Document).

rem --- semnaturile roaming (Microsoft 365) suprascriu fisierele locale ---
set "OS16=HKCU\Software\Microsoft\Office\16.0\Outlook\Setup"
reg add "%OS16%" /v DisableRoamingSignaturesTemporaryToggle /t REG_DWORD /d 1 /f >nul 2>&1
echo   Semnaturi roaming dezactivate (altfel cloud-ul suprascrie fisierul local).

>>"%LOG%" echo --- SUCCES ---  implicita: %IMPLICITA%
echo.
echo   GATA. Toate cele patru semnaturi sunt instalate.
echo   Le poti comuta oricand din Outlook, la compunerea unui mesaj:
echo     Message ^> Signature ^> alegi semnatura.
echo.
if not defined SUB (
  echo   Banda animata se incarca de pe GitHub, dintr-un repo public.
  echo   Nu trebuie urcata nicaieri. Daca un destinatar are imaginile oprite,
  echo   in locul ei ramane fundal curat, nu o imagine rupta.
  echo.
)
pause
exit /b 0

rem ---------------------------------------------------------------
:instaleaza
rem  %~1 = numele semnaturii, %~2 = folderul sursa
set "N=%~1"
set "S=%~2"
if not exist "%S%\%N%.htm" ( echo   [EROARE] Lipseste "%S%\%N%.htm" & exit /b 1 )

if exist "%DEST%\%N%.htm" (
  mkdir "%BK%" 2>nul
  copy /Y "%DEST%\%N%.*" "%BK%\" >nul 2>&1
  if exist "%DEST%\%N%_files" xcopy "%DEST%\%N%_files" "%BK%\%N%_files\" /E /I /Y /Q >nul 2>&1
)

rem  fisierele trebuie sa fie scriibile inainte de copiere
attrib -R "%DEST%\%N%.htm" >nul 2>&1

copy /Y "%S%\%N%.htm" "%DEST%\" >nul || exit /b 1
copy /Y "%S%\%N%.rtf" "%DEST%\" >nul || exit /b 1
copy /Y "%S%\%N%.txt" "%DEST%\" >nul || exit /b 1

rem  folderul companion "<nume>_files": Outlook citeste de aici imaginile
rem  semnaturii si le ataseaza inline (CID) in fiecare mesaj trimis.
if exist "%DEST%\%N%_files" rmdir /S /Q "%DEST%\%N%_files" 2>nul
if exist "%S%\%N%_files" (
  xcopy "%S%\%N%_files" "%DEST%\%N%_files\" /E /I /Y /Q >nul || exit /b 1
)

rem  NU se pune read-only pe .htm. Protejeaza contra rescrierii de catre Word,
rem  dar impiedica Outlook sa incorporeze imaginea semnaturii in mesaj: un
rem  fisier pe care nu-l poate rescrie ramane cu legatura file:/// catre disc,
rem  moarta la destinatar. Formatarea conteaza mai putin decat banda lipsa.
attrib -R "%DEST%\%N%.htm" >nul 2>&1
echo   Instalata: "%N%"
>>"%LOG%" echo OK   instalata: %N%  (sursa: %S%)
exit /b 0

:fail
echo.
echo   [EROARE] Instalarea a esuat.
echo.
rem  Diagnostic scris in jurnal: fara el, o instalare esuata nu lasa nicio urma
rem  din care sa se poata afla cauza.
>>"%LOG%" echo --- ESEC ---
>>"%LOG%" echo Ultimul cod de eroare: %ERRORLEVEL%
for %%F in ("%ROOT%\semnatura%SUB%" "%ROOT%\semnatura-clasic%SUB%") do (
  if exist "%%~F" (>>"%LOG%" echo OK   sursa exista: %%~F) else (>>"%LOG%" echo LIPSA sursa: %%~F)
)
if exist "%DEST%" (>>"%LOG%" echo OK   destinatia exista) else (>>"%LOG%" echo LIPSA destinatia: %DEST%)
tasklist /FI "IMAGENAME eq OUTLOOK.EXE" 2>nul | find /I "OUTLOOK.EXE" >nul
if not errorlevel 1 (>>"%LOG%" echo ATENTIE Outlook inca ruleaza) else (>>"%LOG%" echo OK   Outlook e inchis)
>>"%LOG%" dir /B "%DEST%" 2>&1
echo   Am scris un jurnal cu detalii aici:
echo     %LOG%
echo   Trimite-l mai departe daca ai nevoie de ajutor.
echo.
pause
exit /b 1
