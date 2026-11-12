@echo off
chcp 65001 >nul
title Nebuchadnezzar ^& Daniel 2 Colossus 3D Experience
cd /d "%~dp0"
echo ========================================================
echo  Bible Artifacts — cover, study desk, and 3D gallery
echo  Local Python server — Meshopt GLBs, no internet required
echo ========================================================
echo.
where py >nul 2>nul
if not errorlevel 1 (
  py -3 server.py
  goto done
)
where python >nul 2>nul
if not errorlevel 1 (
  python server.py
  goto done
)
echo Python 3 was not found. Install it from https://www.python.org/downloads/ and run this file again.
:done
pause
