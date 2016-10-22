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


module.exports = {

	attributes: {
		key: {
			type: "string",
			unique: true
		},
		token: {
			type: "string"
		},
		module: {
			type: "string"
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
	 * Creates salted SHA256 w/o embedding salt in hash.
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

		var hash = CRYPTO.createHash( "sha256" );
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
	 * Fetches method selected by provided name of module and/or method.
	 *
	 * @param {?string} moduleName name of custom module to be `require`d for containing custom method, null for selecting a model's method
	 * @param {string} methodName name of method in custom module, name of model and its method joined by period if moduleName is omitted
	 * @returns {function}
	 * @throws Error on invalid selection or missing selected method
	 */
	getMethod: function( moduleName, methodName ) {
		"use strict";

		if ( !methodName || typeof methodName !== "string" ) {
			throw new Error( "invalid method name" );
		}

		if ( moduleName ) {
			if ( typeof moduleName !== "string" ) {
				throw new Error( "invalid module name" );
			}

			if ( methodName.indexOf( "." ) > -1 ) {
				throw new Error( "unexpected model name prefixed to method name" );
			}

			let api = require( moduleName );
			if ( !api || typeof api[methodName] !== "function" ) {
				throw new Error( "invalid or missing custom method" );
			}

			return api[methodName];
		}


		let parts = methodName.split( "." );

		if ( parts.length != 2 ) {
			throw new Error( "missing combination of model and method name" );
		}

		let [ modelName, modelMethod ] = parts;

		if ( !sails || !sails.models || !sails.models[modelName] || typeof sails.models[modelName][modelMethod] != "function" ) {
			throw new Error( "invalid or missing model method" );
		}

		return sails.models[modelName][modelMethod];
	},

	/**
	 * Wraps result of Confirmation#getMethod() in a promise.
	 *
	 * @param {?string} moduleName name of custom module to be `require`d for containing custom method, null for selecting a model's method
	 * @param {string} methodName name of method in custom module, name of model and its method joined by period if moduleName is omitted
	 * @returns {Promise<function>}
	 */
	getPromisedMethod: function( moduleName, methodName ) {
		"use strict";

		return new Promise( resolve => resolve( this.getMethod( moduleName, methodName ) ) );
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

		return sails.models.confirmation.createProcess( null, modelName + "." + methodName, argument, expires );
	},

	/**
	 * Creates confirmation process calling selected method of given module.
	 *
	 * @note This method is a basic version used by convenience helpers. Thus
	 *       you might omit `moduleName` but need to provide qualified name in
	 *       `methodName` then.
	 *
	 * @param {?string} moduleName name of module (to be `require`d)
	 * @param {string} methodName name of method to invoke
	 * @param {string} argument custom argument passed into method
	 * @param {?Date=} expires marks time when confirmation is expiring
	 * @returns {Promise<string>} URL of endpoint actually confirming process
	 */
	createProcess: function( moduleName, methodName, argument, expires ) {
		"use strict";

		var Model = sails.models.confirmation;

		return Model.getPromisedMethod( moduleName, methodName )
			.then( function() {
				return tryRandom();
			} )
			.then( function( newKey ) {
				return Model.getRandom()
					.then( function( newToken ) {
						newToken = newToken.toString( "hex" );

						return Model.create( {
							key: newKey,
							token: newToken,
							module: moduleName || undefined,
							method: methodName || undefined,
							argument: String( argument || "" ),
							expires: expires || undefined,
							confirmed: undefined
						} )
							.then( function() {
								return "/confirmation/process/" + newKey + "/" + Model.getHash( newToken, newKey );
							} );
					} );
			} );


		function tryRandom() {
			return Model.getRandom()
				.then( function( random ) {
					var hash = Model.getHash( random, "KEY:" ).substr( 0, 16 );

					return Model.findOne( { key: hash } )
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

