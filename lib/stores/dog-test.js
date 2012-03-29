var Chain = require("./chain");

// A Dog constructor
function Dog(name) {
	this.name = name;
	this.distance = 0;
}

// Create a chainable model with the Dog model
var Dogs = new Chain(Dog);

// Add a single jump method that receives all dogs that are in the context
// Requires you to handle the forEach
Dogs.onAll("jump", function(howHigh, dogs) {
	dogs.forEach(function (dog) {
		console.log(dog.name + " jumps " + howHigh + " feet high!");
	});
});

Dogs.onAll({
	bark: function(context) {
		context.forEach(function (dog) {
			console.log(dog.name + " goes 'BARK!'");
		});
	},
	walk: function(howFar, context) {
		context.forEach(function(dog) {
			console.log(dog.name + " walked " + howFar + " meters away!");
			dog.distance = dog.distance + howFar;
		});
	}
});

// Add multiple methods that receive each dog that are in the context one by one
// Simpler since there is no need to handle the forEach
Dogs.onEach("sleep", function(howLong, dog) {
	console.log(dog.name + " is sleeping for " + howLong + " hours!");
});

// Add multiple methods
Dogs.onEach({
	"stay": function(dog) {
		console.log(dog.name + " is doing nothing!");
	},
	"die": function(dog) {
		console.log(dog.name + " is dead!");
	}
});


var dogs = Dogs(); // Create a new empty collection of dogs

var threeSleepingDogs = dogs
	.create("Fido") // Create a dog by calling the original constructor with these parameters
	.create("Ricky")
	.create("Sparky")
	.tap(function (dogs) {
		console.log("dogs: ", dogs);
	})
	.create("Princess")
	.create("Bobby")
	.tap(function (dogs) {
		console.log("dogs: ", dogs);
	})
	.all() // Select all available dogs
	.walk(15)
	.jump(3)
	.sleep(6)
	.tap(function (dogs) {
			console.log("threeSleepingDogs: ", dogs);
		});

// Only ricky should die
var deadRicky = dogs
		.create("Ricky")
		.die()
		.tap(function (dogs) {
				console.log("deadRicky: ", dogs);
			});
