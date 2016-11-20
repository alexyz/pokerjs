@echo off
rem npm install http-server -g
set PATH=%PATH%;C:\Program Files\nodejs\;%USERPROFILE%\AppData\Roaming\npm
call http-server public
pause
