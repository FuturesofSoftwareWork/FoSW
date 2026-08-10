@echo off
REM Look at the radar as the preview deployment will serve it: build with drafts
REM on, serve it, run the radar checks, stay up until you press Ctrl+C.
REM
REM Double-click this, or run it from any shell. It goes through cmd.exe, which
REM neither rewrites the /FoSW/preview/ base the way MSYS does in Git Bash nor
REM applies PowerShell's script-signing policy.
REM
REM Same thing as: npm run preview:radar
REM Arguments are passed through, e.g.  preview.bat --no-build --port 4200

cd /d "%~dp0"
call npm run preview:radar -- %*

REM Keep the window open when double-clicked so a failure is readable.
if errorlevel 1 pause
