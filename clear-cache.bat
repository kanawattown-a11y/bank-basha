@echo off
echo ===================================
echo   Clearing Next.js Cache
echo ===================================
echo.

echo [1/3] Stopping dev server...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo [2/3] Deleting .next folder...
if exist .next (
    rmdir /S /Q .next
    echo ✓ .next folder deleted
) else (
    echo ✓ .next folder not found (already clean)
)

echo [3/3] Starting dev server...
echo.
echo ===================================
echo   Running: npm run dev
echo ===================================
echo.
npm run dev
