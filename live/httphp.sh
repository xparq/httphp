# Should set port to something >1000, if none explicitly requested.

serverdir=`dirname \`readlink -f $0\``

nodejs $serverdir/httphp.js $*
