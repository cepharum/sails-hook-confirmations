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
var EXPECT = require( "expect.js" );

describe( "confirmations hook", function() {

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

		EXPECT( sails.models ).to.be.ok();
		EXPECT( sails.models.confirmation ).to.be.ok();

		EXPECT( sails.models.confirmation.getHash ).to.be.a( "function" );
		EXPECT( sails.models.confirmation.getRandom ).to.be.a( "function" );
		EXPECT( sails.models.confirmation.createProcessOnModel ).to.be.a( "function" );
		EXPECT( sails.models.confirmation.createProcess ).to.be.a( "function" );
	} );

	it( "injects controller", function() {
		"use strict";

		EXPECT( sails.controllers ).to.be.ok();
		EXPECT( sails.controllers.confirmation ).to.be.ok();

		EXPECT( sails.controllers.confirmation.process ).to.be.a( "function" );
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

		EXPECT( hashAA ).to.be.a( "string" );
		EXPECT( hashAA ).to.have.length( 128 );
		EXPECT( hashAB ).to.be.a( "string" );
		EXPECT( hashAB ).to.have.length( 128 );
		EXPECT( hashBA ).to.be.a( "string" );
		EXPECT( hashBA ).to.have.length( 128 );
		EXPECT( hashBB ).to.be.a( "string" );
		EXPECT( hashBB ).to.have.length( 128 );
		EXPECT( hashAA2 ).to.be.a( "string" );
		EXPECT( hashAA2 ).to.have.length( 128 );

		EXPECT( hashAA ).not.to.equal( hashAB );
		EXPECT( hashAA ).not.to.equal( hashBA );
		EXPECT( hashAA ).not.to.equal( hashBB );

		EXPECT( hashAB ).not.to.equal( hashBA );
		EXPECT( hashAB ).not.to.equal( hashBB );

		EXPECT( hashBA ).not.to.equal( hashBB );

		EXPECT( hashAA2 ).to.equal( hashAA );
	} );

	it( "generates random data", function( done ) {
		"use strict";

		var random = sails.models.confirmation.getRandom();

		EXPECT( random ).to.be.a( Promise );

		random
			.then( function( data ) {
				EXPECT( data ).to.be.ok();
				EXPECT( data ).to.be.a( Buffer );
				EXPECT( data ).to.have.length( 256 );

				sails.models.confirmation.getRandom()
					.then( function( second ) {
						EXPECT( second ).to.be.ok();
						EXPECT( second ).to.be.a( Buffer );
						EXPECT( second ).to.have.length( 256 );

						EXPECT( data.toString( "hex" ) ).not.to.equal( second.toString( "hex" ) );
					} );

				done();
			} )
			.catch( done );
	} );

} );
