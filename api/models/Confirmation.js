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

var CRYPTO = require( "crypto" );


var Confirmation = {

	attributes: {
		key: {
			type: "string",
			unique: true
		},
		token: {
			type: "string"
		},
		module: {
			type: "string",
			required: true
		},
		method: {
			type: "string",
			required: true
		},
		argument: {
			type: "string"
		},
		expires: {
			type: "datetime"
		},
		confirmed: {
			type: "datetime"
		}
	},

	/**
	 * Creates salted SHA512 w/o embedding salt in hash.
	 *
	 * Due to not injecting salt same salt must be provided again to repeat same
	 * hashing e.g. for evaluation.
	 *
	 * @param {string} data
	 * @param {string} salt
	 * @returns {string} resulting hash in hex format
	 */
	getHash: function( data, salt ) {
		"use strict";

		var hash = CRYPTO.createHash( "sha512" );
		hash.update( salt );
		hash.update( data );

		return hash.digest( "hex" );
	},

	/**
	 * Promises buffer containing 256 bytes of random values suitable for
	 * cryptography.
	 *
	 * @returns Promise<Buffer>
	 */
	getRandom: function() {
		return new Promise( function( resolve, reject ) {
			CRYPTO.randomBytes( 256, function( err, buf ) {
				if ( err ) {
					reject( err );
				} else {
					resolve( buf );
				}
			} );
		} );
	},

	/**
	 * Creates confirmation process calling selected method of given model.
	 *
	 * @param {string} modelName name of model
	 * @param {string} methodName name of selected model's method to invoke
	 * @param {string} argument custom argument passed into method
	 * @param {?Date=} expires marks time when confirmation is expiring
	 * @returns {Promise<string>} URL of endpoint actually confirming process
	 */
	createProcessOnModel: function( modelName, methodName, argument, expires ) {
		"use strict";

		if ( !sails.models || !sails.models[modelName] || typeof sails.models[modelName][methodName] !== "function" ) {
			return Promise.reject( new TypeError( "invalid model or method" ) );
		}

		return Confirmation.createProcess( null, modelName + "." + methodName, argument, expires );
	},

	/**
	 * Creates confirmation process calling selected method of given module.
	 *
	 * @note This method is a basic version used by convenience helpers. Thus
	 *       you might omit `moduleName` but need to provide qualified name in
	 *       `methodName` then.
	 *
	 * @param {?string} moduleName name of module (to be passed into `require`)
	 * @param {string} methodName name of method to invoke
	 * @param {string} argument custom argument passed into method
	 * @param {?Date=} expires marks time when confirmation is expiring
	 * @returns {Promise<string>} URL of endpoint actually confirming process
	 */
	createProcess: function( moduleName, methodName, argument, expires ) {
		"use strict";

		var route = sails.getRouteFor( "ConfirmationController.process" );
		if ( !route ) {
			return Promise.reject( new Error( "missing route to controller for processing confirmation" ) );
		}

		return tryRandom()
			.then( function( newKey ) {
				var newToken = this.getRandom();

				return Confirmation.create( {
					key: newKey,
					token: newToken,
					module: moduleName || null,
					method: methodName || null,
					argument: String( argument || "" ),
					expires: expires || null,
					confirmed: null
				} )
					.then( function() {
						return route.url
							.replace( /:id/g, newKey )
							.replace( /:token/g, newToken );
					} );
			} );


		function tryRandom() {
			return Confirmation.getRandom()
				.then( function( random ) {
					var hash = Confirmation.getHash( random, "KEY:" ).substr( 0, 16 );

					return Confirmation.findOne( { key: hash } )
						.then( function( found ) {
							if ( found ) {
								// FIXME Working recursively is loading stack. Use object stream instead!
								return tryRandom();
							}

							return hash;
						} );
				} );
		}
	}
};

module.exports = Confirmation;
