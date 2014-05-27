// Product:
var NAME = "HTTPHP"
var VERSION = "1.14+"

var SERVER_CFG = require('./default.cfg')

// URI -> dir ("alias") map. Will be set after processing the args!
//!! (How this relates to the legacy SERVER_CFG.DOC_ROOT is not 100% clear yet. 
//!! For now '/' -> SERVER_CFG.DOC_ROOT is the only default alias map entry, and
//!! SERVER_CFG.DOC_ROOT is, unfortunately, also used directly at several places
//!! "the" (only) legacy docroot value.)
var dirmap = {
	'/': SERVER_CFG.DOC_ROOT,
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
	if (SERVER_CFG.LOG_FILTER.indexOf('warn') == -1)
		log("WARNING: "+ msg)
}
function log_notice(msg) {
	if (SERVER_CFG.LOG_FILTER.indexOf('notice') == -1)
		log("notice: "+ msg)
}
function log_debug(msg) {
	if (SERVER_CFG.LOG_FILTER.indexOf('debug') == -1)
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
		SERVER_CFG.PORT = arg
		log_notice("SERVER.PORT set to '" + SERVER_CFG.PORT + "'")
		param_of = null
		break
	case '-d':
		SERVER_CFG.DOC_ROOT = arg
		log_notice("SERVER.DOC_ROOT set to '" + SERVER_CFG.DOC_ROOT + "'")
		param_of = null
		break
	case '-i':
		SERVER_CFG.INDEX = arg
		log_notice("SERVER.INDEX set to '" + SERVER_CFG.INDEX + "'")
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
SERVER_URL_PREFIX = SERVER_CFG.PROTOCOL + "://" + SERVER_CFG.HOST + ":" + SERVER_CFG.PORT


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

/*
function get_index(request, response, reqpath, file_to_serve_fullpath) {

	log_debug("Falling back to dir. index on missing direct match...")
	return false
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

	log_notice("Request for '" + request.url + "' received.")

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
	file_to_serve_fullpath = SERVER_CFG.DOC_ROOT + file_to_serve
	log_debug('file_to_serve_fullpath: ' + file_to_serve_fullpath)

	var file_state = null
	try {
		file_state = Fs.statSync(file_to_serve_fullpath)//!!, function(err, stats) {
	} catch(err) {
		if (err.code == 'ENOENT') {
			//!! The URL may map to an existing file, but that's not necessarily an error!
			//!! BUT NOW, FOR DEBUGGING:
			if (!SERVER_CFG.ON_404_TRY_INDEX) {
				respond_404(request, response, reqpath, file_to_serve_fullpath)
				return
			}
			
			log_notice("Falling back to dir. index on 404 (as configured)...")
			// Fall through to index handling!
			// Also: hack the index file list, if 'ON_404_TRY_INDEX' is itself a file name:
			if (typeof(SERVER_CFG.ON_404_TRY_INDEX) === 'string') {
				SERVER_CFG.INDEX = SERVER_CFG.ON_404_TRY_INDEX + ',' + SERVER_CFG.INDEX
			}
			
		} else {
			response.writeHeader(500, {"Content-Type": "text/plain"})
			response.write(err + "\n")
			log_http(request, reqpath, file_to_serve_fullpath, 500, "File stat() failed")
			response.end()
			return
		}
	}

	// Check if the request points to an existing dir, and
	// then append an index file if one exists in that dir.
	// If not, bail out with 404.
	if (file_state && file_state.isDirectory() || !file_state && SERVER_CFG.ON_404_TRY_INDEX) { //!NOTE: file_state is null if not found

		var INDIRECT_INDEX = null

		//! Don't chop it if it's a real dir request!
		if (!file_state && SERVER_CFG.ON_404_TRY_INDEX) {
			reqpath = Path.dirname(reqpath)
		}

		SERVER_CFG.INDEX.split(",").some(function(index) {
			file_to_serve          = Path.join(reqpath, index.trim())
			file_to_serve_fullpath = Path.join(SERVER_CFG.DOC_ROOT, file_to_serve)
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

	// NOTE: file_state.isSymbolicLink() transparently handled by stat()
	if (INDIRECT_INDEX || file_state.isFile()) { //!NOTE: file_state may be null

		// Based on the php-cgi README:
		// Just use 'path' instead of Url.parse(request.url, true)

		file_ext = Path.extname(file_to_serve)
		log_debug("filename suffix: " + file_ext)

		switch (file_ext) {

			case ".php":
				    phpCGI.env['REQUEST_URI'] = request.url; // PHP-specific
				    phpCGI.env['DOCUMENT_ROOT'] = SERVER_CFG.DOC_ROOT + Path.sep;
				    phpCGI.env['SERVER_PORT'] = SERVER_CFG.PORT;
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
						log_debug("Should this 404 ever occur here?!") //!!?
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
		log_debug("Should this other 404 ever occur here?!") //!!?
		respond_404(request, response, reqpath, file_to_serve_fullpath)
	}

//!!    })
})


process.on('exit', function() {
  log("Shutting down gracefully. Thanks, bye!");
})

process.on('SIGINT', function() {
  log_notice("Exiting on SIGINT (Ctrl+C)...");
  process.exit();
})

process.on('SIGTERM', function() {
  log_notice("Exiting on SIGTERM (kill -15)...");
  process.exit();
})


var server_listening_ok = false
var kill_request_sent = false

server.on('error',function(e){
	if (e.code == 'EADDRINUSE') {
		log_warn("Port "+ SERVER_CFG.PORT +" is already used. Trying to take over...");

		//http://nodejs.org/api/http.html#http_http_get_options_callback
		Http.get("http://"+SERVER_CFG.HOST+":"+SERVER_CFG.PORT+"/?ctrl:stop!", function(res) {
			log_notice("Response to the STOP req.: " + res.statusCode);
		}).on('error', function(e) {
			// Connection reset is expected if we kill the server ;)
			if (e.code != 'ECONNRESET') {
				log_err("'"+ e.message +"' while trying to reclaim server port.");
			}
		});

		setTimeout(function () {
			// Let's retry, regardless of the response:
			server.listen(SERVER_CFG.PORT, SERVER_CFG.HOST)
			// Wait for it to probably finish:
			setTimeout(function () {
				if (!server_listening_ok) {
					log_err("Couldn't reclaim server port.");
				        process.exit()
				}
			}, 500);
		}, 2000);
	} else if (e.code == 'EACCES') {
		log_err("No permission to bind to port " + SERVER_CFG.PORT + ".");
	} else {
		log_err("Unknown fatal error: " + e.code + ".");
	}
})

server.on('listening',function(){
	server_listening_ok = true
	log("Listening on http://"+ SERVER_CFG.HOST + ":" + SERVER_CFG.PORT 
		+ "/ (serving "+ Path.resolve(SERVER_CFG.DOC_ROOT) +").")

	//Just for myself: what exactly these other ways of printing are/were?
	//Util.puts("Server Running on port " + SERVER_CFG.PORT);
	// Sys.puts("Sys.puts vs. Util.puts vs. console.log?...");  
})

server.listen(SERVER_CFG.PORT, SERVER_CFG.HOST)
