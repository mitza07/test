@echo off
setlocal EnableExtensions
title Dezinstalare semnaturi ITISTUL.RO
set "DEST=%APPDATA%\Microsoft\Signatures"
echo.
echo   Se elimina toate cele 21 de semnaturi ITISTUL.RO si setarile facute de instalator.
echo.
tasklist /FI "IMAGENAME eq OUTLOOK.EXE" 2>nul | find /I "OUTLOOK.EXE" >nul
if not errorlevel 1 ( echo   Inchide Outlook mai intai. & echo. & pause & exit /b 1 )
call :sterge "Mihai Zamfir"
call :sterge "Mihai Zamfir - Clasic"
call :sterge "Mihai Zamfir - Signet"
call :sterge "Mihai Zamfir - Puls"
call :sterge "Mihai Zamfir - Lux 1"
call :sterge "Mihai Zamfir - Lux 2"
call :sterge "Mihai Zamfir - Lux 3"
call :sterge "Mihai Zamfir - Lux 4"
call :sterge "Mihai Zamfir - Lux 5"
call :sterge "Mihai Zamfir - Lux 6"
call :sterge "Mihai Zamfir - Lux 7"
call :sterge "Mihai Zamfir - Lux 8"
call :sterge "Mihai Zamfir - Lux 9"
call :sterge "Mihai Zamfir - Rose"
call :sterge "Mihai Zamfir - Noir 1"
call :sterge "Mihai Zamfir - Noir 2"
call :sterge "Mihai Zamfir - Noir 3"
call :sterge "Mihai Zamfir - Mono 1"
call :sterge "Mihai Zamfir - Mono 2"
call :sterge "Mihai Zamfir - Mono 3"
call :sterge "Mihai Zamfir - Aur"
set "MS=HKCU\Software\Microsoft\Office\16.0\Common\MailSettings"
reg delete "%MS%" /v NewSignature   /f >nul 2>&1
reg delete "%MS%" /v ReplySignature /f >nul 2>&1
reg delete "%MS%" /v "Send Pictures With Document" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Office\16.0\Outlook\Setup" /v DisableRoamingSignaturesTemporaryToggle /f >nul 2>&1
echo   Gata. Backup-urile raman in %DEST%\_backup_ITISTUL
echo.
pause
exit /b 0
:sterge
attrib -R "%DEST%\%~1.htm" >nul 2>&1
del /Q "%DEST%\%~1.htm" "%DEST%\%~1.rtf" "%DEST%\%~1.txt" >nul 2>&1
if exist "%DEST%\%~1_files" rmdir /S /Q "%DEST%\%~1_files" 2>nul
echo   Eliminata: "%~1"
exit /b 0
