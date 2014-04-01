// Product:
var NAME = "HTTPHP"
var VERSION = "1.06"

// Default server config:
var SERVER_PROTOCOL = "http"
var SERVER_PORT = 80
var SERVER_HOST = "127.0.0.1"
var SERVER_DOC_ROOT = "."
var SERVER_INDEX_FILES = "index.html, index.php, README.txt, README.md, default.html, index.htm"
// This is stupid, but noone will care for the time being. 
// Vastly more stupid things are to be found here already. ;)
var SERVER_LOG_FILTER = ['debug'/*, 'notice'*/] // block some noise (debug, notice, warning, error)

// URI -> dir ("alias") map. Will be set after processing the args!
//!! (How this relates to the legacy SERVER_DOC_ROOT is not 100% clear yet. 
//!! For now '/' -> SERVER_DOC_ROOT is the only default alias map entry, and
//!! SERVER_DOC_ROOT is, unfortunately, also used directly at several places
//!! "the" (only) legacy docroot value.)
var dirmap = {
	'/': SERVER_DOC_ROOT,
}

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

// Will set this after params processing:
var SERVER_URL_PREFIX = 'UNINITIALIZED!'

//---------------------------------------------------------------------------
// Helpers, utils. etc...
//---------------------------------------------------------------------------

function show_help() {
	console.log(NAME + "v"+VERSION+" - Instant low-tech PHP server for local dirs")
	console.log("")       
	console.log("httphp           : Serve the current dir as http://localhost/")
	console.log("        -h       : Show this help (and exit).")
	console.log("        -p NUM   : Serve on port NUM instead of 80.")
	console.log("        -d DIR   : Serve DIR instead of '.'")
	console.log("        -i FILES : Try the given (comma-separated) file names")
	console.log("                   (in the given order) as default index files")
	console.log("                   (instead of `index.html,index.php`)")
}


function log(msg) {
	var LOGPREFIX = ""	//"HTTPHP: "
	var TIMESTAMP = "["+Date.now()+"] "
	console.log(LOGPREFIX + TIMESTAMP + msg)
}

function log_http(request, urlpath, localpath, result, note) {
	log(request.method +" "+ request.url +" [mapped to: "+ localpath +"] - "+ result + " "+ note)
}

function log_err(msg) {
	log("ERROR: "+ msg)
}
function log_warn(msg) {
	if (SERVER_LOG_FILTER.indexOf('warn') == -1)
		log("WARNING: "+ msg)
}
function log_notice(msg) {
	if (SERVER_LOG_FILTER.indexOf('notice') == -1)
		log("notice: "+ msg)
}
function log_debug(msg) {
	if (SERVER_LOG_FILTER.indexOf('debug') == -1)
		log(">> DEBUG <<: "+ msg)
}


//---------------------------------------------------------------------------
// main...
//---------------------------------------------------------------------------
var Http = require('http')
var Path = require("path")  
var Url = require("url")
var Fs = require("fs")
//var Util = require("util")
var phpCGI = require("./lib/php-cgi-sz");

log("HTTPHP Server v" +VERSION+ " at "+__dirname+" started.")

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
		log_notice("SERVER_PORT set to '" + SERVER_PORT + "'")
		param_of = null
		break
	case '-d':
		SERVER_DOC_ROOT = arg
		log_notice("SERVER_DOC_ROOT set to '" + SERVER_DOC_ROOT + "'")
		param_of = null
		break
	case '-i':
		SERVER_INDEX_FILES = arg
		log_notice("SERVER_INDEX_FILES set to '" + SERVER_INDEX_FILES + "'")
		param_of = null
		break
	}			
});
if (param_of) {
	err("malformed command-line (near '"+ param_of +"')");
	return
}

// Set this for the request handler
//! NOTE: THESE CAN'T BE RECONFIGURED RUN-TIME, so enough to set it once.
SERVER_URL_PREFIX = SERVER_PROTOCOL + "://" + SERVER_HOST + ":" + SERVER_PORT


function respond_404(request, response, reqpath, file_to_serve_fullpath) {
	if (typeof(file_to_serve_fullpath) == 'undefined') file_to_serve_fullpath = '?'
	response.writeHeader(404, {"Content-Type": "text/plain"})
	response.write("404 Not Found\n")
	response.end()
	log_http(request, reqpath, file_to_serve_fullpath, 404, "Not Found")
}

// Check dirs in the dir map (for each or for a specific url)
function check_alias(dirmap, specific_url) {
//!! Since we'll have to handle filesystem errors for each individual request
//!! anyway, this checking here is nothing more than just a vague example.
//!! Then it's better to leave a broken alias on, since the user may want to
//!! fix it while the server is running.

	var url//, keys = dirmap.keys
	for (url in dirmap) {
		if (typeof(specific_url) === 'undefined' 
			|| url == specific_url) { // Make this check real: trim, substr. etc!
			var dir = dirmap[url]
			log_debug("Checking dir '" + dir + "'")
			if (!Fs.existsSync(dir)) {
				log_err("Cannot serve non-existing dir '"+ dir +"', exiting...")
				return
			}
		}
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
	//! sz: hostname is stripped from request.url

 	//!!HOW ABOUT DECODING THE QS TOO? Whose repsponsibility is that?
 	//!!Currently the PHP-CGI handler does it alone (from the raw request)

	var canonical_url = (SERVER_URL_PREFIX + request.url)
						.replace(/([^:\/])[\/]+([^\/])/g, '$1/$2') // - this is for:
						// [url.parse-crash] - Path.extname would fail if path starts with '//'!
						// [php-multislash-internals] - multiple slashes in PHP_SELF & SCRIPT_NAME break phpinfo()

	var parsed_uri = Url.parse(
						canonical_url/* still URL-encoded! */,
						false/* strip QS! */, 
						false/* canonical_url is absolute & unambiguous */
					)
	var reqpath = parsed_uri.pathname || '/'
	var file_to_serve = ''
	var file_to_serve_fullpath = ''
	var file_ext = ''

	log_debug("reqpath before decoding: " + reqpath)
	reqpath = decodeURIComponent(reqpath.replace(/\+/g, ' ')) //https://groups.google.com/forum/#!topic/nodejs/8P7GZqBw0xg
	file_to_serve = reqpath

//	log_debug('request.host: '+request.host)
	log_debug("canonical_url: " + canonical_url)
	log_debug("parsed_uri.host: " + parsed_uri.host)
	log_debug("parsed_uri.hostname: " + parsed_uri.hostname)
	log_debug("parsed_uri.pathname: " + parsed_uri.pathname)
	log_debug("parsed_uri.path: " + parsed_uri.path)
	log_debug("URI-path: " + parsed_uri.pathname)
//	log_debug("URI-path + QS: " + parsed_uri.path) //! QS has been stripped off
	log_debug("reqpath decoded: " + reqpath)
	log_debug("file_to_serve: " + file_to_serve)

	// Handle internal command requests (!!EXPERIMENTAL HACK YET!)
	if (request.url.indexOf("ctrl:stop!") > -1) {
		log_notice("STOP! (Requested by ["+request.url+"] (!!source tracking not implemented!!)");

		response.writeHeader(200)
		response.write("Cheers!", "binary")
		response.end()

		// Give some time to the server for responding to the kill request...
		setTimeout(function () {
			        process.exit()
		}, 1000);

		return
	}

	//
	// Locate the resource (generally a file) to serve...
	//
	file_to_serve_fullpath = SERVER_DOC_ROOT + file_to_serve
	log_debug('file_to_serve_fullpath: ' + file_to_serve_fullpath)

	try {
		stats = Fs.statSync(file_to_serve_fullpath)//!!, function(err, stats) {
	} catch(err) {
		if (err.code == 'ENOENT') {
			//!! The URL may map to an existing file, but that's not necessarily an error!
			//!! BUT NOW, FOR DEBUGGING:
			respond_404(request, response, reqpath, file_to_serve_fullpath)
		} else {
			response.writeHeader(500, {"Content-Type": "text/plain"})
			response.write(err + "\n")
			response.end()
			log_http(request, reqpath, file_to_serve_fullpath, 500, "File stat() failed")
		}
		return;
	}

	// Check if the request points to an existing dir, and
	// then append an index file if one exists in that dir.
	// If not, bail out with 404.
	if (stats.isDirectory()) {
		var INDIRECT_INDEX = null
		SERVER_INDEX_FILES.split(",").some(function(index) {
			file_to_serve          = Path.join(reqpath, index.trim())
			file_to_serve_fullpath = Path.join(SERVER_DOC_ROOT, file_to_serve)
			if (Fs.existsSync(file_to_serve_fullpath)) {
				INDIRECT_INDEX = file_to_serve_fullpath
				log_debug("using index file: '" + file_to_serve_fullpath +"'")
				return true
			} else {
				log_debug("index file not found: '" + file_to_serve_fullpath +"'")
			}
		})
		if (!INDIRECT_INDEX) {
			log_err("no directory index found")
			respond_404(request, response, reqpath, file_to_serve_fullpath)
			return
		}
	}

	log_debug("file_to_serve: " + file_to_serve)

	// NOTE: stats.isSymbolicLink() transparently handled by stat()
	if (stats.isFile() || INDIRECT_INDEX) {

		// Based on the php-cgi README:
		// Just use 'path' instead of Url.parse(request.url, true)

		file_ext = Path.extname(file_to_serve)
		log_debug("filename suffix: " + file_ext)

		switch (file_ext) {

			case ".php":
				    phpCGI.env['REQUEST_URI'] = request.url; // PHP-specific
				    phpCGI.env['DOCUMENT_ROOT'] = SERVER_DOC_ROOT + Path.sep;
				    phpCGI.env['SERVER_PORT'] = SERVER_PORT;
				    phpCGI.env['SERVER_NAME'] = request.headers.host;

				    phpCGI.process(file_to_serve, request, response, function(statuscode, errmsg) {
					log_http(request, reqpath, file_to_serve_fullpath, statuscode, "(via PHP-CGI)")
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
						log_http(request, reqpath, file_to_serve_fullpath, 200, "OK")

					} else if (err.code == 'ENOENT') {

						respond_404(request, response, reqpath, file_to_serve_fullpath)

					} else {

						response.writeHeader(500, {"Content-Type": "text/plain"})
						response.write(err + "\n")
						response.end()
						log_http(request, reqpath, file_to_serve_fullpath, 500, "File Error")
					}
				})
		}

        } else {
//log_debug("404: " + request.url)
		respond_404(request, response, reqpath, file_to_serve_fullpath)
	}

//!!    })
})


var server_listening_ok = false
var kill_request_sent = false

server.on('error',function(e){
	if (e.code == 'EADDRINUSE') {
		log_warn("Port "+ SERVER_PORT +" is already used. Trying to take over...");

		//http://nodejs.org/api/http.html#http_http_get_options_callback
		Http.get("http://"+SERVER_HOST+":"+SERVER_PORT+"/?ctrl:stop!", function(res) {
			log_notice("Response to the STOP req.: " + res.statusCode);
		}).on('error', function(e) {
			// Connection reset is expected if we kill the server ;)
			if (e.code != 'ECONNRESET') {
				log_err("'"+ e.message +"' while trying to reclaim server port.");
			}
		});

		setTimeout(function () {
			// Let's retry, regardless of the response:
			server.listen(SERVER_PORT, SERVER_HOST)
			// Wait for it to probably finish:
			setTimeout(function () {
				if (!server_listening_ok) {
					log_err("Couldn't reclaim server port.");
				        process.exit()
				}
			}, 500);
		}, 2000);
	}
})

server.on('listening',function(){
	server_listening_ok = true
	log("Listening on http://"+ SERVER_HOST + ":" + SERVER_PORT 
		+ "/ (serving "+ Path.resolve(SERVER_DOC_ROOT) +").")

	//Just for myself: what exactly these other ways of printing are/were?
	//Util.puts("Server Running on port " + SERVER_PORT);
	// Sys.puts("Sys.puts vs. Util.puts vs. console.log?...");  
})

server.listen(SERVER_PORT, SERVER_HOST)
