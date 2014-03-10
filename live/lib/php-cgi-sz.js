/**
Based on php-cgi 0.2.0

sz:

+ Added try-catch around spawn().
+ Disabled bogus PATH_INFO and PATH_TRANSLATED.
+ Fixed PHP startup: added missing REDIRECT_STATUS.
+ Fixed query string handling to support special PHP "?=PHPxxxx" params.
  (Disabled QS-parsing and removed unnecessary(?) urlencoding.)
+ Fixed response body for non-text data.
+ Confusing 'paramsForRequest' renamed to 'prepareCGIEnv'.
+ 'newRequestParams' renamed to 'getRequestVars'.
+ Changed (simplified & extended) the serveResponse() API.
+ Renamed 'serveResponse' to 'process'.

*/
var os = require("os");
var spawn = require('child_process').spawn;


//http://social.msdn.microsoft.com/Forums/vstudio/en-US/15514c1a-b6a1-44f5-a06c-9b029c4164d7/searching-a-byte-array-for-a-pattern-of-bytes?forum=csharpgeneral
function find(array, pattern)
{
    if (!array)   return -1
    if (!pattern) return -1

    var found = -1;
    for (var i = 0; i <= array.length - pattern.length; i++)
    {
        found = i;
        for (var j = 0; j < pattern.length; j++)
        {
            if (array[i + j] != pattern[j])
            {
                found = -1;
                break;
            }
        }
        if (found != -1) break;
    }
    return found;
}



var Me = {
	bin:"php-cgi",

	env:{
		 'SERVER_SOFTWARE':"nodejs"
		,'SERVER_PROTOCOL':"HTTP/1.1"
		,'GATEWAY_INTERFACE':"CGI/1.1"
		,'SERVER_NAME':os.hostname()
		,'REDIRECT_STATUS_ENV':0
	},setEnv:function(env) {
		for(var e in env) {
			Me.env[e] = env[e];
		}
	},getRequestVars:function() {
		var reqEnv = {};
		for(var keys = Object.keys(Me.env), l = keys.length; l; --l)	{
		   reqEnv[ keys[l-1] ] = Me.env[ keys[l-1] ];
		}
		return reqEnv;
	},prepareCGIEnv:function(scriptfile, req, reqEnv) {
		if (typeof(reqEnv) == "undefined") reqEnv = Me.getRequestVars();
		
//sz:
//!!sz:		requri = require("url").parse(req.url,true);
		requri = require("url").parse(req.url,false);
		//set environment variables for this request
		reqEnv['SCRIPT_NAME']     = scriptfile;
//sz: This would not work, as PHP assumes it to be a relative path:
//		reqEnv['SCRIPT_NAME'] = scriptfile;
		//!!sz: this line was missing:
		Path = require("path")
		reqEnv['PATH_INFO']       = ""; //!!UNSUPPORTED!
		reqEnv['PATH_TRANSLATED'] = ""; //!!UNSUPPORTED!

//sz: CGI paranoia kludge required by PHP-CGI
//http://stackoverflow.com/questions/7047426/call-php-from-virtual-custom-web-server
//http://woozle.org/~neale/papers/php-cgi.html
		reqEnv['REDIRECT_STATUS'] = 1;
//sz: This is used as a fallback, if SCRIPT_NAME (i.e. URI.pathname) is empty (e.g. http://host/)
		reqEnv['SCRIPT_FILENAME'] = Path.resolve(Path.join(reqEnv['DOCUMENT_ROOT'], scriptfile));
//!!console.log("SCRIPT_FILENAME: " + reqEnv['SCRIPT_FILENAME'])

//sz: console.log("DOCUMENT_ROOT: " + reqEnv['DOCUMENT_ROOT'])
//sz: console.log("requri.pathname: " + requri.pathname)

//sz:
		reqEnv['QUERY_STRING'] = requri.query || '';
//console.log("QS = "+reqEnv['QUERY_STRING']);
//!!		reqEnv['QUERY_STRING'] = '';
//!!		for(var p in requri.query) {
//!!			reqEnv['QUERY_STRING'] += p+"="+encodeURIComponent(requri.query[p])+"&";
//!!		}
		reqEnv['REQUEST_METHOD'] = req.method;
		
		//add request headers, "User-Agent" -> "HTTP_USER_AGENT"
		for (var header in req.headers) {
			reqEnv['HTTP_' + header.toUpperCase().split("-").join("_")] = req.headers[header];
		}
		//copy in additional special headers..
		if ('content-length' in req.headers) {
			reqEnv['CONTENT_LENGTH'] = req.headers['content-length'];
		}
		if ('content-type' in req.headers) {
			reqEnv['CONTENT_TYPE'] = req.headers['content-type'];
		}
		if ('authorization' in req.headers) {
			reqEnv['AUTH_TYPE'] = req.headers.authorization.split(' ')[0];
		}
		return reqEnv;
	},detectBinary:function() {
		if (process.platform == 'win32') {
			//detect a local "portable" php install.
			Me.bin = require("php-bin-win32").bin;
		}
	/**
	* This is an automatic function, will add a function you can override later on.
	*/
	},process:function(scriptfile, req, res, end_callback, params) {
		if (typeof(end_callback) == "object") { params = end_callback; end_callback = null; }
		if (typeof(params) == "undefined") params = {};
		var reqEnv = Me.prepareCGIEnv(scriptfile, req);
		cgi = spawn(Me.bin, [], {
			  env: reqEnv,
			  stdio: 'pipe'
		});

		var error_msg  = "CGI error"

		// spawn() would pass errors here:
		cgi.on('error', function(e) {
			switch (e.code) {
			case 'ENOENT':
				error_msg = "Couldn't find CGI executable '"+Me.bin+"'."
				break
			default:
				error_msg = "'" + e.code + "' while trying to launch CGI executable '"+Me.bin+"'."
				break
			}
			console.log("CGI: "+ error_msg)
			res.writeHead(500, "Internal server error: " + error_msg)

			if (typeof(end_callback) == "function")
				end_callback(500, error_msg) // this must close the response stream!
			else
				res.end()

		})


		req.pipe(cgi.stdin);
		if (params['sterr']) {
			cgi.stderr.on('data',params.sterr);
		} else {
			cgi.stderr.on('data',function(data) {
				console.log("CGI error: "+ data.toString());
			});
		}	
		var headersSent = false;
		cgi.stdout.on('data', function(data) {		
			if (headersSent) {
				//stream data to browser as soon as it is available.
				//console.log(data.toString());
				res.write(data);
			} else {
				
//!!sz: Added support for non-text data
//http://docs.nodejitsu.com/articles/advanced/buffers/how-to-use-buffers
				var headers_end = find(data, new Buffer("\r\n\r\n"));
				if (headers_end != -1) {
//console.log("*** CGI headers found, ending at: " + headers_end);
//console.log(data.toString("utf-8", 0, headers_end));
					var lines = data.toString("utf-8", 0, headers_end).split("\r\n");
					//set headers until you get a blank line...
					for (var l=0; l<lines.length; l++) {
						//set header
						var header = lines[l].split(":");
						res.setHeader(header[0], header[1] || '');
					}

					if (!res.getHeader("content-length")) {
					//stream the output
						res.setHeader('Transfer-Encoding', 'chunked');
					}
					res.writeHead(200);
					headersSent = true;
				}
//				if ((type = res.getHeader("content-type")) && 
//					type.substring(0, 4) == "text") {
//					res.write(lines.slice(l+1).join('\r\n'));
//				} else {
					res.write(data.slice(headers_end + 4));
//				}
			}
		});
		cgi.stdout.on('end',function() { 
			if (typeof(end_callback) == "function")
				//!! not always 200 here?
				end_callback(200, "OK") // this must close the response stream!
			else
				res.end()
		});
	}
}

module.exports = Me;
