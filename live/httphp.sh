# Should set port to something >1000, if none explicitly requested.

serverdir=`dirname \`readlink $0\``

nodejs $serverdir/httphp.js $*
