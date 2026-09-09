@echo off
setlocal EnableExtensions
title Dezinstalare semnatura ITISTUL.RO
set "NUME=Mihai Zamfir"
set "DEST=%APPDATA%\Microsoft\Signatures"
echo.
echo   Se elimina semnatura "%NUME%" si se anuleaza setarile facute de instalator.
echo.
tasklist /FI "IMAGENAME eq OUTLOOK.EXE" 2>nul | find /I "OUTLOOK.EXE" >nul
if not errorlevel 1 ( echo   Inchide Outlook mai intai. & echo. & pause & exit /b 1 )
attrib -R "%DEST%\%NUME%.htm" >nul 2>&1
del /Q "%DEST%\%NUME%.htm" "%DEST%\%NUME%.rtf" "%DEST%\%NUME%.txt" >nul 2>&1
if exist "%DEST%\%NUME%_files" rmdir /S /Q "%DEST%\%NUME%_files" 2>nul
set "MS=HKCU\Software\Microsoft\Office\16.0\Common\MailSettings"
reg delete "%MS%" /v NewSignature   /f >nul 2>&1
reg delete "%MS%" /v ReplySignature /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Office\16.0\Outlook\Setup" /v DisableRoamingSignaturesTemporaryToggle /f >nul 2>&1
echo   Gata. Backup-urile raman in %DEST%\_backup_ITISTUL
echo.
pause
