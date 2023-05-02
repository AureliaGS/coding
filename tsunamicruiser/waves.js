/* (C) 2014 by Boris van Schooten tmtg.net boris@13thmonkey.org */

var NRPTS = 256;
var PTMUL = 1;

// size must be equal to enemies

var wavesizes = [
	[ [0,0], [1.2,3], [1.2,3] ],   //1
	[ [10,30], [1.0,2], [1.0,2] ], //2
	[ [12,50], [1.0,2], [1.0,2] ], //3
	[ [14,70], [1.5,5], [1.5,4] ], //4
	[ [18,80], [1.0,2], [1.0,2] ],//5
	[ [16,90], [2.0,6], [2.0,5] ], //6
	[ [20,110], [1.3,4], [1.3,3] ],//7
	[ [14,70], [2.0,8], [1.5,4] ], //8 repeat
	[ [18,110], [1.0,2], [1.0,2] ],//9
	[ [20,120], [1.3,4], [1.3,3] ],//10 ufo
	[ [16,90], [2.0,6], [2.0,5] ], //11 ufo
	[ [14,80], [1.5,5], [1.5,4] ], //12 ufo
	[ [20,120], [1.3,4], [1.3,3] ],//13 LOOP ufo
	[ [18,110], [1.0,2], [1.0,2] ],//14 ufo 
	[ [16,90], [2.0,6], [2.0,5] ], //15
	[ [14,70], [1.5,5], [1.5,4] ], //16
	[ [16,100], [2.0,6], [2.0,5] ], //17
	[ [20,120], [1.3,4], [1.3,3] ],//18 ufo 
];

var wavefreqs = [
	[0.08, 0.1, 0.2],//1
	[0.10, 0.2, 0.4],//2
	[0.08, 0.2, 0.4],//3
	[0.06, 0.1, 0.2],//4
	[0.05, 0.2, 0.4],//5
	[0.04, 0.1, 0.2],//6
	[0.03, 0.2, 0.4],//7
	[0.06, 0.2, 0.2],//8  repeat
	[0.05, 0.2, 0.4],//9
	[0.06, 0.1, 0.2],//10
	[0.05, 0.2, 0.4],//11
	[0.08, 0.1, 0.2],//12 
	[0.04, 0.1, 0.2],//13 LOOP
	[0.025, 0.1, 0.2],//14
	[0.07, 0.2, 0.4],//15
	[0.05, 0.2, 0.4],//16
	[0.06, 0.2, 0.4],//17
	[0.04, 0.1, 0.2],//18
];

var wavesize = [[0,0], [1.2,3], [1.2,3]];
var wavefreq = [0.08, 0.1, 0.2];

// x,y coordinate per point on the line
var waveline = [];
// the following arrays: one point per virtual pixel
var wheight = [];
var wxofs = [];
var wxspeed = [];



var MAXSPLASH=25;

function Splash(center,width,amp,freq,phase){
	this.center = center;
	this.width = width;
	this.amp = amp;
	this.freq = freq;
	this.phase = phase;
}
var splashes = [];

function addSplash(splash) {
	// find free slot
	var flattest=0;
	var flattestamp = 100.0;
	for (var i=0; i<MAXSPLASH; i++) {
		if (splashes[i]==null) {
			splashes[i] = splash;
			return;
		}
		if (splashes[i].amp < flattestamp) {
			flattestamp = splashes[i].amp;
			flattest = i;
		}
	}
	// otherwise, replace flattest wave
	splashes[flattest] = splash;
}




function getWavePos(xpos) {
	if (xpos < 0) xpos=0;
	if (xpos > width-1) xpos = width-1;
	var idx = Math.floor(xpos);
	return {
		height: wheight[idx],
		xofs: wxofs[idx],
		xspeed: wxspeed[idx]
	};
}


function getWaveMaxPos() {
	return height/2 - wavesize[0][1] - 15;
}


function initWaves(gl) {
	for (var i=0; i<width; i++) {
		wheight.push(0.0);
		wxofs.push(0.0);
		wxspeed.push(0.0);
	}
	for (var i=0; i<splashes; i++) {
		splashes[i] = null;
	}
}


function updateWaves(gl) {
	var prevx = -1;
	var prevy=0;
	var newwavesize = wavesizes[getEnemyLevel()];
	var newwavefreq = wavefreqs[getEnemyLevel()];
	for (var i=0; i<3; i++) {
		wavesize[i][0] = 0.99*wavesize[i][0] + 0.01*newwavesize[i][0];
		wavesize[i][1] = 0.99*wavesize[i][1] + 0.01*newwavesize[i][1];
		wavefreq[i] = 0.99*wavefreq[i] + 0.01*newwavefreq[i];
	}
	for (var i=0; i<NRPTS; i++) {
		var xpos = -32.0 
					+ i*((width+64.0) / (NRPTS-1));
		var xofs = 
		      - wavesize[0][0]*Math.cos(wavefreq[0]*PTMUL*i + 0.02*totalgametime)
		      - wavesize[1][0]*Math.cos(wavefreq[1]*PTMUL*i + 0.172*totalgametime)
		      - wavesize[2][0]*Math.cos(wavefreq[2]*PTMUL*i + 0.222*totalgametime);
		var ypos = height/2 
		      + wavesize[0][1]*Math.sin(wavefreq[0]*PTMUL*i + 0.02*totalgametime)
		      + wavesize[1][1]*Math.sin(wavefreq[1]*PTMUL*i + 0.172*totalgametime)
		      + wavesize[2][1]*Math.sin(wavefreq[2]*PTMUL*i + 0.222*totalgametime);
		for (var s=0; s<MAXSPLASH; s++) {
			var spl = splashes[s];
			if (spl==null) continue;
			var dist = Math.abs(xpos + xofs - spl.center);
			if (dist < spl.width) {
				var a = 1.0 - dist/spl.width;
				ypos += spl.amp*a*Math.sin(spl.phase + dist*spl.freq);
			}
		}
		xpos += xofs;
		waveline[2*i] = xpos;
		waveline[2*i+1] = ypos;
		if (xpos<0 || xpos<prevx) continue;
		if (prevx<0) prevy = ypos;
		for (var x=Math.floor(prevx)+1; x<=xpos; x++) {
			if (x >= width) continue;
			var a = (x-Math.floor(prevx))/(xpos-Math.floor(prevx));
			wheight[x] = a*ypos + (1.0-a)*prevy;
			wxspeed[x] = xofs - wxofs[x];
			wxofs[x] = xofs;
		}
		prevx = xpos;
		prevy = ypos;
	}
	// update splashes
	for (var s=0; s<MAXSPLASH; s++) {
		var spl = splashes[s];
		if (spl==null) continue;
		//System.err.println("splash "+spl.center);
		spl.amp *= 0.98;
		spl.width += 5;
		spl.phase -= 0.15;
		if (spl.amp < 1.0) splashes[s] = null;
	}
	if (!frameskip) {
		drawLine([0,0],0,1.0,1.5, [0.5, 0.5, 1.0, 1.0], waveline, NRPTS, false);
	}

}

