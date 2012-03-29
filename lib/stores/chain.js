module.exports = function (Model, methods) {
	function ModelChain() {

		// todo: Find out how to unpile the context (and if it is necessary)
		// todo: Test how multiple context of the collection can live side by side without conflict (stack must probably be passed as a param instead of being global)
		// todo: Test in context can be popped
		// todo:  .query() method for finding an item
		// todo: an easy way to use underscore methods as extensions

		/**
		 * Create a new chain constructor for further prototyping
		 * @param context
		 */
		function Chain (contextInput) {
			// Create a new context array;
			var context = [];
			if (contextInput) {
				// Transfer all the contextInput into the new context
				for (var i = 0; i < contextInput.length; i = i + 1) {
					context.push(contextInput[i]);
				}
			}
			// Push the new context on the stack
			ModelChain.stack.push(context);
		}

		// add methods to the chain constructor
		for (var method in ModelChain.fn) {
			if (ModelChain.fn.hasOwnProperty(method)) {
				Chain.prototype[method] = ModelChain.fn[method];
			}
		}

		return new Chain();
	}

	// The stack containing all the various context states created
	ModelChain.stack = [];
	// The object that contains all the methods to be added to the main chain' prototype
	ModelChain.fn = {};

	/**
	 * Create a new model instance and adds it to both the root context and current context
	 */
	ModelChain.fn.create = function () {
		var construstor = constructorAsAFunction(Model);
		var model = construstor.apply(this, arguments);
		var stackHeight = ModelChain.stack.length - 1;
		// Fetch the current context
		var context = ModelChain.stack[stackHeight];
		// Push the new item on the current context
		context.push(model);
		// Also push to the root context if it wasnt the root context
		if (stackHeight > 0) {
			ModelChain.stack[0].push(context);
		}
		return this;
	};

	/**
	 * Create a new model instance, add it to the root context and use it as the current context
	 */
	ModelChain.fn.tap = function (handler) {
		var context = ModelChain.stack[ModelChain.stack.length - 1];
		handler(context);
		return this;
	};

	/**
	 * Return a new context with all the items in it
	 */
	ModelChain.fn.all = function () {
		// Push a new context on the stack
		var rootContext = ModelChain.stack[0];
		var newContext = [];
		for (var i = 0; i < rootContext.length; i = i + 1) {
			newContext.push(rootContext[i]);
		}
		ModelChain.stack.push(newContext);
		return this;
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
			var args = Array.prototype.slice.call(arguments, 0);
			var context = ModelChain.stack[ModelChain.stack.length - 1];
			for (var i = 0; i < context.length; i = i + 1) {
				args.push(context[i]);
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
			var context = ModelChain.stack[ModelChain.stack.length - 1];
			args.push(context);
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

