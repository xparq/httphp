@echo off

if "%__httphp_recursion%"=="prevent" goto :EOF
set __httphp_recursion=prevent

if exist "%~dp0node.exe" goto launch_in_same_dir

:: This script is NOT in the server dir...
:: Our only hope is that it's on the PATH.
:no_node
echo HTTPHP: Please put this script (%0) to the HTTPHP server dir, 
echo and re-launch it.
goto :EOF


:launch_in_same_dir
%~dp0node %~dp0httphp.js %1 %2 %3 %4 %5 %6 %7 %8 %9
goto :EOF
