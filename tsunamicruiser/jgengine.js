/* Copyright (c) 2014 by Boris van Schooten tmtg.net boris@13thmonkey.org */
// Released under BSD license. See LICENSE for details.
// This file is part of jgame.js - a 2D game engine

/**
* @param {float} min - lower bound
* @param {float} max - upper bound exclusive
* @return {float}
*/
function random(min, max) {
	return min + Math.random()*(max-min);
}
/**
* @param {float} min - lower bound
* @param {float} max - upper bound exclusive
* @param {float} interval - step size
* @return {float}
*/
function randomstep(min, max, interval) {
	var steps = Math.floor(0.00001 + (max-min)/interval);
	return min + ( Math.floor(Math.random()*(steps+0.99)) )*interval;
}

// canvas - canvas to register events on
function JGEngine(canvas,logicalwidth,logicalheight) {
	this.canvas = canvas;
	this.width = logicalwidth;
	this.height = logicalheight;
	this.updateViewport();
	// input
	this.keymap = [];
	this.keymap_flankdown = [];
	for (var i=0; i<260; i++) {
		this.keymap[i] = false;
		this.keymap_flankdown[i] = false;
	}
	this.mousex = 0;
	this.mousey = 0;
	this.mousebutton = [false,false,false,false,false];
	this.mouseinside = false;

	this.touches = []; // {id,x,y}

	this.gamestates = {}; // associative array state => timer
	this.newgamestates = {}; // associative array state => timer
	this.delgamestates = []; // array of states
	this.frameskip = false;

	this.sawtouchevents = false;
	this.sawmouseevents = false;

	//var jgtouchstart = function (event) {
	//}

	//var jgtouchmove = function (event) {
	//}

	var object = this;
	document.addEventListener('keydown',
		function(event) {
			object._jgkeydown(event);
			// prevent "find as you type" from interfering with game
			event.preventDefault();
		}, false);
	document.addEventListener('keyup',
		function(event) {
			object._jgkeyup(event);
			// prevent "find as you type" from interfering with game
			event.preventDefault();
		}, false);

	canvas.addEventListener('mouseup',
		function(event) {object._jgmouseup(event);},   false);
	canvas.addEventListener('mousedown',
		function(event) {object._jgmousedown(event);}, false);
	canvas.addEventListener('mousemove',
		function(event) {object._jgmousemove(event);}, false);
	canvas.addEventListener('mouseout',
		function(event) {object._jgmouseout(event);}, false);
	//canvas.addEventListener('touchstart', jgtouchstart, false);
	//canvas.addEventListener('touchmove',  jgtouchmove,  false);
	canvas.addEventListener('touchstart',
		function(event) {
			object.sawtouchevents = true;
			object.mousebutton[1] = true;
			object._jgtouchmove(event);
			object.mouseinside = true;
			// prevent touch behaviour that interferes with game
			event.preventDefault();
		}, false);
	canvas.addEventListener('touchmove',
		function(event) {
			object.sawtouchevents = true;
			object.mousebutton[1] = true;
			object._jgtouchmove(event);
			object.mouseinside = true;
			// prevent touch behaviour that interferes with game
			event.preventDefault();
		}, false);
	canvas.addEventListener('touchend',
		function(event) {
			object.sawtouchevents = true;
			object.mousebutton[1] = false;
			object._jgtouchmove(event);
			object.mouseinside = false;
			// prevent touch behaviour that interferes with game
			event.preventDefault();
		}, false);
}


/** Check if touch events were reported. Check every frame to enable touch
 * controls */
JGEngine.prototype.sawTouchEvents = function() {
	return this.sawtouchevents;
	/* this code doesn't work, it produces false positives
	//https://hacks.mozilla.org/2013/04/detecting-touch-its-the-why-not-the-how/
	if ('ontouchstart' in window
	|| navigator.maxTouchPoints > 0
	|| navigator.msMaxTouchPoints > 0) {
		return true;
	}
	return false;
	*/
}

/** Check if touch events were reported. Check every frame to enable touch
 * controls */
JGEngine.prototype.sawMouseEvents = function() {
	return this.sawmouseevents;
}


// input

JGEngine.prototype._jgkeydown = function (event) {
	this.keymap[event.keyCode] = true;
	this.keymap_flankdown[event.keyCode] = true;
	//event.preventDefault();
}

JGEngine.prototype._jgkeyup = function (event) {
	this.keymap[event.keyCode] = false;
}

JGEngine.prototype._jgmouseup = function (event) {
	this.sawmouseevents = true;
	this.mousebutton[event.button+1] = false;
}

JGEngine.prototype._jgmousedown = function (event) {
	this.sawmouseevents = true;
	this.mousebutton[event.button+1] = true;
}

JGEngine.prototype._jgmousemove = function (event) {
	this.sawmouseevents = true;
	var rect = this.canvas.getBoundingClientRect();
	this.mousex = (event.clientX - rect.left - this.viewportxofs) 
		/ (this.viewportwidth / this.width);
	this.mousey = (event.clientY - rect.top - this.viewportyofs) 
		/ (this.viewportheight / this.height);
	this.mouseinside = true;
}

JGEngine.prototype._jgtouchmove = function (event) {
	var rect = this.canvas.getBoundingClientRect();
	if (event.touches.length >= 1) {
		var touch = event.touches[0];
		this.mousex = (touch.pageX - rect.left - this.viewportxofs) 
			/ (this.viewportwidth / this.width);
		this.mousey = (touch.pageY - rect.top - this.viewportyofs) 
			/ (this.viewportheight / this.height);
	}
	this.touches = [];
	for (var i=0; i<event.touches.length; i++) {
		var touch = event.touches[i];
		var touchx = (touch.clientX - rect.left - this.viewportxofs) 
			/ (this.viewportwidth / this.width);
		var touchy = (touch.clientY - rect.top - this.viewportyofs) 
			/ (this.viewportheight / this.height);
		this.touches.push({id: touch.identifier, x: touchx, y: touchy});
	}
	//console.log(JSON.stringify(this.touches));
}

JGEngine.prototype._jgmouseout = function (event) {
	this.sawmouseevents = true;
	this.mouseinside = false;
}

JGEngine.prototype.getKey = function(keystr) {
	return this.keymap[keystr.charCodeAt(0)];
}

JGEngine.prototype.setKey = function(keystr) {
	this.keymap[keystr.charCodeAt(0)] = true;
}

JGEngine.prototype.clearKey = function(keystr) {
	this.keymap[keystr.charCodeAt(0)] = false;
}

JGEngine.prototype.getKeyDownFlank = function(keystr) {
	return this.keymap_flankdown[keystr.charCodeAt(0)];
}

JGEngine.prototype.clearKeyDownFlank = function(keystr) {
	this.keymap_flankdown[keystr.charCodeAt(0)] = false;
}

JGEngine.prototype.getMouseX = function() {
	return this.mousex;
}

JGEngine.prototype.getMouseY = function() {
	return this.mousey;
}

JGEngine.prototype.getMouseButton = function(button) {
	return this.mousebutton[button];
}

JGEngine.prototype.setMouseButton = function(button) {
	this.mousebutton[button] = true;
}

JGEngine.prototype.clearMouseButton = function(button) {
	this.mousebutton[button] = false;
}

JGEngine.prototype.getMouseInside = function() {
	return this.mouseinside;
}

// index is player #. Use undefined or -1 to combine data from all gamepads
JGEngine.prototype.getGamepadInfo = function(index) {
	if (index===undefined) index=-1;
	// store info in data structure
	var gamepad = {
		enabled: false, // indicates that gamepads are active
		mx: 0,
		my: 0,
		fx: 0,
		fy: 0,
		dx: 0,
		dy: 0,
		buttons: false, // indicates if any of the right side buttons is pressed
		info: null // the html5 gamepad object
	};
	if (navigator.getGamepads) {
		var pads = navigator.getGamepads();
		// circumvent error in Chrome, which returns an array-like
		// thing on desktop that doesn't actually contain elements
		if (pads.length > 0 && pads[0]) {
			// add up all values from all axes
			for (var i=0; i<pads.length; i++) {
				// circumvent possible errors
				if (!pads[i] || !pads[i].axes || !pads[i].buttons) continue;
				if (index!=-1 && pads[i].index!=index) continue;
				gamepad.enabled = true;
				gamepad.info = pads[i];
				if (pads[i].axes[0] > 0.25 || pads[i].axes[0] < -0.25)
					gamepad.mx += pads[i].axes[0];
				if (pads[i].axes[1] > 0.25 || pads[i].axes[1] < -0.25)
					gamepad.my += pads[i].axes[1];
				if (pads[i].axes[2] > 0.25 || pads[i].axes[2] < -0.25)
					gamepad.fx += pads[i].axes[2];
				if (pads[i].axes[3] > 0.25 || pads[i].axes[3] < -0.25)
					gamepad.fy += pads[i].axes[3];
				for (var b=0; b<4; b++) {
					if (pads[i].buttons[b].pressed) gamepad.buttons=true;
				}
				gamepad.dx = 0;
				gamepad.dy = 0;
				if (pads[i].buttons[12].pressed) gamepad.dy = -1;
				if (pads[i].buttons[13].pressed) gamepad.dy =  1;
				if (pads[i].buttons[14].pressed) gamepad.dx = -1;
				if (pads[i].buttons[15].pressed) gamepad.dx =  1;
			}
			// clip analog axes
			if (gamepad.mx<-1) gamepad.mx = -1;
			if (gamepad.mx> 1) gamepad.mx =  1;
			if (gamepad.my<-1) gamepad.my = -1;
			if (gamepad.my> 1) gamepad.my =  1;
			if (gamepad.fx<-1) gamepad.fx = -1;
			if (gamepad.fx> 1) gamepad.fx =  1;
			if (gamepad.fy<-1) gamepad.fy = -1;
			if (gamepad.fy> 1) gamepad.fy =  1;
		}
	}
	return gamepad;
}

function deleteArrayElement(array,key) {
	var idx = array.indexOf(key);
	if (idx >= 0) array.splice(idx,1);
}


// screen handling

// (re)calculate physical canvas dimensions
// width - physical canvas width
// height - physical canvas height
JGEngine.prototype.updateViewport = function(integerscale,xborder,yborder) {
	if (!xborder) xborder=0;
	if (!yborder) yborder=0;
	var canvaswidth = this.canvas.width - 2*xborder;
	var canvasheight = this.canvas.height - 2*yborder;
	if (integerscale) {
		var xscale = Math.floor(canvaswidth / this.width);
		var yscale = Math.floor(canvasheight / this.height);
		var scale = xscale < yscale ? xscale : yscale;
		if (scale < 1) scale=1;
		this.viewportwidth = scale*this.width;
		this.viewportheight = scale*this.height;
	} else {
		var aspect = this.width/this.height;
		this.viewportwidth = canvaswidth;
		this.viewportheight = canvasheight;
		this.viewportxofs = 0;
		this.viewportyofs = 0;
		var physicalaspect = this.viewportwidth/this.viewportheight;
		if (physicalaspect > 1.02*aspect) {
			this.viewportwidth = this.viewportheight*1.02*aspect;
		} else if (physicalaspect < 0.98*aspect) {
			this.viewportheight = this.viewportwidth/(0.98*aspect);
		}
	}
	this.viewportxofs = xborder + 0.5*(canvaswidth - this.viewportwidth);
	this.viewportyofs = yborder + 0.5*(canvasheight - this.viewportheight);
}

JGEngine.prototype.setFrameskip = function(value) {
	this.frameskip = value;
}


// game states
JGEngine.prototype.inGameState = function(state) {
	return typeof this.gamestates[state] != "undefined";
}

// XXX timer=-1 means indefinitely. undefined results in undefined behaviour!
JGEngine.prototype.setGameState = function(state,timer) {
	// ignore when already set
	if (typeof this.gamestates[state] != "undefined"
	||  typeof this.newgamestates[state] != "undefined") return;
	this.newgamestates[state] = timer;
	this.delgamestates = [];
	for (var key in this.gamestates) {
		if (!this.gamestates.hasOwnProperty(key)) continue;
		this.delgamestates.push(key);
	}
}

JGEngine.prototype.addGameState = function(state,timer) {
	// ignore when already added
	if (typeof this.gamestates[state] != "undefined"
	||  typeof this.newgamestates[state] != "undefined") return;
	this.newgamestates[state] = timer;
	deleteArrayElement(this.delgamestates,state);
}

JGEngine.prototype.removeGameState = function(state) {
	// cancel if in new game states
	delete this.newgamestates[state];
	// ignore when not present
	if (typeof this.gamestates[state] == "undefined") return;
	this.delgamestates.push(state);
}

// calls start... end... and doFrame.../paintFrame methods
// according to game state
JGEngine.prototype.handleGameStates = function(gamespeed,frameskip) {
	// remove old states
	while (this.delgamestates.length > 0) {
		// copy into delstates and empty
		var delstates = this.delgamestates.slice(0);
		this.delgamestates = [];
		for (var i=0; i<delstates.length; i++) {
			var key = delstates[i];
			if (typeof(window["end"+key])=="function") {
				window["end"+key](this.gamestates[key]);
			}
			delete this.gamestates[key];
		}
		// repeat until empty
	}
	// add new states
		//var delstates = {};
		//for (var attr in this.delgamestates) {
		//	if (this.delgamestates.hasOwnProperty(attr))
		//		delstates[attr] = this.delgamestates[attr];
    	//}
	for (var key in this.newgamestates) {
		if (!this.newgamestates.hasOwnProperty(key)) continue;
		this.gamestates[key] = this.newgamestates[key];
		if (typeof(window["start"+key])=="function") {
			window["start"+key](this.gamestates[key]);
		}
	}
	this.newgamestates = {};
	// handle existing states
	for (var key in this.gamestates) {
		if (!this.gamestates.hasOwnProperty(key)) continue;
		if (typeof(window["doFrame"+key])=="function") {
			window["doFrame"+key](this.gamestates[key]);
		}
		if (!frameskip) {
			if (typeof(window["paintFrame"+key])=="function") {
				window["paintFrame"+key](this.gamestates[key]);
			}
		}
		// tick timer, expire when < 0
		if (this.gamestates[key] >= 0) {
			this.gamestates[key] -= gamespeed;
			if (this.gamestates[key] < 0) {
				this.delgamestates.push(key);
			}
		}
	}
}

