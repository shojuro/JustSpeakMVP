@echo off
echo Installing Just Speak MVP dependencies...
echo.

echo Cleaning previous installations...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo.
echo Installing dependencies (this may take a few minutes)...
npm install --legacy-peer-deps

echo.
echo Installation complete!
echo.
echo To start the development server, run:
echo   npm run dev
echo.
pause