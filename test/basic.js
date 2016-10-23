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

var SAILS = require( "sails" ).Sails;
var SHOULD = require( "should" );
var PATH = require( "path" );

describe( "confirmations hook", function() {
	this.timeout( 5000 );

	var sails;

	before( "lift sails", function( done ) {
		this.timeout( 11000 );

		// Try lifting sails
		SAILS().lift( {
			hooks:  {
				"sails-hook-confirmations": require( "../" ),
				"grunt":                    false
			},
			log:    { level: "error" },
			models: {
				migrate: "drop"
			}
		}, function( err, _sails ) {
			if ( err ) {
				return done( err );
			}

			sails = _sails;

			return done();
		} );
	} );

	after( "lower sails", function( done ) {
		if ( sails ) {
			sails.lower( done );
		} else {
			done();
		}
	} );


	it( "properly integrates with sails", function() {
		"use strict";
	} );

	it( "injects model", function() {
		"use strict";

		SHOULD( sails.models ).be.ok();
		SHOULD( sails.models.confirmation ).be.ok();

		SHOULD( sails.models.confirmation.getHash ).be.Function();
		SHOULD( sails.models.confirmation.getRandom ).be.Function();
		SHOULD( sails.models.confirmation.getMethod ).be.Function();
		SHOULD( sails.models.confirmation.createProcessOnModel ).be.Function();
		SHOULD( sails.models.confirmation.createProcess ).be.Function();
	} );

	it( "injects controller", function() {
		"use strict";

		SHOULD( sails.controllers ).be.ok();
		SHOULD( sails.controllers.confirmation ).be.ok();

		SHOULD( sails.controllers.confirmation.process ).be.Function();
	} );

	it( "generates hash", function() {
		"use strict";

		var cleartextA = "This is test data to be hashed.",
		    cleartextB = "This is further test data to be hashed.",
		    saltA      = "This is a salt.",
		    saltB      = "This is another salt.";

		var hashAA  = sails.models.confirmation.getHash( cleartextA, saltA ),
		    hashAB  = sails.models.confirmation.getHash( cleartextA, saltB ),
		    hashBA  = sails.models.confirmation.getHash( cleartextB, saltA ),
		    hashBB  = sails.models.confirmation.getHash( cleartextB, saltB ),
		    hashAA2 = sails.models.confirmation.getHash( cleartextA, saltA );

		SHOULD( hashAA ).be.String();
		SHOULD( hashAA ).have.length( 64 );
		SHOULD( hashAB ).be.String();
		SHOULD( hashAB ).have.length( 64 );
		SHOULD( hashBA ).be.String();
		SHOULD( hashBA ).have.length( 64 );
		SHOULD( hashBB ).be.String();
		SHOULD( hashBB ).have.length( 64 );
		SHOULD( hashAA2 ).be.String();
		SHOULD( hashAA2 ).have.length( 64 );

		SHOULD( hashAA ).not.equal( hashAB );
		SHOULD( hashAA ).not.equal( hashBA );
		SHOULD( hashAA ).not.equal( hashBB );

		SHOULD( hashAB ).not.equal( hashBA );
		SHOULD( hashAB ).not.equal( hashBB );

		SHOULD( hashBA ).not.equal( hashBB );

		SHOULD( hashAA2 ).equal( hashAA );
	} );

	it( "generates random data", function( done ) {
		"use strict";

		var random = sails.models.confirmation.getRandom();

		SHOULD( random ).be.Promise();

		random
			.then( function( data ) {
				SHOULD( data ).be.ok();
				SHOULD( data ).be.instanceof( Buffer );
				SHOULD( data ).have.length( 256 );

				sails.models.confirmation.getRandom()
					.then( function( second ) {
						SHOULD( second ).be.ok();
						SHOULD( second ).be.instanceof( Buffer );
						SHOULD( second ).have.length( 256 );

						SHOULD( data.toString( "hex" ) ).not.equal( second.toString( "hex" ) );
					} );

				done();
			} )
			.catch( done );
	} );

	it( "fetches custom method", function() {
		"use strict";

		var module = PATH.join( __dirname, ".injector" );

		SHOULD( sails.models.confirmation.getMethod ).throw();
		SHOULD( sails.models.confirmation.getMethod.bind( this, module ) ).throw();
		SHOULD( sails.models.confirmation.getMethod.bind( this, null, "invoke" ) ).throw();
		SHOULD( sails.models.confirmation.getMethod.bind( this, module, "invoke" ) ).not.throw();
		SHOULD( sails.models.confirmation.getMethod.bind( this, null, "confirmation.getHash" ) ).not.throw();
		SHOULD( sails.models.confirmation.getMethod.bind( this, module, "confirmation.getHash" ) ).throw();
	} );

	it( "requires valid method selector on creating custom process to be confirmed", function() {
		"use strict";

		var module = PATH.join( __dirname, ".injector" );

		return Promise.all( [
			SHOULD( sails.models.confirmation.createProcess() ).be.rejected(),
			SHOULD( sails.models.confirmation.createProcess( module ) ).be.rejected(),
			SHOULD( sails.models.confirmation.createProcess( null, "invoke" ) ).be.rejected(),
			SHOULD( sails.models.confirmation.createProcess( module, "invoke" ) ).be.fulfilled(),
			SHOULD( sails.models.confirmation.createProcess( null, "confirmation.getHash" ) ).be.fulfilled(),
			SHOULD( sails.models.confirmation.createProcess( module, "confirmation.getHash" ) ).be.rejected(),
		] );
	} );

	it( "requires valid method selector on creating model process to be confirmed", function() {
		"use strict";

		return Promise.all( [
			SHOULD( sails.models.confirmation.createProcessOnModel() ).be.rejected(),
			SHOULD( sails.models.confirmation.createProcessOnModel( "model" ) ).be.rejected(),
			SHOULD( sails.models.confirmation.createProcessOnModel( "model", "method" ) ).be.rejected(),
			SHOULD( sails.models.confirmation.createProcessOnModel( "model", "model.method" ) ).be.rejected(),
			SHOULD( sails.models.confirmation.createProcessOnModel( null, "model.method" ) ).be.rejected(),

			SHOULD( sails.models.confirmation.createProcessOnModel( "confirmation" ) ).be.rejected(),
			SHOULD( sails.models.confirmation.createProcessOnModel( "confirmation", "method" ) ).be.rejected(),
			SHOULD( sails.models.confirmation.createProcessOnModel( "confirmation", "confirmation.method" ) ).be.rejected(),
			SHOULD( sails.models.confirmation.createProcessOnModel( null, "confirmation.method" ) ).be.rejected(),

			SHOULD( sails.models.confirmation.createProcessOnModel( "confirmation", "getHash" ) ).be.fulfilled(),
			SHOULD( sails.models.confirmation.createProcessOnModel( "confirmation", "confirmation.getHash" ) ).be.rejected(),
			SHOULD( sails.models.confirmation.createProcessOnModel( null, "confirmation.getHash" ) ).be.rejected()
		] );
	} );

	it( "creates custom process to be confirmed", function() {
		"use strict";

		var result = sails.models.confirmation.createProcess( PATH.join( __dirname, ".injector" ), "invoke" );

		SHOULD( result ).be.Promise();

		return result
			.then( function( url ) {
				SHOULD( url ).be.ok();
				SHOULD( url ).be.String();
				SHOULD( url ).match( /^\/confirmation\/process\/[^\/]{16}\/[^\/]{64}$/ );
			} );
	} );

	it( "properly invokes custom process on requesting URL provided on creating process confirmation", function() {
		"use strict";

		return tryRequest( 0, 0, function( url, res, actual, expected ) {
			SHOULD( res ).be.ok();
			SHOULD( res.statusCode ).equal( 200 );

			SHOULD( actual ).equal( expected );
		} );
	} );

	it( "properly invokes custom process on requesting provided URL within expiration time", function() {
		"use strict";

		return tryRequest( 2, 1, function( url, res, actual, expected ) {
			SHOULD( res ).be.ok();
			SHOULD( res.statusCode ).equal( 200 );

			SHOULD( actual ).equal( expected );
		} );
	} );

	it( "properly rejects invocation of custom process on requesting URL provided on creating process confirmation after expiration", function() {
		"use strict";

		return tryRequest( 2, 4, function( url, res, actual, expected ) {
			SHOULD( res ).be.ok();
			SHOULD( res.statusCode ).not.equal( 200 );

			SHOULD( actual ).not.equal( expected );
		} );
	} );


	function tryRequest( expiresInSeconds, requestDelayInSeconds, testFn ) {
		"use strict";

		var marker = 0,
		    value  = "5",
		    action = function( req, res, err, value ) {
				if ( err ) {
					return res.status( 500 ).end();
				} else {
					marker = value;
				}
		    },
		    module = PATH.join( __dirname, ".injector" );

		require( module ).setTarget( action );

		return new Promise( function( resolve, reject ) {
			sails.models.confirmation.createProcess( module, "invoke", value, expiresInSeconds )
				.then( function( url ) {
					if ( requestDelayInSeconds > 0 ) {
						setTimeout( request, requestDelayInSeconds * 1000 );
					} else {
						request();
					}

					function request() {
						require( "http" ).get( {
							hostname: sails.config.explicitHost || "127.0.0.1",
							port:     sails.config.port || 1337,
							path:     url,
							agent:    false
						}, function( res ) {
							try {
								testFn( url, res, marker, value );
								resolve();
							} catch ( e ) {
								reject( e );
							}
						} );
					}
				} )
				.catch( reject );
		} );
	}
} );
