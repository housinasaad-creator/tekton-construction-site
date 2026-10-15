@echo off
chcp 65001 >nul
echo Serving TEKTON at http://localhost:3600  (Ctrl+C to stop)
start "" http://localhost:3600/
python -m http.server 3600
