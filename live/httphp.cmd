@echo off

:: Uncomment (and change) this if you want to force using a specific 
:: PHP installation dir (overriding the one on the PATH, if any):
rem set PHPDIR=c:\php

::
:: Lucky you, only I may need to mess with the crap below!
::

if "%__httphp_recursion%"=="prevent" goto :EOF
set __httphp_recursion=prevent

if exist "%~dp0node.exe" goto launch_in_node_dir

:: This script is NOT in the server dir...
:: Our only hope is that it's on the PATH.
:no_node
echo HTTPHP: Please put this script (%0) to the HTTPHP server dir, 
echo and re-launch it (preferably via 'start').
goto :EOF


:launch_in_node_dir

:: Find a PHP instance to use...
:try_php
:: 10 Check if there is an override (PHPDIR set):
:: 20	yes: add it to the PATH
:: 30	(no: continue)
if not "%PHPDIR%" == "" PATH=%PHPDIR%;%PATH%
:: 40 Check if PHP is on the PATH (errorlevel 1 if none)
php-cgi -v 2> nul > nul
:: 50	yes: DONE (PHP OK)
if not errorlevel 1 goto php_done
:: 60	no: check if there is a override:
:: 70       	yes: DONE (NO PHP)
if not "%PHPDIR%" == "" goto php_done_none
:: 80		no: set default override(s)
if not exist "%~dp0\php-cgi.exe" goto php_not_here
	set PHPDIR=%~dp0
	goto try_php
:php_not_here
if not exist "%~dp0php\php-cgi.exe" goto php_not_under
	set PHPDIR=%~dp0php
	goto try_php
:php_not_under
:: (80)         (fall back to the downloaded dir layout)
if not exist "%~dp0..\php\php-cgi.exe" goto php_done_none
	set PHPDIR=%~dp0..\php
	goto try_php

:php_done_none
echo HTTPHP.cmd: Warning: Running with no PHP support (no PHP-CGI.EXE on the PATH)!

:php_done
:: Showtime!
%~dp0node %~dp0httphp.js %1 %2 %3 %4 %5 %6 %7 %8 %9
