@echo off

:: Uncomment this if you
::   - don't have your own working PHP installation (on the PATH) yet, and
::   - want to use the minimal PHP package distributed along with HTTPHP.
:: Also change it if you want to use a specific PHP installation (overriding PATH).
rem set PHPDIR=%~dp0..\php

if "%__httphp_recursion%"=="prevent" goto :EOF
set __httphp_recursion=prevent

if exist "%~dp0node.exe" goto launch_in_same_dir

:: This script is NOT in the server dir...
:: Our only hope is that it's on the PATH.
:no_node
echo HTTPHP: Please put this script (%0) to the HTTPHP server dir, 
echo and re-launch it (preferably via 'start').
goto :EOF


:launch_in_same_dir
:: Add the PHP dir to the path, if there's a PHP-CGI.exe there...
if exist "%PHPDIR%\php-cgi.exe" echo set PATH=%PHPDIR%;%PATH%
goto :eof
:: Shotime!
%~dp0node %~dp0httphp.js %1 %2 %3 %4 %5 %6 %7 %8 %9
goto :EOF
