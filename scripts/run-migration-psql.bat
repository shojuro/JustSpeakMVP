@echo off
REM Script to run migration 002_esl_corrections.sql using psql
REM Creates user_progress and corrections tables in Supabase

setlocal enabledelayedexpansion

REM Get the directory of this script
set SCRIPT_DIR=%~dp0

REM Load DATABASE_URL from .env file
set ENV_FILE=%SCRIPT_DIR%..\.env
set DATABASE_URL=

REM Read DATABASE_URL from .env file
for /f "tokens=1,* delims==" %%a in ('type "%ENV_FILE%" ^| findstr "^DATABASE_URL="') do (
    set DATABASE_URL=%%b
)

REM Check if DATABASE_URL was found
if "%DATABASE_URL%"=="" (
    echo Error: DATABASE_URL not found in .env file
    exit /b 1
)

REM Path to migration file
set MIGRATION_FILE=%SCRIPT_DIR%..\supabase\migrations\002_esl_corrections.sql

REM Check if migration file exists
if not exist "%MIGRATION_FILE%" (
    echo Error: Migration file not found at %MIGRATION_FILE%
    exit /b 1
)

echo Running migration 002_esl_corrections.sql...
echo Migration file: %MIGRATION_FILE%
echo Database: Supabase PostgreSQL
echo.

REM Run the migration using psql
psql "%DATABASE_URL%" -f "%MIGRATION_FILE%"

REM Check if the command was successful
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Migration completed successfully!
    echo.
    echo Created tables:
    echo   - corrections ^(for storing error analysis^)
    echo   - user_progress ^(for tracking improvement^)
    echo.
    echo Row Level Security policies applied
    echo Indexes created for performance
    echo Helper function update_user_progress created
) else (
    echo.
    echo Migration failed. Please check the error messages above.
    exit /b 1
)