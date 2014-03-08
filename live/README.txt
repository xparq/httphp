ABOUT

Low-tech local HTTP development server with PHP-CGI support

- Recommended for multi-project local (only) development purposes!
- Defaults to serving the current dir on http://localhost/
- Re-launching the server on a port that's already used by a previous 
  instance will stop the old one first. (No need to bother killing 
  the running server manually! You see? "Ideal for local development",
  where you just want to serve up a project dir instantly, for a try.
- Runs on Node.js (v0.10.25 included), so it's easy to tweak. (And 
  it's slow. Did I mention to use it for internal development only?)
- Uses PHP-CGI (it must be installed separately and be on the PATH).
- Tested with PHP 5.4.14, on Windows XP, PHP 5.5.0RC1 on Debian.

(See CHANGES.txt for the development status.)


SETUP

- You'll need a working PHP-CGI installation on your PATH. 

  Alternatively, you may also just copy it directly into this dir, if you 
  can deal with the "feeling dirty" sensation it may cause. Surprisingly, 
  this is all you need for a start:

	php.ini
	php-cgi.exe
	php5ts.dll

- Put this server dir on the PATH, too, or add some strater script or
  launcher icon, whatever fits you best, to execute `start` here.


USAGE:

Just 
	httphp


Enjoy!
Szabolcs Szasz (lunakid@gmail.com)
