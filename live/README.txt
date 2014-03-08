HTTPHP - Instant low-tech PHP server for local dirs

ABOUT

- Ideal for multi-project local(-only) PHP development purposes.
- One command, and the current dir is served on http://localhost.
- Re-launching the server on a port that's already used by a previous 
  HTTPHP instance will stop the old one first. (No need to bother 
  killing the running server manually. You see? "Ideal for local 
  development", I told you. Whenever you just want to serve up some
  project dir instantly, and than switch to another, there is no
  simpler way than this.)
- Runs on Node.js (v0.10.25 included), so it's easy to tweak. (And 
  it's also slow. Did I mention to use it for internal development 
  only? Yeah, NODE.js is fast, but only for I/O-bound high loads, 
  which are not typical for the low-tech indie web hackers HTTPHP is
  made for. For random low-traffic loads, well, HTTP over JS is slower 
  even on V8 than than HTTP over native code. It's quite tolerable, 
  though.)
- Uses PHP-CGI (it must be installed separately and be on the PATH).
- Tested with PHP 5.4.14, on Windows XP, PHP 5.5.0RC1 on Debian.
- It could work non-locally, too, but who would want to do that?
- This is a dirty little quick hack, so don't ask, don't look, keep 
  going.

(See CHANGES.txt for the development status.)


SETUP

- You'll need a working PHP-CGI installation on your PATH.
  Alternatively, you may also just copy it directly into the HTTPHP dir, 
  if you can deal with the dirty feeling and the sleepless nights that
  will come. Surprisingly, this is about all you need for a quick start:

	php-cgi.exe
	php5ts.dll
	php.ini

- NODE.exe is included for Windows, but you'll need NODE.js installed on 
  Linux.

- Copy the "live" dir to some place of your choice (and rename it as you 
  wish -- BTW, the only reason I don't already call it "httphp" is because 
  it's within a project dir called "httphp" on my local machine, and I'd 
  prefer dying to creating a subdir under another dir called the same...
  Never trust people who do that! ;-o ).
  Put that dir on the PATH so you can execute `httphp` anywhere. Or just
  create shortcuts / launchers to it wherever you need.


USAGE

	httphp      <-- for serving the current dir as http://localhost/
	httphp -h   <-- for help


Enjoy!
lunakid
