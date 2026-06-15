@echo off
cd /d C:\Projets\leadharvest

echo [1/4] Suppression du fichier index.lock...
if exist .git\index.lock (
    del /f .git\index.lock
    echo      OK - lock supprime
) else (
    echo      Pas de lock, on continue
)

echo [2/4] Git add...
git add app/api/enrich/scrape/route.js

echo [3/4] Git commit...
git commit -m "feat: email enrichment — scraping + generation algorithmique + MX"

echo [4/4] Deploy Vercel...
npx vercel --prod

echo.
echo === DEPLOY TERMINE ===
pause
