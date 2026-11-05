@echo off
TITLE Vikas Message Automator - Dev & Background Server
COLOR 0A

echo ===============================================================================
echo            VIKAS MESSAGE AUTOMATOR - LOCAL ENGINE START
echo                 Vikas Automobiles, Satna, M.P.
echo                 Contact: 9827003016
echo ===============================================================================
echo.
echo Starting local Express server and WhatsApp pacing engine...
echo Port: 3000
echo.
echo NOTE: Keep this terminal window open while using the application so that
echo local background message queues and auto-replies continue running.
echo.

start http://localhost:3000
npm run dev
