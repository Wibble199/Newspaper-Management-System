module.exports = validator = {
	// ---------- //
	// Constants //
	// -------- //
	/** Indicates an optional parameter */
	OPTIONAL: {test: "<<opt>>", message: "Optional"},
	/** Indicates only letters can be in the string */
	LETTERS_ONLY: {test: /^[A-Za-z]+$/, message: "Letters only"},
	/** Indicates only numbers can be in the string */
	NUMBERS_ONLY: {test: /^[0-9]+$/, message: "Numbers only"},
	/** Indicates only letters or numbers can be in the string */
	LETTERS_NUMBERS_ONLY: {test: /^[A-Za-z0-9]+$/, message: "Letters and numbers only"},
	/** Indicates the string must be in a valid email format */
	EMAIL_ADDR: {test: /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/, message: "Email address"},
	/** Indicates the string must be a YYYY-MM-DD date format */
	DATE_YYYY_MM_DD: {test: /^(19|20)\d{2}-[01]\d-[012]\d$/, message: "Date"},

	// ---------- //
	// Functions //
	// -------- //
	/**
	 * Tests a single item against one or more tests.
	 * Test format is an object containing:
	 *  - `test` A RegExp or function to check against
	 *  - `message` A message to place in the return array on fail
	 * 
	 * Returns an array containing all failed tests OR null if no tests failed
	 * @param {object[]} tests An array of tests to Run
	 * @param {*} item The item to run the tests only
	 * @returns {void | string[]}
	 */
	validateSingle: function(tests, item) {
		// Ensure tests is an array
		if (!Array.isArray(tests))
			tests = [tests];

		// Optionality checking is separate so that if the item isn't present it won't test other regular expressions/functions (which will likely fail if passed a null value)
		if (item == undefined || item == null || item == "") // If item is not provided
			return tests.indexOf(validator.OPTIONAL) > -1 ? null : [validator.OPTIONAL.message]; // If optional is allowed, return null (no error) otherwise return the OPTIONAL const
		
		// Run checks other than the optionality
		var failed = [];
		tests.forEach(el => {
			if (el == validator.OPTIONAL) return; // Ignore the optionality checker as it's already been dealt with

			try {
				var test = el.test;

				if (typeof test == "function") { // If the test is a function
					if (!test.call(item, item)) // Call that function with the item to test and if it failed:
						failed.push(el.message); // Add the message to the array

				} else if (test.constructor == RegExp) { // If the test is a RegExp
					if (!test.test(item)) // Test the RegExp against the item and if it failed:
						failed.push(el.message); // Add the message to the array

				} else throw Error(); // If the test is any other type, throw an error
			} catch (ex) {
				failed.push("INVALID VALIDATION TEST"); // If any error occured, the test definition is invalid
			}
		});

		// Return any fails
		return failed.length == 0 ? null : failed;
	},

	/**
	 * Tests multiple items, each against their own set of one or more tests.
	 * Test format is an object containing:
	 *  - `test` A RegExp or function to check against
	 *  - `message` A message to place in the return array on fail
	 * 
	 * Returns an whose keys are the keys of items that failed tests and whose values are arrays of messages OR null if no tests failed
	 * E.G. if `validateMap({foo: [OPTIONAL]}, {foo: ""})` was tested then the result would be {foo: ["Optional"]}
	 * @param {object[][] | object} tests An array of tests to Run
	 * @param {*[] | object} item The item to run the tests only
	 * @returns {void | object}
	 */
	validateMap: function(map, obj) {
		var failed = {}, someFailed = false;
		for (var i in map) { // For each item that we have to test
			var testResult = validator.validateSingle(map[i], obj[i]); // Test this item
			if (testResult != null) { // If there was a validation error
				someFailed = true;
				failed[i] = testResult; // Add the results to the failed object
			}
		}

		return someFailed ? failed : null; // If some of the results failed, return the failed obj as a whole, otherwise return null
	}
}