/* (C) 2014 by Boris van Schooten tmtg.net boris@13thmonkey.org */


var nr_explos = 1200;
var explos = [];

var nextexplo=0;

function initExplos(gl) {
	for (var i=0; i<nr_explos; i++) {
		explos[i] = {
			alive: false,
			x: 0.0,
			y: 0.0,
			size: 2.0 + 0.5*(i%7),
			speed: 0.0,
			ang: 0.0,
			phase: 0.0,
			dphase: 0.0,
			underwater: false,
			timer: 0.0
		};
	}
}

// create one particle
function createExplo(xpos,ypos,speed,ang,phase,dphase,duration) {
	for (var i=0; i<nr_explos/30; i++) {
		nextexplo = (nextexplo+1) % nr_explos;
		if (explos[nextexplo].alive) continue;
		var idx = nextexplo;
		var wavepos = getWavePos(xpos);
		explos[idx].x = xpos;
		explos[idx].y = ypos;
		explos[idx].alive = true;
		explos[idx].speed = speed;
		explos[idx].ang = ang;
		explos[idx].phase = phase;
		explos[idx].dphase = dphase;
		explos[idx].underwater = ypos>wavepos.height;
		explos[idx].timer = duration*random(1,2);
		break;
	}
}

function createExplosion(x,y,xspeed,yspeed,intensity) {
	var wavepos = getWavePos(x);
	// splash when below surface
	var depth = y - wavepos.height + 10;
	if (depth >= 0 && depth < 75) { // under water
		var a = (75 - depth)/75;
		addSplash(new Splash(x,15,intensity*8.0*a, 0.05, 0.0));
		createParticles(x,wavepos.height+8,0,-8,intensity*a*5,false);
		JGAudio.play("splash1-"+randomstep(0,2,1));
	} else if (depth < 0 && depth > -75) { // above water
		var a = (75 + depth)/75;
		addSplash(new Splash(x,15,intensity*8.0*a, 0.05, 3.2));
		createParticles(x,wavepos.height,0,-8,intensity*a*8,true);
		JGAudio.play("splash1-"+randomstep(0,2,1));
	}
	if (depth >= 75) {  // create more bubbles
		var a = 1.0 - (depth-75)/500;
		if (a >= 0.0) {
			addSplash(new Splash(x,15,intensity*a*4.0, 0.02, 0.0));
		}
		for (var i=0; i<intensity*10; i++) {
			createBubble(0, x+random(-5,5),y+random(-5,5),
				0.5*xspeed + random(-3,3),
				0.5*yspeed+random(-2,5) );
		}
	} else if (depth >= 0) {  // create less bubbles
		for (var i=0; i<intensity*5; i++) {
			createBubble(0, x+random(-5,5),y+random(-5,5),
				0.5*xspeed + random(-4,4),
				0.5*yspeed+random(-2,5) );
		}
	}
	new ExploCenter(x,y,0,0,5*intensity, depth>10);
	new ExploCenter(x,y,0,0,4.5*intensity, depth>10);
	new ExploCenter(x,y,0,0,4*intensity, depth>10);
	if (intensity > 10) {
		new ExploCenter(x,y,0,0,5*intensity, depth>10);
		new ExploCenter(x,y,0,0,4.5*intensity, depth>10);
	}
	var ang = random(0,Math.PI*2);
	var dang = random(0.1,1.0);
	var speed = 1.0;
	var dspeed = 8.0 / (48*intensity);
	var phaseofs = random(-1.6,1.6);
	for (var i=0; i<48*intensity; i++) {
		//var speed = random(1,7);
		//var ang = random(0,Math.PI*2);
		ang += dang;
		speed += dspeed;
		phaseofs += 0.02;
		createExplo(x+random(-2,2),y-random(-2,2),
			speed, ang, phaseofs, 0.07, 5*intensity);
			//speed, ang, 0.1*i, 0.1*Math.sin(phaseofs + 1.0*dspeed) );
			//0.5*xspeed + speed*Math.sin(ang),
			//0.5*yspeed + speed*Math.cos(ang),
	}
	if (intensity > 10) {
		JGAudio.play("bigexplo");
	} else if (intensity > 3){
		JGAudio.play("explo" + (depth>=10 ? "d" : "u") + randomstep(0,2,1));
	} else {
		JGAudio.play("hit"+randomstep(0,2,1));
	}
}


var explocoordsa = [];
var explocoordsu = [];

function updateExplos(gl) {
	var nr_coordsu=0,nr_coordsa=0;
	var splashcooldown=false;
	for (var i=0; i<nr_explos; i++) {
		var explo = explos[i];
		if (!explo.alive) continue;
		var wavepos = getWavePos(explo.x);
		explo.timer -= gamespeed;
		var xspeed = explo.speed*Math.sin(explo.ang);
		var yspeed = explo.speed*Math.cos(explo.ang);
		if (explo.y<wavepos.height) {
			explo.x += xspeed;
			explo.y += yspeed;
			if (explo.underwater && random(0,1) > 0.5) {
				createBubble(1,explo.x,explo.y,
					xspeed+random(-2,2),yspeed+random(-2,2));
				if (random(0,1) > 0.95 && !splashcooldown) {
					//addSplash(new Splash(explo.x,15,16.0, 0.1, 0.0));
					//splashcooldown=true;
				}
			}
			//explo.yspeed += 0.07;
			explo.underwater = false;
		} else {
			explo.x += 0.75*xspeed;
			explo.y += 0.75*yspeed;
		//	explo.x += 0.5*explo.xspeed;
		//	explo.y += 0.5*explo.yspeed;
			if (!explo.underwater) {
				createBubble(0,explo.x,explo.y,
					xspeed+random(-2,2),yspeed+random(-2,2));
				if (random(0,1) > 0.95 && !splashcooldown) {
					//addSplash(new Splash(explo.x,15,10.0, 0.1, 3.2));
					//splashcooldown=true;
				}
			}
			explo.underwater = true;
		}
		if (explo.timer < 30) {
			explo.speed *= 0.96;
		}
		if (explo.timer<=0) {
			explo.alive=false;
			continue;
		}
		explo.ang += 0.06*Math.sin(explo.phase);
		explo.phase += explo.dphase;
		//explo.ang += explo.dphase;
		//var ang = Math.atan2(explo.xspeed,explo.yspeed);
		//var speed = 2.0*Math.abs(explo.xspeed)+Math.abs(explo.yspeed);
		if (!frameskip) {
			if (explo.underwater) {
				explocoordsu[nr_coordsu++]= explo.x - 4.0*xspeed;
				explocoordsu[nr_coordsu++]= explo.y - 4.0*yspeed;
				explocoordsu[nr_coordsu++]= explo.x + 4.0*xspeed;
				explocoordsu[nr_coordsu++]= explo.y + 4.0*yspeed;
			} else {
				explocoordsa[nr_coordsa++]= explo.x - 4.0*xspeed;
				explocoordsa[nr_coordsa++]= explo.y - 4.0*yspeed;
				explocoordsa[nr_coordsa++]= explo.x + 4.0*xspeed;
				explocoordsa[nr_coordsa++]= explo.y + 4.0*yspeed;
			}
		}
	}

	if (!frameskip) {
		gl.useProgram(exploProgram.program);

		var loc = gl.getUniformLocation(exploProgram.program, "uScale");
		gl.uniform2f(loc, width, height);

		var uColor = gl.getUniformLocation(exploProgram.program, "uColor");
		gl.uniform4fv(uColor,
			[0.75+0.25*Math.sin(gametime),
			 0, 0.75-0.25*Math.sin(gametime), 1.0]);

		var aPos = gl.getAttribLocation(exploProgram.program, "aPos");
		exploProgram.setAttribute(posBuffer,aPos, nr_coordsu/2, 2, explocoordsu);
		gl.drawArrays(gl.LINES, 0, nr_coordsu/2);

		gl.uniform4fv(uColor, [1.0, 0.25+0.25*Math.sin(gametime), 0.0, 1.0]);

		exploProgram.setAttribute(posBuffer,aPos, nr_coordsa/2, 2, explocoordsa);
		gl.drawArrays(gl.LINES, 0, nr_coordsa/2);
	}
}


