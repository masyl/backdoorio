// todo:  .query() method for finding an item
// todo: an easy way to use underscore methods as extensions
// todo: figure out if async callbacks are possible and how to handle them

module.exports = function (Model, methods) {
	function ModelChain() {

		/**
		 * Create a new chain constructor for further prototyping
		 * @param context
		 */
		function Chain (rootContext, contextInput) {
			// Create a new context array;
			this.context = [];
			this.rootContext = rootContext;
			if (contextInput) {
				// Transfer all the contextInput into the new context
				for (var i = 0; i < contextInput.length; i = i + 1) {
					this.context.push(contextInput[i]);
				}
			}
		}

		// add methods to the chain constructor
		for (var method in ModelChain.fn) {
			if (ModelChain.fn.hasOwnProperty(method)) {
				Chain.prototype[method] = ModelChain.fn[method];
			}
		}

		// Start a new chain with a fresh root context
		return new Chain([]);
	}

	// The object that contains all the methods to be added to the main chain' prototype
	ModelChain.fn = {};

	/**
	 * Create a new model instance and adds it to both the root context and current context
	 */
	ModelChain.fn.create = function () {
		var construstor = constructorAsAFunction(Model);
		var model = construstor.apply(this, arguments);

		this.rootContext.push(model);

		return new this.constructor(this.rootContext, [model]);
	};

	/**
	 * Create a new model instance, add it to the root context and use it as the current context
	 */
	ModelChain.fn.tap = function (handler) {
		handler(this);
		return this;
	};

	/**
	 * Return a new context with all the items in it
	 */
	ModelChain.fn.all = function () {
		var newContext = [];
		for (var i = 0; i < this.rootContext.length; i = i + 1) {
			newContext.push(this.rootContext[i]);
		}
		return new this.constructor(this.rootContext, newContext);
	};


	// Add multiple methods that receive each item that are in the context one by one
	// Simpler since there is no need to handle the forEach
	ModelChain.onEach = function (nameOrObj, handler) {
		var obj = {};
		if (typeof(handler) === "function") {
			obj = {};
			obj[nameOrObj] = handler;
		} else {
			obj = nameOrObj;
		}
		for (var method in obj) {
			if (obj.hasOwnProperty(method)) {
				this.fn[method] = wrapperOnEach(obj[method]);
			}
		}
		return this;
	};

	// Add a single jump method that receives all items that are in the context
	// Requires the developer to handle the forEach
	// todo: refactor to merge with the onAll method
	ModelChain.onAll = function (nameOrObj, handler) {
		var obj = {};
		if (typeof(handler) === "function") {
			obj = {};
			obj[nameOrObj] = handler;
		} else {
			obj = nameOrObj;
		}
		for (var method in obj) {
			if (obj.hasOwnProperty(method)) {
				this.fn[method] = wrapperOnAll(obj[method]);
			}
		}
		return this;
	};

	function wrapperOnEach(handler) {
		return function () {
			console.log("this", this);
			var args = Array.prototype.slice.call(arguments, 0);
			for (var i = 0; i < this.context.length; i = i + 1) {
				args.push(this.context[i]);
				handler.apply(this, args);
				args.pop();
			}
			return this;
		}
	}

	// todo: refactor to merge with the wrapperOnAll method
	function wrapperOnAll(handler) {
		return function () {
			var args = Array.prototype.slice.call(arguments, 0);
			args.push(this.context);
			handler.apply(this, args);
			return this;
		}
	}

	return ModelChain;
};

/**
 * Transform a constructor so that it can be call like a normal function
 * (without the "new" instruction)
 * @param Constructor
 */
function constructorAsAFunction(Constructor) {
	return function() {
		var args = Array.prototype.slice.call(arguments, 0),
			Temp = function () {}, // temporary constructor
			inst,
			ret;
		// Give the Temp constructor the Constructor's prototype
		Temp.prototype = Constructor.prototype;
		// Create a new instance
		inst = new Temp;
		// Call the original Constructor with the temp
		// instance as its context (i.e. its 'this' value)
		ret = Constructor.apply(inst, args);
		// If an object has been returned then return it otherwise
		// return the original instance.
		// (consistent with behaviour of the new operator)
		return Object(ret) === ret ? ret : inst;

	}
}

