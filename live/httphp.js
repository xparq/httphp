/*
TODO:

+ FIX backslash in SCRIPT_NAME, PHP_SELF etc. 
  Seems wrong only for files directly in SERVER_DOC_ROOT but not in subdirs.
  See the prj browser at P:\, or e.g. 
  http://neurowebltd.co.uk/homewatch/mobil-kisvarda/_custom_/test/p.php)
+ Cookies? Sessions? Check!
+ PHP internal ?=PHPxxx URIs fail with surplus slashes (like //index.php)
*/

var VERSION = "1.01"

// Server config:
var SERVER_PORT = 80
var SERVER_HOST = "127.0.0.1"
var SERVER_DOC_ROOT = "."
var SERVER_INDEX_FILES = "index.html, index.php"

// URI -> dir ("alias") map. Will be set after processing the args!
var dirmap = {}

// Stealing from: http://trac.nginx.org/nginx/browser/nginx/conf/mime.types
var map_ext_to_content_type = {
	".html":        "text/html",
	".htm":		"text/html",
	".js":		"application/javascript",
	".css":		"text/css",
	".jpg":		"image/jpeg",
	".jpeg":	"image/jpeg",
	".png":		"image/png",
	".gif":		"image/gif",
	".ico":		"image/x-icon",
	".txt":		"text/plain",
}

function show_help() {
	console.log("HTTPHP v"+VERSION+" - Instant low-tech PHP server for local dirs")
	console.log("")       
	console.log("httphp           : Serve the current dir as http://localhost/")
	console.log("        -h       : Show this help (and exit).")
	console.log("        -p NUM   : Serve on port NUM instead of 80.")
	console.log("        -d DIR   : Serve DIR instead of '.'")
	console.log("        -i FILES : Try the given (comma-separated) file names")
	console.log("                   (in the given order) as default index files")
	console.log("                   (instead of `index.html,index.php`)")
}


// Options to override the defaults:
// -p port
// -d webdir
// -i default index files (file1,...)
var param_of = null
process.argv.forEach(function (arg, i, array) {
	switch (arg) {

	case '-h':
		show_help()
	        process.exit()

	case '-p': param_of = '-p'
		return
	case '-d': param_of = '-d'
		return
	case '-i': param_of = '-i'
		return
	}

	switch (param_of) {
	case '-p':
		SERVER_PORT = arg
		notice("SERVER_PORT changed to '" + SERVER_PORT + "'")
		param_of = null
		break
	case '-d':
		SERVER_DOC_ROOT = arg
		notice("SERVER_DOC_ROOT changed to '" + SERVER_DOC_ROOT + "'")
		param_of = null
		break
	case '-i':
		SERVER_INDEX_FILES = arg
		notice("SERVER_INDEX_FILES changed to '" + SERVER_INDEX_FILES + "'")
		param_of = null
		break
	}			
});
if (param_of) {
	err("malformed command-line (near '"+ param_of +"')");
	return
}


// Now we can set this:
var dirmap = {
	'/': SERVER_DOC_ROOT,
}

var Http = require('http')
var Path = require("path")  
var Url = require("url")
var Fs = require("fs")
//var Util = require("util")


function log(request, urlpath, localpath, result, note) {
	console.log("HTTP: "+ request.method +" "+ request.url +" [mapped to: "+ localpath +"] - "+ result + " "+ note)
}

function err(msg) {
	console.log("HTTP: error: "+ msg)
}
function warn(msg) {
	console.log("HTTP: warning: "+ msg)
}
function notice(msg) {
	console.log("HTTP: notice: "+ msg)
}

function respond_404(request, response, reqpath, file_to_serve_fullpath) {
	if (typeof(file_to_serve_fullpath) == 'undefined') file_to_serve_fullpath = '?'
	response.writeHeader(404, {"Content-Type": "text/plain"})
	response.write("404 Not Found\n")
	response.end()
	log(request, reqpath, file_to_serve_fullpath, 404, "Not Found")
}


// Check each dir in the dir map
//!! Since we'll have to handle filesystem errors for each individual request
//!! anyway, this checking here is nothing more than just a vague example.
var keys = dirmap.keys
for (d in dirmap) {
	var dir = dirmap[d]
	console.log("Checking server dir '" + dir + "'")
	if (!Fs.existsSync(dir)) {
		err("Cannot serve non-existing dir '"+ dir +"', exiting...")
		return
	}
}


// 0. Precondition: each key in dirmap must end with a trailing slash.
// 1. Take each alias 'a' from dirmap, in their set order.
// 2. If uri_path.indexOf(a) == 0, then return dirmap[a].
// 3. Else return dirmap['/'].
/*
function get_root_dir_for_uri_path(uri_path) {
	if (uri_prefix in dirmap && uri_path.indexOf(a) == 0)
		return dirmap[uri_prefix]
	else
		return dirmap['/']
}
*/

// Based on: http://www.hongkiat.com/blog/node-js-server-side-javascript/
var server = Http.createServer(function(request, response) {
	var requri = Url.parse(request.url)
	var reqpath = requri.pathname || '/'
	var file_to_serve = reqpath
	var file_to_serve_fullpath = ''
	var file_ext = ''

	//!!EXPERIMENTAL:
	if (/*requri.protocol == 'ctrl:' ||*/ request.url.indexOf('ctrl:stop!') > -1) {
		notice("STOP! (Requested by ["+request.url+"] (!!source tracking not implemented!!)");

		response.writeHeader(200)
		response.write("Cheers!", "binary")
		response.end()

		// Give some time to the server for responding to the kill request...
		setTimeout(function () {
			        process.exit()
		}, 1000);

		return
	}



	// Check if the requested URI maps to an existing dir,
	// and append an index file if yes.
	// CHECK whether the appended index file also does 
	// exist. If not, bail out with 404.
	file_to_serve_fullpath = Path.join(SERVER_DOC_ROOT, file_to_serve)
	try {
		stats = Fs.statSync(file_to_serve_fullpath)//!!, function(err, stats) {
	} catch(err) {
		if (err.code == 'ENOENT') {
			//!! The uri may not exist as a file, but that's not an error!
			//!! BUT NOW, FOR DEBUBBING:
			respond_404(request, response, reqpath, file_to_serve_fullpath)
		} else {
			response.writeHeader(500, {"Content-Type": "text/plain"})
			response.write(err + "\n")
			response.end()
			log(request, reqpath, file_to_serve_fullpath, 500, "File stat() failed")
		}
		return;
	}

	if (stats.isDirectory()) {

		var INDIRECT_INDEX = null

		SERVER_INDEX_FILES.split(",").some(function(index) {
			file_to_serve          = Path.join(reqpath, index.trim())
			file_to_serve_fullpath = Path.join(SERVER_DOC_ROOT, file_to_serve)
			notice("trying index: '" + file_to_serve_fullpath +"'")
			if (Fs.existsSync(file_to_serve_fullpath)) {
				INDIRECT_INDEX = file_to_serve_fullpath
				return true
			}
		})
		if (!INDIRECT_INDEX) {
			err("no directory index found")
			respond_404(request, response, reqpath, file_to_serve_fullpath)
			return
		}
	}

	// NOTE: stats.isSymbolicLink() transparently handled by stat()
	if (stats.isFile() || INDIRECT_INDEX) {

		// Based on the php-cgi README:
		// Just use path instead of this:
		// reqdata = Url.parse(request.url, true);

		file_ext = Path.extname(file_to_serve)
		switch (file_ext) {

			case ".php":
				var phpCGI = require("./lib/php-cgi-sz");
				// This would force-use the 'php-bin-win32' Node.js package on Win32,
				// which would causing an error if not installed, instead of just using 
				// the default "php-cgi".
				//  phpCGI.detectBinary();//on windows get a portable php to run.
				// --> CGI RFC: http://tools.ietf.org/html
				    phpCGI.env['REQUEST_URI'] = request.url; // PHP-specific
				    phpCGI.env['DOCUMENT_ROOT'] = SERVER_DOC_ROOT + Path.sep;
				    phpCGI.env['SERVER_PORT'] = SERVER_PORT;
				    phpCGI.env['SERVER_NAME'] = request.headers.host;

				    phpCGI.process(file_to_serve, request, response, function(statuscode, errmsg) {
					log(request, reqpath, file_to_serve_fullpath, statuscode, "(via PHP-CGI)")
					switch (statuscode) {
					case 500:
						response.write("HTTP error 500 ("+errmsg+")")
						break
					}
					response.end()
				    });

				break;

			default:
				Fs.readFile(file_to_serve_fullpath, "binary", function(err, file) {

					if (!err) {
						response.setHeader("Content-Type", map_ext_to_content_type[file_ext]);
						response.writeHeader(200)
						response.write(file, "binary")
						response.end()
						log(request, reqpath, file_to_serve_fullpath, 200, "OK")

					} else if (err.code == 'ENOENT') {

						respond_404(request, response, reqpath, file_to_serve_fullpath)

					} else {

						response.writeHeader(500, {"Content-Type": "text/plain"})
						response.write(err + "\n")
						response.end()
						log(request, reqpath, file_to_serve_fullpath, 500, "File Error")
					}
				})
		}

        } else {
//console.log("hello" + request.url)
		respond_404(request, response, reqpath, file_to_serve_fullpath)
	}

//!!    })
})


var server_listening_ok = false
var kill_request_sent = false

server.on('error',function(e){
	if (e.code == 'EADDRINUSE') {
		err("Port "+ SERVER_PORT +" is already used. Trying to take over...");

		//http://nodejs.org/api/http.html#http_http_get_options_callback
		Http.get("http://"+SERVER_HOST+":"+SERVER_PORT+"/?ctrl:stop!", function(res) {
			notice("Response to the STOP req.: " + res.statusCode);
		}).on('error', function(e) {
			// Connection reset is expected if we kill the server ;)
			if (e.code != 'ECONNRESET') {
				err("'"+ e.message +"' while trying to reclaim server port.");
			}
		});

		setTimeout(function () {
			// Let's retry, regardless of the response:
			server.listen(SERVER_PORT, SERVER_HOST)
			// Wait for it to probably finish:
			setTimeout(function () {
				if (!server_listening_ok) {
					err("Couldn't reclaim server port.");
				        process.exit()
				}
			}, 500);
		}, 2000);
	}
})

server.on('listening',function(){
	server_listening_ok = true
	console.log("HTTP: Server started at http://"+ SERVER_HOST + ":" + SERVER_PORT + "/ (serving dir: "+ Path.resolve(SERVER_DOC_ROOT) +")")
	//Util.puts("Server Running on port " + SERVER_PORT);
	// Sys.puts("Sys.puts vs. Util.puts vs. console.log?...");  
})

server.listen(SERVER_PORT, SERVER_HOST)
