/**
 * (c) 2016 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 cepharum GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @author: cepharum
 */

var actions = {};


// explicitly declare all blueprinted actions to disable them
[ "find", "findOne", "create", "update", "destroy", "add", "remove", "populate" ]
	.forEach( n => {
		"use strict";
		actions[n] = (req, res) => res.forbidden();
	} );


// add custom action for processing confirmation
actions.process = function( req, res ) {
	"use strict";

	var id    = String( req.params.id ).trim(),
	    token = String( req.params.token ).trim();

	if ( !id || !token ) {
		return res.badRequest();
	}

	sails.models.Confirmation.findOne( {
		key: id
	} )
		.then( function( record ) {
			if ( !record ) {
				sails.log.warn( "request for missing confirmation" );

				return res.notFound();
			}

			// ensure having valid handler to be invoked on valid confirmation
			var method = findMethod( record );
			if ( !method ) {
				sails.log.error( "missing confirmation handler @" + record.key );

				return res.serverError();
			}

			var argument = record.argument,
				hash;

			if ( !String( record.token ).trim().length ) {
				return triggerProcess( { again: true }, method, argument );
			}

			// hash stored token to compare with token hash provided by client
			hash = getHash( record.token, record.key );
			if ( hash !== token ) {
				// mismatch
				return triggerProcess( { invalidHash: true }, method, argument );
			}

			if ( record.expires < Date.now() ) {
				// match, but expired
				return triggerProcess( { expired: true }, method, argument );
			}


			// match

			// drop stored token to mark this confirmation having succeeded
			record.confirmed = Date.now();
			record.token     = null;

			record.save()
				.then( function() {
					// invoke confirmation handler on success
					triggerProcess( null, method, argument );
				}, function( cause ) {
					sails.log.error( "failed marking successful confirmation" );
					sails.log.error( cause );

					triggerProcess( { cantUpdate: true }, method, argument );
				} )
				.catch( function( cause ) {
					sails.log.error( "confirmed process failed" );
					sails.log.error( cause );

					res.serverError();
				} );
		} )
		.catch( function( error ) {
			sails.log.error( "fetching confirmation record failed" );
			sails.log.error( error );

			res.serverError();
		} );



	function triggerProcess( error, method, argument ) {
		"use strict";

		try {
			method( req, res, error, argument )
		} catch ( e ) {
			sails.log.error( "processing valid confirmation failed" );
			sails.log.error( e );

			return res.serverError();
		}
	}
};


module.exports = actions;


function findMethod( record ) {
	"use strict";

	var { module, method } = record;

	if ( module ) {
		module = require( module );
	} else {
		[ module, method ] = method.split( /\./ );
		if ( module ) {
			module = sails.models[module];
		}
	}

	if ( module && method && typeof module[method] === "function" ) {
		return module[method];
	} else {
		return null;
	}
}
