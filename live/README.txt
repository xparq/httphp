HTTPHP - Instant low-tech PHP server for local dirs
(github.com/lunakid/httphp)


ABOUT

This web server tries to be flexible, convenient and generally easy-going
for *local* use. It doesn't pretend to be suitable for production use.
(The goal was not to create yet another (subtly non-)standard, vanilla 
HTTP server, only now in Node.js, just because it's hip and easy, but 
to exploit the one real advantage Node.js has even in low-traffic contexts: 
cheap flexibility and portability.)

- Ideal for multi-project local(-only) PHP (and non-PHP) development.
- One command, and the current dir is served on http://localhost.
  (Yep, several other such tools exist, but read on.)
- Re-launching the server for a port already used by a previous 
  HTTPHP instance will stop the old one first. (No need to bother 
  killing the running server manually.)
- Multiple "web root" dirs (via URL aliases).
- [!!TODO] Conveninent semi-automatic run-time reconfiguration. E.g., 
  it can add a new dir to the ones already being served (with the
  default URL path being the dirname, making it unique as needed).
  (You see? "Ideal for local development", I told you. Whenever you 
  just want to serve up some project dir instantly, and than switch 
  to another, I know of no simpler way than this.)
- Based on by Node.js (v0.10.25 included), so it's easy to tweak and
  port (e.g. across Windows and Linux).
  (Well, and it's also a bit slow then. Did I mention "for internal 
  use only"? NODE.js, compared to native-code servers, is fast only
  for I/O-bound high loads, which are not exactly typical for low-tech
  indie web hacking and other local cases that HTTPHP is meant to be 
  used for. For a low-traffic CGI setup, HTTP over  Javascript (even 
  over V8) is obviously slower than HTTP over 
  native code. It's quite tolerable, though.)
- Launches the PHP-CGI executable for .php files.
- Tested with PHP 5.4.14, on Windows XP, PHP 5.5.0RC1 on Debian.
- It could work non-locally, too, but who would want to risk that?
- This is a dirty little quick hack, so don't ask, don't look, just
  pick one and keep going...

(See CHANGES.txt for the development status.)


SETUP

- You'll need a working PHP-CGI installation on your PATH.
  Alternatively, you may also just copy it directly into the HTTPHP dir, 
  if you can deal with the dirty feeling and the sleepless nights that
  will come. Surprisingly, this is about all you need for a quick start:

	php-cgi.exe
	php5[ts].dll
	php.ini

- NODE.exe is included for Windows (XP). On other systems you'll need 
  Node.js installed.

- Copy the "live" dir to some place of your choice (and rename it as you 
  wish -- BTW, the reason I don't already call it "httphp" is because 
  it's within a project dir called "httphp" on my local machine, and I'd 
  prefer dying to creating a subdir under another dir called the same.
  Never trust people who do that! ;-o ).
  Put that dir on the PATH so you can execute `httphp` anywhere. Or just
  create shortcuts / launchers to it wherever you need.


USAGE

	httphp      <-- for serving the current dir as http://localhost/
	httphp -h   <-- for help


Enjoy!
lunakid
