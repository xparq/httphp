HTTPHP - Instant minimalistic low-tech PHP server for local dirs
(github.com/lunakid/httphp)


ABOUT

This simple, but pretty functional and robust HTTP server tries to be
as be flexible, convenient and generally easy-going for *local* use, 
as possible. 

It doesn't pretend to be suitable for production use. The goal was not 
to create yet another (subtly non-)standard, vanilla HTTP server, only 
now in Node.js, just because it's hip and easy, but to exploit the one 
real advantage of Node.js in low-traffic contexts: cheap flexibility 
and portability. (OK, that's actually two advantages.) 

The deal:

- Ideal for multi-project local PHP (and general web) development,
  where one frequently switches between web dirs within one work (or
  login) session.
- One command, and the current dir is served on http://localhost.
  (Yep, several other such tools exist, but read on.)
- Re-launching the server for a port already used by a previous 
  HTTPHP instance will stop the old one first. (No need to bother 
  killing the running server manually.)
- Or, it can also add another web dir (with -a).
- "Poor man's SEF URLs": optionally redirect 404 errors to dir index.
- [!!TODO] Conveninent semi-automatic run-time reconfiguration. E.g., 
  it can add a new dir to the ones already being served (with the
  default URL path being the dirname, making it unique as needed).
  (You see? "Ideal for local development", I told you. Whenever you 
  just want to serve up some project dir instantly, and than switch 
  to another, I know of no simpler way than this.)
- Built on Node.js (v0.10.25 included), so it's easy to tweak and
  port (e.g. across Windows and Linux).
  (Well, and it's also a bit slow then. Did I mention "for internal 
  use only"? NODE.js, compared to native-code servers, is fast only
  for I/O-bound high loads, which are not exactly typical for low-tech
  indie web hacking and other local cases that HTTPHP is meant to be 
  used for. For a low-traffic CGI setup, HTTP over  Javascript (even 
  over V8) is obviously slower than HTTP over 
  native code. It's quite tolerable, though.)
- Launches the PHP-CGI executable for .php files.
- Tested with PHP 5.4.14, on Windows XP & 7, PHP 5.5.1 on Debian.
- It could work non-locally, too, but who would want to risk that?
- This is just a bit of a quick hack, so don't ask, don't look, just
  pick one and keep going...

(See CHANGES.txt for the development status.)


SETUP

- Just download, unpack, and put the "live" dir on the PATH, or otherwise 
  make sure you can run `httphp.cmd` or `httphp.sh`.

  Optionally move/rename the "live" dir to somewhere/something you like. 
  (BTW, the reason I don't already call it "httphp" is because it's already
  within a project dir called "httphp", and I'd prefer dying alone in a 
  musty dungeon to creating a subdir under another one called the same.
  Never trust people who do that! ;-o )

Prerequisites (pre-packaged for Windows):

- NODE.exe is included here for Windows (XP and above). On other systems 
  you'll need Node.js installed. (E.g. "nodejs" package on Debian/Ubuntu.)

- PHP: Preferably, just put a working PHP-CGI installation on your PATH.

  On Linux: just install the "php5-cgi" package (on most distributions), 
  that should be the least painful way. (It won't (shouldn't) pull in heavy
  dependences like Apache, MySQL or other such crap on any decent system.)

  On Windows: you may also copy any working PHP installation (e.g. the 
  bare-metal survival kit accompanying this package) either simply into
  this "live" dir (as "live/php", or even just pour the PHP stuff directly 
  into "live", if you can deal with the dirty feeling and the sleepless 
  nights that'll come), or just leave next to it ("live/../php", i.e. 
  within the parent dir of "live", as in the HTTPHP download package). 

  Or, to keep your hands clean: if you still don't want PHP on the PATH, 
  just change `set PHPDIR=...` in `httphp.cmd` to wherever you have it.)

  Surprisingly, this is about all you need for a quick start (no extensions,
  though):

	php-cgi.exe
	php5[ts].dll
	php.ini

USAGE

  If you put the server dir on the PATH, you can just execute `httphp` 
  (or `httphp.sh`) anywhere. By default, it will serve up the current dir:
  
	httphp      <- serve the current dir as http://localhost/
	httphp -h   <- for help

  If you don't use the console all that much and/or don't want to type 
  even this much, a handy way is creating shortcut/launcher scripts (or 
  widgets, shortcut icons etc.) into (or for) the dirs you may want to 
  serve, so that you can just hit Enter or click on them to go.


Enjoy!
lunakid
