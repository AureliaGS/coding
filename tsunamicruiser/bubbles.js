/* (C) 2014 by Boris van Schooten tmtg.net boris@13thmonkey.org */


var nr_bubbles = 400;
var bubbles = [];

var nextbubble=0;

function initBubbles(gl) {
	for (var i=0; i<nr_bubbles; i++) {
		bubbles[i] = {
			alive: false,
			type: 0,
			x: 0.0,
			y: 0.0,
			size: 2.0 + 0.5*(i%7),
			xspeed: 0.0,
			yspeed: 0.0,
			timer: 0.0
		};
	}
}

function createBubble(type,xpos,ypos,xspeed,yspeed) {
	// create 1 bubble
	for (var i=0; i<nr_bubbles/10; i++) {
		nextbubble = (nextbubble+1) % nr_bubbles;
		if (bubbles[nextbubble].alive) continue;
		var idx = nextbubble;
		bubbles[idx].type = type;
		bubbles[idx].x = xpos;
		bubbles[idx].y = ypos;
		bubbles[idx].alive = true;
		bubbles[idx].xspeed = xspeed;
		bubbles[idx].yspeed = yspeed;
		bubbles[idx].timer = 0.0;
		break;
	}
}

function createParticles(x,y,xspeed,yspeed,intensity,going_down) {
	if (going_down) {
		for (var i=0; i<2*intensity; i++) {
			// bubble
			createBubble(0, x+random(-5,5),y+random(4,9),
				0.6*xspeed + random(-3,3),
				0.5*yspeed+random(-1,2) );
		}
		for (var i=0; i<1.5*intensity; i++) {
			// foam
			createBubble(1, x+random(-4,4),y-random(1,5),
				0.6*xspeed + random(-4,4),
				-0.2*yspeed + random(-3,-1) );
		}
	} else {
		for (var i=0; i<2*intensity; i++) {
			createBubble(1, x+random(-4,4),y-random(-1,4),
				0.8*xspeed + random(-2,2),
				0.8*yspeed+random(-2,2) );
		}
	}
}


function updateBubbles(gl) {
	// move and draw bubbles

	createBubble(0,random(0,width), height+10, 0, 0);

	var nr_tris=0;
	var trinrs = [];
	var trisizes = [];
	var tritypes = [];
	for (var i=0; i<nr_bubbles; i++) {
		var bubble = bubbles[i];
		if (!bubble.alive) continue;
		var wavepos = getWavePos(bubble.x);
		bubble.timer += gamespeed;
		if (bubble.type==1) { // foam
			if (bubble.y - wavepos.height >= -bubble.size && bubble.timer>5) {
				bubble.alive=false;
				continue;
			}
			bubble.yspeed += 0.15;

			bubble.x += bubble.xspeed;
			bubble.y += bubble.yspeed;
		} else {
			var depth = bubble.y - wavepos.height;
			if (depth <= bubble.size && bubble.timer>5) {
				bubble.alive=false;
				continue;
			} else if (depth < 400.0) {
				var a = 1.0 - depth/400.0;
				bubble.x += a*1.5*wavepos.xspeed;
				bubble.y += a*0.005*(wavepos.height - height/2);
			}
			bubble.yspeed -= 0.1;
			bubble.xspeed *= 0.97;
			if (bubble.yspeed < -0.5*bubble.size)
				bubble.yspeed = -0.5*bubble.size;

			bubble.x += bubble.xspeed + random(-0.5,0.5);
			bubble.y += bubble.yspeed;
		}

		if (!frameskip) {
			for (var j=0; j<3; j++) {
				linepos[6*nr_tris+2*j]   = bubble.x;
				linepos[6*nr_tris+2*j+1] = bubble.y;
				trinrs[3*nr_tris+j] = j;
				trisizes[3*nr_tris+j] = (bubble.type==1 ? 2.0 : 1.5)*bubble.size;
				tritypes[3*nr_tris+j] = bubble.type;
			}
			nr_tris++;
		}
	}

	if (!frameskip) {
		gl.useProgram(bubbleProgram.program);

		var loc = gl.getUniformLocation(bubbleProgram.program, "uScale");
		gl.uniform2f(loc, width, height);

		var loc = gl.getUniformLocation(bubbleProgram.program, "uColor");
		gl.uniform4fv(loc, [0.5, 0.5, 1.0, 1.0]);

		var loc = gl.getUniformLocation(bubbleProgram.program, "uType");
		gl.uniform1f(loc, 0);

		var aPos = gl.getAttribLocation(bubbleProgram.program, "aPos");
		bubbleProgram.setAttribute(posBuffer,aPos, nr_tris*3, 2, linepos);
		var aNr = gl.getAttribLocation(bubbleProgram.program, "aNr");
		bubbleProgram.setAttribute(nrBuffer,aNr, nr_tris*3, 1, trinrs);
		var aSize = gl.getAttribLocation(bubbleProgram.program, "aSize");
		bubbleProgram.setAttribute(sizeBuffer,aSize, nr_tris*3, 1, trisizes);
		var aType = gl.getAttribLocation(bubbleProgram.program, "aType");
		bubbleProgram.setAttribute(colorBuffer,aType, nr_tris*3, 1, tritypes);
		gl.drawArrays(gl.TRIANGLES, 0, nr_tris*3);
	}
}


