/* (C) 2014 by Boris van Schooten tmtg.net boris@13thmonkey.org */

// TODO
// hit sound for ufo, star
// shoot sound for ufo
// better underwater explo
// extra life sound

// constants

var width=1024, height=600;

var gamebasespeed = 1000/60;



// vars

var eng;


var gl;

var bubbleProgram, exploProgram;

var posBuffer, norm1Buffer, norm2Buffer, colorBuffer, dirBuffer;

var nrBuffer, sizeBuffer;

var lastTime = 0;
var timeElapsed = 1000/60;
var expectedTimeElapsed = 1000/60;
var gametime=0, gamespeed=1, totalgametime=0;

var frameskip=0;

var level=6, stage=0, lives=4;

var score=0;

var highscore=0;

var startlevel=0;

var nextlife=0;

var mainmenu;
var curmenu;

var font_color = [1,1,1,1];


var enemies = [
// bombers,jellyfish,ships,flyingfish,ufo,starfish
//	[    0,   0,   0,  80 ], // X
	[    0, 130,   0, 160,   0,   0 ], // 1 new: fish, jellyfish
	[  160, 110,   0,   0,   0,   0 ], // 2 new: bombers
	[  180, 130,   0, 180,   0,   0 ], // 3
	[  160,   0, 250,   0,   0,   0 ], // 4 new: ships
	[    0, 130, 270, 120,   0,   0 ], // 5
//	[    0,  90,   0,  90,   0,   0 ], //
	[  200, 150, 290, 160,   0,   0 ], // 6
	[    0, 170,   0, 190,   0, 260 ], // 7 new: starfish
	[  190,   0, 300,   0,   0, 300 ], // 8
	[  240, 190, 340, 230,   0, 320 ], // 9
	[    0, 150,   0,   0, 160,   0 ], // 10 new: ufos
	[  180,   0,   0, 170, 175,   0 ], // 11
	[    0, 220, 240, 260, 160,   0 ], // 12
//	[  240, 200, 340, 240, 220,   0 ], //
	[  290, 230, 330, 250, 330, 400 ], // 13 LOOP, balanced
	[    0, 100,   0, 120,   0, 260 ], // 14 organic/fodder, starring fish,jelly
	[  260, 200, 280, 230, 400,   0 ], // 15 mix
	[  160,   0, 210,   0, 210,   0 ], // 16 mechanical/shooters, ships/bombers
	[  190, 140, 260, 150,   0,   0 ], // 17 old set (see 6)
	[    0,   0,   0, 165, 160, 290 ], // 18 multi hitpoints, starring ufos
	//[    0,  90, 140,   0,   0,   0 ], // LOOP
	//[  120,   0, 200, 110,   0,   0 ], // 9
	//[    0,  55,   0,  55,   0,   0 ], // 10
	//[  130, 110, 220, 110,   0,   0 ], // 11
];

function getEnemyLevel() {
	var enemylevel = level;
	while (enemylevel>=enemies.length) enemylevel -= 6;
	return enemylevel;
}


var cyclecol = [
	[1, 0, 0, 1],
	[1, 1, 0, 1],
	[0, 1, 0, 1],
	[0, 1, 1, 1],
	[0, 0, 1, 1],
	[1, 0, 1, 1],
];



var gamepadcontrols = false;
var touchcontrols = false;


var gamepad;



function resizeCanvas() {
	var canvas = document.getElementById("game-canvas");
	canvas.style.width = window.innerWidth;
	canvas.style.height = window.innerHeight;
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}

function webGLStart() {
	window.addEventListener('resize', resizeCanvas, false);
	// init gl
	var canvas = document.getElementById("game-canvas");
	resizeCanvas();
	gl = createGL(canvas, {antialias:false});
	// use this to show verbose debug info in console
	//gl = WebGLDebugUtils.makeDebugContext(gl);

	eng = new JGEngine(canvas,width,height);
	eng.setGameState("Title",-1);

	bubbleProgram = new ShaderProgram(gl, "bubble-fs", "bubble-vs");
	exploProgram = new ShaderProgram(gl, "simpleline-fs", "simpleline-vs");

	gldrawInit();

	if (localStorage) {
		highscore = localStorage.getItem("highscore");
		if (!highscore) highscore=0;
	}

	// create buffers at init
	//http://stackoverflow.com/questions/23120851/webgl-deletebuffer-leaking-memory
	// line programs
	posBuffer = gl.createBuffer();
	norm1Buffer = gl.createBuffer();
	norm2Buffer = gl.createBuffer();
	colorBuffer = gl.createBuffer();
	dirBuffer = gl.createBuffer();
	// bubble program
	nrBuffer = gl.createBuffer();
	sizeBuffer = gl.createBuffer();

	tmtg_tomato = convertSvgPath(tmtg_tomato_svg/*, [-190,-100]*/, [0.1,0.1]);
	minepoly = convertSvgPath(minepoly_svg, [0.12,0.12]);
	boatpoly = convertSvgPath(boatpoly_svg, [1.0,1.0]);
	planepoly = convertSvgPath(planepoly_svg, [2.0,2.0]);
	missilepoly = convertSvgPath(missilepoly_svg, [1.0,1.0]);
	torpedopoly = convertSvgPath(torpedopoly_svg, [1.0,1.0]);
	ufopoly = convertSvgPath(ufopoly_svg, [1.0,1.0]);
	squidpoly = convertSvgPath(squidpoly_svg, [1.0,0.8]);

	unit_circle = [];
	for (var i=0; i<2*Math.PI; i+= Math.PI/12) {
		unit_circle.push(Math.sin(i));
		unit_circle.push(Math.cos(i));
	}

	// precalculate enemy animations
	for (var timer=0; timer<Math.PI*1.999; timer+=Math.PI/16) {
		var lines = [];
		for (var i=0; i<5*5; i++) {
			var iang = -Math.PI + (2/5)*Math.PI*(i % 5);// + 0.3*Math.sin(0.1*this.timer);
			var oang = i * (2*Math.PI / (5*5));
			if (Math.abs(iang)>0.8) oang += 0.2*Math.sin(i*2*Math.PI/25 + timer);
			lines.push( Math.sin(oang)*(1.0-0.75*Math.cos(iang)) );
			lines.push( Math.cos(oang)*(1.0-0.75*Math.cos(iang)) );
		}
		starfishpoly.push(lines);
		lines = [];
		for (i=Jelly.lathe.length-1; i>0; i--) {
			var ang = -timer+0.5*i;
			lines.push(-0.5*Jelly.lathe[i] + (0.4*i+2.0)*Math.sin(ang));
			lines.push(-15 + 4*i - (2.0-0.3*i)*Math.cos(ang));
		}

		for (var i=0; i<Jelly.lathe.length; i++) {
			var ang = -timer+0.5*i;
			lines.push(0.5*Jelly.lathe[i] - (0.4*i+2.0)*Math.sin(ang));
			lines.push(-15 + 4*i - (2.0-0.3*i)*Math.cos(ang));
		}
		jellypoly.push(lines);
		lines = [];
		for (var i=0; i<Fish.lathe.length; i++) {
			var sinang = Math.sin(-timer+.5*i);
			lines.push(-15+ 5*i + (0.2*i+0.0)*sinang);
			lines.push( 0.6*Fish.lathe[i] + (0.4*i+2.0)*sinang);
		}

		for (i=Fish.lathe.length-1; i>0; i--) {
			var sinang = Math.sin(-timer+0.5*i);
			lines.push(-15+  5*i + (0.2*i+0.0)*sinang);
			lines.push(-0.6*Fish.lathe[i] + (0.4*i+2.0)*sinang);
		}
		fishpoly.push(lines);

	}


	JGAudio.load("explod0","sounds/explodii-1");
	JGAudio.load("explod1","sounds/explodii-2");
	JGAudio.load("explod2","sounds/explodii-3");
	JGAudio.load("explou0","sounds/explou-1");
	JGAudio.load("explou1","sounds/explou-2");
	JGAudio.load("explou2","sounds/explou-3");
	JGAudio.load("hit0","sounds/hit1");
	JGAudio.load("hit1","sounds/hit1b");
	JGAudio.load("hit2","sounds/hit1c");
	//JGAudio.load("explou0","sounds/impact3");
	//JGAudio.load("explou1","sounds/impact3b");
	//JGAudio.load("explou2","sounds/impact3c");
	JGAudio.load("splash1-0","sounds/splash3");
	JGAudio.load("splash1-1","sounds/splash3b");
	JGAudio.load("splash1-2","sounds/splash3c");
	JGAudio.load("bigexplo","sounds/playerexplo1");
	JGAudio.load("startlevel","sounds/startlevel");
	JGAudio.load("dropbomb","sounds/dropbomb1");
	JGAudio.load("extralife","sounds/notify1");
	//JGAudio.load("extralife","sounds/extralife2");
	JGAudio.load("splash2-0","sounds/splash2");
	JGAudio.load("splash2-1","sounds/splash2b");
	JGAudio.load("splash2-2","sounds/splash2c");
	JGAudio.load("laser0","sounds/laser2");
	JGAudio.load("laser1","sounds/laser2b");
	JGAudio.load("laser2","sounds/laser2c");
	JGAudio.load("music","sounds/BitBurnerLazerBlazer3-soft_crop");

	if (!music_started) {
		JGAudio.play("music","music",true);
		music_started=true;
	}


	// create menus
	mainmenu = new JGMenu(drawLogo);
	mainmenu.addMenuItem(drawMenuItemStatic,selMenuStartGame,
		{ ypos: 250, text: "START GAME" });
	mainmenu.addMenuItem(drawMenuItemLevel,selMenuLevel,{ypos: 300});
	//mainmenu.addMenuItem(drawMenuItemSound,selMenuSound,{ypos: 500});
	//mainmenu.addMenuItem(drawMenuItemMusic,selMenuMusic,{ypos: 600});
	//mainmenu.addMenuItem(drawMenuItemDonate,selMenuDonate,{ypos: 700});

	var optionsmenu = new JGMenu(null,drawMenuItemStatic,
		{ ypos:350, text: "BACK" });
	mainmenu.addSubmenu(drawMenuItemStatic,optionsmenu,
		{ ypos:350, text: "OPTIONS" });
	optionsmenu.addMenuItem(drawMenuItemSound,selMenuSound,{ypos:250});
	optionsmenu.addMenuItem(drawMenuItemMusic,selMenuMusic,{ypos:300});

	var creditsmenu = new JGMenu(drawCredits,drawMenuItemStatic,
		{ ypos:450, text: "BACK" });
	mainmenu.addSubmenu(drawMenuItemStatic,creditsmenu,
		{ ypos:400, text: "CREDITS" });

	if (window.navigator.paymentSystem 
	&& window.navigator.paymentSystem.getType()=="ouya") {
		window.navigator.paymentSystem.init(
			"f2ab665e-217f-41fc-98d6-bbdaa6ced57c");
		mainmenu.addMenuItem(drawMenuItemDonate,selMenuDonate,{ypos: 450});
	}



	unit_spirals = [];
	vals = [-1.0,-0.8,-0.7,-0.5,0.5,0.7,0.8,1.0];
	for (var v=0; v<vals.length; v++) {
		var i = vals[v];
		var unit_spiral = [];
		for (var a=0; a<2*Math.PI; a+=Math.PI/24) {
			var wave = 0.5*Math.sin(9*a*i);
			unit_spiral.push(Math.sin(i*a)*(2.0+0.15*a*a+wave)/(Math.PI*2));
			unit_spiral.push(Math.cos(i*a)*(2.0+0.15*a*a+wave)/(Math.PI*2));
		}
		unit_spirals.push(unit_spiral);
	}

	//https://hacks.mozilla.org/2013/04/detecting-touch-its-the-why-not-the-how/
	if ('ontouchstart' in window
	|| navigator.maxTouchPoints > 0
	|| navigator.msMaxTouchPoints > 0) {
		touchcontrols=true; 
	}

	initWaves(gl);
	initBubbles(gl);
	initExplos(gl);

	// start animation
	webGLFrame();
}




function drawMenuItemStatic(is_active,menu,menuitem) {
	return drawMenuText(is_active,menu,menuitem,menuitem.userdata.text);
}

function drawMenuText(is_active,menu,menuitem,text) {
	var size = is_active ? 13+1*Math.sin(0.1*menu.animtimer) : 11;
	var thick = is_active ? 2.0 : 1.0;
	drawText(text,width/2, menuitem.userdata.ypos,
		size,size, thick, font_color, 0, is_active ? 0 : 0.5);
	return {x:width/6, width:2*width/3, y:menuitem.userdata.ypos-25, height:70};
}

function selMenuStartGame(menu) {
	eng.setGameState("Game",-1);
	eng.addGameState("NewLevel",150);
	eng.addGameState("NewLife",150);
}


function drawMenuItemLevel(is_active,menu,menuitem) {
	return drawMenuText(is_active,menu,menuitem, "START AT LEVEL "+(startlevel+1));
}

function selMenuLevel(menu) {
	startlevel++;
	if (startlevel >= 18) startlevel = 0;
}

function drawMenuItemDonate(is_active,menu,menuitem) {
	var st = window.navigator.paymentSystem.checkReceipt("tsunami_cruiser_donate_0_99");
	return drawMenuText(is_active,menu,menuitem, st==1
		? "THANKS FOR YOUR DONATION!"
		: (st==-1  ? "DONATE $0.99" : "") );
}

function selMenuDonate(menu) {
	window.navigator.paymentSystem.requestPayment("tsunami_cruiser_donate_0_99");
}


function drawMenuItemSound(is_active,menu,menuitem) {
	return drawMenuText(is_active,menu,menuitem, "SOUND " +
		(JGAudio.isEnabled() ? "ENABLED" : "DISABLED") );
}

function selMenuSound(menu) {
	if (JGAudio.isEnabled()) {
		JGAudio.disable();
	} else {
		JGAudio.enable();
	}
}
function selMenuMusic(menu) {
	if (JGAudio.isEnabled("music")) {
		JGAudio.disable("music");
	} else {
		JGAudio.enable("music");
		JGAudio.play("music","music",true);
	}
}

function drawMenuItemMusic(is_active,menu,menuitem) {
	return drawMenuText(is_active,menu,menuitem, "MUSIC " +
		(JGAudio.isEnabled("music") ? "ENABLED" : "DISABLED") );
}

function drawLogo(menu) {
	//drawText("A TMTG.NET GAME",width/2,155,8,8,2,font_color,0,0.5);;
}

function drawCredits(menu) {
	drawText("GAME BY BORIS VAN SCHOOTEN",width/2,250,11,11,1.0,font_color,0,0.5);;
	drawText("BASED ON THE LD48 GAME.",width/2,300,11,11,1.0,font_color,0,0.5);;
	drawText("MUSIC",width/2,350,11,11,1.0,font_color,0,0.5);;
	drawText("'LAZER BLAZER' BY BITBURNER",width/2,400,11,11,1.0,font_color,0,0.5);;
}






function webGLFrame() {
	// anim handling

	requestGLFrame(webGLFrame);

	var timeNow = new Date().getTime();
	if (lastTime != 0) {
		timeElapsed = timeNow - lastTime;
		//gamespeed = timeElapsed / gamebasespeed;
		gamespeed = 1;
		//gametime += gamespeed;
		gametime++;
		totalgametime += gamespeed;
	}
	lastTime = timeNow;
	if (timeElapsed >= 1000/45) {
		frameskip=1;
		doWebGLFrame();
		lastTime = new Date().getTime();
		gamespeed = 1;
		//gametime += gamespeed;
		gametime++;
		totalgametime += gamespeed;
	}
	frameskip=0;
	doWebGLFrame();
}

function doWebGLFrame() {

	// read gamepads
	gamepad = eng.getGamepadInfo();
	gamepadcontrols = gamepad.enabled;


	// init gl

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
	//gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	// clear entire canvas
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	gl.clear(gl.COLOR_BUFFER_BIT);
	//gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	// then set viewport to preserve aspect ratio
	eng.updateViewport();
	gl.viewport(eng.viewportxofs,eng.viewportyofs,eng.viewportwidth,eng.viewportheight);


	drawLineInitFrame(width,height);
	drawLineSegmentsInitFrame(width,height);

	// mouse cursor

	var ang = Math.PI + Math.PI/4;
	var player = JGObject.getObject("player");
	var pointerx = eng.getMouseX();
	var pointery = eng.getMouseY();
	if (player) {
		if (player.fireofsx!=0 || player.fireofsy!=0) {
			pointerx = player.x + player.fireofsx;
			pointery = player.y + player.fireofsy;
			//console.log("######"+pointerx+" "+pointery);
		}
		ang = Math.atan2(pointerx - player.x,
		                 pointery - player.y);
	}
	if (!gamepadcontrols && !frameskip) {
		var color = cyclecol[Math.floor(gametime/4) % cyclecol.length];
		drawLine([pointerx,pointery], Math.PI-ang, 20.0, 2,
			color, unit_arrow, unit_arrow.length/2, true, "unit_arrow");
	}

	// update state

	updateWaves(gl);

	updateBubbles(gl);
	updateExplos(gl);

	JGObject.updateObjects(gl,frameskip,0,0,width,height,0,null);

	JGObject.checkCollision(2,1); // enemies hit player
	JGObject.checkCollision(4,2); // bullets hit enemies

	// game states:
	// Title - title screen
	// Game - remains active from start game till game over
	// During Game, the following states are found:
	//   NewLevel - start new level sequence
	//   LevelDone - finish current level sequence
	//   NewLife - start with new life sequence
	//   LifeLost - lose life sequence
	//   GameOver - game over sequence
	eng.handleGameStates(1,frameskip);

	if (!frameskip) {
		drawText(""+score,90,60,12,12,1,font_color,-1,0);
		if (eng.inGameState("Title")) {
			drawText("HIGH "+highscore,width/2,60,12,12,1,font_color,0,0);
		}
		drawText(""+lives,width-60,60,12,12,1,font_color,1,0);
		drawLine([width-60-75,60],0.0, 1.0, 2, font_color,
			boatpoly, boatpoly.length/2, true, "boat");
	}

}

function checkTime(start,end,period) {
	return (gametime >= start && gametime < end
	&& Math.floor((gametime-start)%Math.floor(period))==0);
}


// game states: transitions

var music_started=false;

function startGame(timer) {
	//if (window.navigator.paymentSystem) 
	//	window.navigator.paymentSystem.requestPayment("tsunami_cruiser_donate_0_99");
	score = 0;
	nextlife=1000;
	level = startlevel;
	stage = startlevel;
	lives = 4;
}

function startNewLevel(timer) {
	//JGObject.removeObjects(null,0);
	gametime=0;
	JGAudio.play("startlevel");
}

function startNewLife(timer) {
	JGObject.removeObjects(null,0);
	new Player();
}

function startLifeLost(timer) {
}

function endLifeLost(timer) {
	lives--;
	if (lives<=0) {
		eng.addGameState("GameOver",200);
	} else {
		eng.addGameState("NewLife",150);
	}
}

function endGameOver(timer) {
	JGObject.removeObjects(null,0);
	totalgametime=0;
	gametime=0;
	if (score > highscore && localStorage) {
		highscore = score;
		localStorage.setItem("highscore",highscore);
	}
	eng.setGameState("Title",-1);
}

// game states: updates and paints

var endgametime = 1800;


function doFrameGame(timer) {
	// enemies
	var enemy = enemies[getEnemyLevel()];
	if (enemy[0]!=0 && checkTime(20,endgametime,enemy[0]))
		new Bomber();
	if (enemy[1]!=0 && checkTime(10,endgametime,enemy[1]))
		new Jelly();
	if (enemy[2]!=0 && checkTime(30,endgametime,enemy[2]))
		new EnemyShip();
	if (enemy[3]!=0 && checkTime(0,endgametime,enemy[3]))
		new Fish();
	if (enemy[4]!=0 && checkTime(30,endgametime,enemy[4]))
		new UFO();
	if (enemy[5]!=0 && checkTime(40,endgametime,enemy[5]))
		new Starfish(2,0,0,random(0.75*Math.PI,1.25*Math.PI));
	if (gametime>=endgametime && JGObject.countObjects("enemy",0)==0) {
		eng.addGameState("LevelDone",150);
	}
	if (score>=nextlife) {
		if (lives<9) {
			lives++;
			ingamemsg1 = "";
			ingamemsg2 = "EXTRA LIFE!";
			eng.addGameState("Message",250);
			JGAudio.play("extralife");
		}
		nextlife+=1000;
	}
	if (level==0 && gametime==200) {
		if (gamepadcontrols) {
			ingamemsg1 = "LEFT STICK TO MOVE";
			ingamemsg2 = "RIGHT STICK TO AIM";
		} else if (touchcontrols) {
			ingamemsg1 = "SWIPE LEFT SIDE TO MOVE";
			ingamemsg2 = "SWIPE RIGHT SIDE TO AIM";
		} else {
			ingamemsg1 = "A/D TO MOVE";
			ingamemsg2 = "MOUSE TO AIM";
		}
		eng.addGameState("Message",250);
	}
	//if (eng.getKey("L"))
	//	eng.addGameState("LevelDone",150);
}

var desctexts = [
"RULE THE WAVES!",
"DESTROY EVERYTHING",
"SURVIVE",
"DON'T GET SEASICK!",
"MUSIC BY BITBURNER",
]

function startTitle(timer) {
	JGObject.removeObjects(null,0);
	for (var i=0; i<5; i++) 
		new Fish();
	eng.clearMouseButton(1);
	curmenu = mainmenu;
}


function doFrameTitle(timer) {
	/*if ((gamepadcontrols && gamepadbut)
	||  (!gamepadcontrols && eng.getMouseButton(1))
	) {
		eng.setGameState("Game",-1);
		eng.addGameState("NewLevel",150);
		eng.addGameState("NewLife",150);
		eng.clearMouseButton(1);
	}*/
	curmenu = curmenu.update(!gamepadcontrols,eng.getMouseX(),eng.getMouseY(),
		(eng.getMouseButton(1) && !touchcontrols && !gamepadcontrols)
		|| (!gamepadcontrols && eng.touches.length>0),
			gamepad.my<-0.7 || gamepad.fy<-0.7 || gamepad.dy < -0.5,
			gamepad.my> 0.7 || gamepad.fy> 0.7 || gamepad.dy > 0.5,
			gamepad.buttons);
}

function paintFrameTitle(timer) {
	drawText("TSUNAMI CRUISER",width/2,110,17,17,1.5,[1.0,1.0,1.0,1.0],0,2);
	//drawText("L STICK TO MOVE",width/2,350,12,12,1.5,[1.0,1.0,1.0,1.0],0,2);
	//drawText("R STICK TO AIM",width/2,390,12,12,1.5,[1.0,1.0,1.0,1.0],0,2);
	//if (window.navigator.paymentSystem) 
	//	drawText("DONATION!" + window.navigator.paymentSystem.checkReceipt(
	//		"tsunami_cruiser_donate_0_99"),
	//		width/2,470,12,12,1.5,[1.0,1.0,1.0,1.0],0,2);
	//drawText("MOUSE BUTTON TO TOGGLE FIRE",width/2,430,12,12,1.5,[1.0,1.0,1.0,1.0],0,0);

	curmenu.paint();

	var phase = Math.floor(gametime/250);
	var te = gametextEasing(250 - (gametime-phase*250),250);
	phase = phase % desctexts.length;
	drawText(desctexts[phase],width/2,170,te.size*12,te.size*12,1.5,
		[te.alpha,te.alpha,te.alpha,1.0],0,3+50*te.amp);

	drawLine([400,height-70],0, 1.0, 1, [0.0,1.0,0.0,1.0],
		tmtg_tomato, tmtg_tomato.length/2, true, "tmtg_tomato");
	drawText("=",400+5,height-70, 20,20, 1.5,[1.0,0.1,0.0,1.0],0,0);
	drawText("TMTG.NET",530,height-70, 10,10, 1.5,[1.0,0.1,0.0,1.0],0,0);
}

function gametextEasing(timer,maxtimer) {
	var a=0.0, b=1.0, s=1.0;
	if (timer > maxtimer/2) {
		a = (timer-maxtimer/2)/(maxtimer/2);
		b = 1.0 - a;
		s = 1.5 - 0.5*Math.sqrt(b);
	} else if (timer < maxtimer/10) {
		a = 0.0;
		b = timer/(maxtimer/10);
	}
	return {alpha: b, amp: a, size: s};
}

function paintFrameLevelDone(timer) {
	var te = gametextEasing(timer,150);
	drawText("CLEARED LEVEL "+(stage+1),width/2,120,te.size*17,te.size*17,1.5,
		[te.alpha,te.alpha,te.alpha,1.0],0,3+50*te.amp);
}

function endLevelDone(timer) {
	level++;
	if (level > startlevel) startlevel = level;
	//if (level >= enemies.length) level -= 4;
	stage++;
	eng.addGameState("NewLevel",150);
}

function paintFrameNewLevel(timer) {
	var te = gametextEasing(timer,150);
	drawText("LEVEL "+(stage+1),width/2,120,te.size*17,te.size*17,1.5,
		[te.alpha,te.alpha,te.alpha,1.0],0,3+50*te.amp);
}

function paintFrameNewLife(timer) {
	var te = gametextEasing(timer,150);
	drawText("GET READY!",width/2,180,te.size*17,te.size*17,1.5,
		[te.alpha,te.alpha,te.alpha,1.0],0,3+50*te.amp);
}

function paintFrameLifeLost(timer) {
	var te = gametextEasing(timer,150);
	drawText("CRUISER DESTROYED!",width/2,180,te.size*17,te.size*17,1.5,
		[te.alpha,te.alpha,te.alpha,1.0],0,3+50*te.amp);
}

function paintFrameGameOver(timer) {
	var te = gametextEasing(timer,200);
	drawText("GAME OVER",width/2,180,te.size*17,te.size*17,1.5,
		[te.alpha,te.alpha,te.alpha,1.0],0,3+50*te.amp);
}


var ingamemsg1="", ingamemsg2="";

function paintFrameMessage(timer) {
	var te = gametextEasing(timer,250);
	var col = [font_color[0],font_color[1],font_color[2],te.alpha];
	drawText(ingamemsg1,width/2,120,16*te.size,16*te.size,1.5,
		[te.alpha,te.alpha,te.alpha,1.0],0,3+50*te.amp);
	drawText(ingamemsg2,width/2,230,16*te.size,16*te.size,1.5,
		[te.alpha,te.alpha,te.alpha,1.0],0,3+50*te.amp);
}



// ---------------------------------------------------------
// Polygons
// ---------------------------------------------------------

var unit_arrow = [
	0, -1,
	-1,0,
	-0.5,0,
	-0.5,1,
	0.5,1,
	0.5,0,
	1,0,
];

var tmtg_tomato_svg = [
-18.571429,29.285711,
121.428576,72.14286,
-123.571433,67.14286,
21.428572,31.42857,
120.000001,-64.28572,
0.71428,136.42858,
32.14286,-0.71429,
1.42857,-135.71429,
118.57143,68.57143,
17.14286,-32.14285,
-112.85714,-70,
117.14285,-68.57143,
-20.71428,-27.85715,
-121.42857,69.28572,
1.42857,-143.57143,
-29.28572,0,
-0.71428,139.28571
];

var tmtg_tomato;

var unit_circle;

var unit_spirals;

var starfishpoly = [];

var fishpoly = [];

var jellypoly = [];

var minepoly;
var minepoly_svg = [
	21.78572,29.28572,
	-8.92857,13.57143,
	-3.92858,13.57143,
	-35.35714,6.78571,
	34.28571,5,
	5.35715,16.07143,
	7.14286,14.28571,
	-20.35715,28.57143,
	28.21429,-20.35714,
	15.35714,7.14286,
	14.28571,3.57142,
	5.35715,34.64286,
	4.64285,-34.28571,
	16.42858,-3.92858,
	14.64286,-8.57142,
	27.49999,21.78571,
	-19.28571,-27.5,
	6.78571,-15.35714,
	3.57143,-15.35714,
	35.35715,-5.35715,
	-33.92858,-6.07143,
	-5.35714,-15,
	-7.5,-12.14285,
	20.71429,-30.35715,
	-28.57143,22.85715,
	-13.92857,-10.35715,
	-14.64286,-3.21428,
	-5.71428,-35.714288,
	-8.57143,35.357148,
	-12.85715,4.64285,
	-14.64285,6.42857,
];



var boatpoly;
var boatpoly_svg = [
	-12.32143,-0.22317,
	-0.17857,-7.36608,
	-6.42856,-0.0446,
	0.26787,9.44195,
	-4.55356,-0.0223,
	0,7.67858,
	-7.50001,0,
	0,3.21429,
	2.14285,6.78572,
	5.71427,2.4999,
	23.57142,0,
	6.07143,-3.21429,
	3.21429,-4.64286,
	0.35714,-4.64286,
	-10.35714,0
];


var planepoly;
var planepoly_svg = [
	-3.32415,-0.12627,
	-7.97815,7.35316,
	-6.16072,0,
	-3.125,2.23215,
	3.39286,1.78571,
	5.62499,0.0893,
	8.35063,7.20522,
	3.39811,-0.0523,
	-4.43365,-7.24221,
	3.98088,-0.0893,
	2.83548,1.69644,
	-0.12628,-6.83802,
	-2.45666,1.48087,
	-4.13779,0
];


var missilepoly;
var missilepoly_svg = [
	19.06663,-3.78807,
	-3.40927,3.78807,
	3.40927,3.66181
]

var torpedopoly;
var torpedopoly_svg = [
	19.06663,-3.78807,
	3.15672,3.6618,
	-3.15672,3.78808,
]

var ufopoly;
var ufopoly_svg = [
	-8.21429,2.5,
	-3.57143,3.21429,
	-1.07143,6.60714,
	9.28571,0,
	1.78572,4.10714,
	10.71429,0,
	1.60714,-4.10714,
	9.10714,0,
	-0.35714,-5.89286,
	-3.0843,-3.17096,
	-7.5,-3.0,
]

var squidpoly;
var squidpoly_svg = [
-3.25498,4.18854,
-1.64784,8.8314,
2.92585,-0.1046,
-0.57904,5.01487,
-1.4846,5.6298,
-1.28807,7.32886,
3.91807,-6.89775,
1.88506,-6.31345,
0.25253,7.57614,
-1.51523,6.06092,
4.04061,-7.32361,
0,-6.81853,
2.24221,8.16788,
3.56092,6.36204,
-1.25744,-6.70123,
-1.51523,-7.82869,
-0.72698,-4.40519,
3.283,-0.60967,
-2.42077,-8.18474,
-3.49221,-4.07759
];




// convert svg path to vector coordinates
// svg: array of move vectors
// offset: offset of first point [x,y]
// scale: [x,y] multiplier of each svg vector
// returns array of line coords
function convertSvgPath(svg, scale) {
	var pos = [0,0];
	var bounds = [30000,30000,-30000,-30000];
	for (var i=0; i<svg.length; i+=2) {
		pos[0] += svg[i];
		pos[1] += svg[i+1];
		if (bounds[0] > pos[0]) bounds[0] = pos[0];
		if (bounds[1] > pos[1]) bounds[1] = pos[1];
		if (bounds[2] < pos[0]) bounds[2] = pos[0];
		if (bounds[3] < pos[1]) bounds[3] = pos[1];
	}
	var center = [
		(bounds[2] + bounds[0])/2,
		(bounds[3] + bounds[1])/2,
	];
	pos = [-center[0]*scale[0], -center[1]*scale[1]];
	//var pos = [offset[0]*scale[0], offset[1]*scale[1]];
	var ret = [];
	ret.push(pos[0],pos[1]);
	for (var i=0; i<svg.length; i+=2) {
		pos[0] += svg[i]*scale[0];
		pos[1] += svg[i+1]*scale[1];
		ret.push(pos[0],pos[1]);
	}
	return ret;
}


// Game objects

// --------------------------------------------------------------------
// Explo
// --------------------------------------------------------------------

function ExploCenter(x,y,xspeed,yspeed,intensity,type) {
	JGObject.apply(this,["enemy",true,x,y, 0]);
	this.xspeed = xspeed;
	this.yspeed = yspeed;
	this.size = intensity*random(0.7,0.9);
	this.timer = 0;
	this.type=type;
	this.angspeed = randomstep(-1,1,2)*random(0.02,0.05);
	this.spiralnr = randomstep(0,unit_spirals.length-1,1);
}

ExploCenter.prototype = new JGObject();


ExploCenter.prototype.move = function() {
	this.timer += gamespeed;
	//if (this.size - this.timer < 10) {
	//	this.angspeed *= 0.99;
	//}
	if (this.timer > this.size) this.remove();
}

ExploCenter.prototype.paint = function(gl) {
	//for (var i=this.timer; i>0; i -= 10) {
		var thick1 = (this.size - this.timer) / this.size;
		//var thick2 = (this.size - i) / this.size;
		for (var i=0; i<Math.PI*2; i+= Math.PI*2/3) {
			drawLine([this.x,this.y],
				this.timer*this.angspeed+i,
				1+2.7*this.timer,
				15.0*thick1,
				this.type==0
					? [1.0, thick1, 0.0, 1.0]
					: [1.0-0.125*thick1, 1.0*thick1, 0.25-0.25*thick1, 1.0],
				unit_spirals[this.spiralnr],
				unit_spirals[this.spiralnr].length/2, false,
				"unit_spirals"+this.spiralnr);
		}
			//unit_circle, unit_circle.length/2, true);
	//}
}


// --------------------------------------------------------------------
// Starfish
// --------------------------------------------------------------------

function Starfish(size,x,y,ang) {
	JGObject.apply(this,["enemy",true,0,0, 2]);
	if (!x) {
		this.x = random(width/5, 4*width/5);
	} else {
		this.x = x;
	}
	if (!y) {
		this.y = height+50;
	} else {
		this.y = y;
	}
	var sz = 8 + 5*size;
	this.setBBox(-sz,-sz,2*sz,2*sz);
	this.timer = 0;
	this.animspeed = random(0.3,0.5);
	this.hp = size==0 ? 1 : 2;
	this.size = size;
	this.ang = ang;
	this.speed = 1.5;
	if (this.size==0) this.speed = 3.0;
	this.xspeed = this.speed*Math.sin(this.ang);
	this.yspeed = this.speed*Math.cos(this.ang);
}

Starfish.prototype = new JGObject();


Starfish.prototype.move = function() {
	var wavepos1 = getWavePos(this.x-5);
	var wavepos2 = getWavePos(this.x+5);
	var slope = -Math.PI/2 + Math.atan2(10,wavepos2.height-wavepos1.height);
	var depth = this.y - wavepos1.height;
	if (depth > 0.0 && depth < 400.0) {
		var a = 1.0 - depth/400.0;
		this.x += a*1.5*wavepos1.xspeed;
	}
	this.timer += this.animspeed;
	if (this.x<60 && this.xspeed < 0) this.xspeed = -this.xspeed;
	//if (this.y<0 && this.yspeed < 0) this.yspeed = -this.yspeed;
	if (this.x>width-60 && this.xspeed > 0) this.xspeed = -this.xspeed;
	if (this.y>height-30 && this.yspeed > 0) this.yspeed = -this.yspeed;
	if (this.y < wavepos1.height) {
		this.xspeed = this.speed*Math.sin(slope);
		this.yspeed = this.speed*Math.cos(slope);
		// do not go above water
		this.y = wavepos1.height;
	}
	this.ang = Math.atan2(this.xspeed,this.yspeed);
	this.x += Math.sin(0.5*this.animspeed*this.timer)*Math.sin(this.ang);
	this.y += Math.sin(0.5*this.animspeed*this.timer)*Math.cos(this.ang);
	if (this.size==0) {
		var player = JGObject.getObject("player");
		if (player!=null) {
			if (this.x<player.x-20) this.xspeed += 0.03;
			if (this.x>player.x+20) this.xspeed -= 0.03;
			if (this.y<player.y-20) this.yspeed += 0.03;
			if (this.y>player.y+20) this.yspeed -= 0.03;
			this.xspeed *= 0.99;
			this.yspeed *= 0.99;
		}
	}
}


Starfish.prototype.hit = function(o) {
	this.hp--;
	if (this.hp<=0) {
		this.remove();
		o.remove();
		createExplosion(this.x,this.y,this.xspeed,this.yspeed,6+1*this.size);
		score += this.size==0 ? 10 : 25;
		if (this.size>0) {
			new Starfish(0,this.x,this.y, -0.5*Math.PI);
			new Starfish(0,this.x,this.y, -0.25*Math.PI);
			new Starfish(0,this.x,this.y, 0);
			new Starfish(0,this.x,this.y, 0.25*Math.PI);
			new Starfish(0,this.x,this.y, 0.5*Math.PI);
		}
	} else {
		o.remove();
		createExplosion(o.x,o.y,this.xspeed,this.yspeed,2);
	}
}

Starfish.prototype.paint = function(gl) {
	var frame = Math.floor(this.timer) % starfishpoly.length;
	drawLine([this.x,this.y],-Math.PI-this.ang, 7+5*this.size,
		0.75+0.5*this.size, [0.2, 0.9, 1.0, 1.0],
		starfishpoly[frame], starfishpoly[frame].length/2, true,
			"starfish"+frame);
	/*drawLine([this.x,this.y],-Math.PI-this.ang, 1.0+0.5*this.size,
		1.0,[0.0, 1.0, 1.0, 1.0],
		squidpoly, squidpoly.length/2, true, "squid");*/
	/*var lines = [];
	for (var i=0; i<5*5; i++) {
		var iang = -Math.PI + (2/5)*Math.PI*(i % 5);// + 0.3*Math.sin(0.1*this.timer);
		var oang = i * (2*Math.PI / (5*5));
		if (Math.abs(iang)>0.8) oang += 0.2*Math.sin(i*2*Math.PI/25 + 0.1*this.timer);
		lines.push( Math.sin(oang)*(1.0-0.75*Math.cos(iang)) );
		lines.push( Math.cos(oang)*(1.0-0.75*Math.cos(iang)) );
	}
	drawLine([this.x,this.y],-Math.PI-this.ang,
		7 + 5*this.size, 1.5, [0.0, 1.0, 1.0, 1.0],
		lines, lines.length/2, true);*/
}




// --------------------------------------------------------------------
// UFO and Laser
// --------------------------------------------------------------------

function UFO() {
	JGObject.apply(this,["enemy",true,0,0, 2]);
	this.x = random(width/5, 4*width/5);
	this.y = -50;
	this.yspeed=0.3;
	this.setBBox(-12,-7,24,14);
	this.timer = 0;
	this.bultimer=0;
	this.animspeed=random(0.06,0.14);
	this.hp = 3;
}

UFO.prototype = new JGObject();


UFO.prototype.move = function() {
	this.timer++;
	this.x += 2.0*Math.sin(this.timer*0.02);
	if (this.y >= getWaveMaxPos()-30) {
		if (this.yspeed>-0.6) this.yspeed -= 0.03;
		this.bultimer--;
		if (this.bultimer<0) {
			this.bultimer=8;
			var player = JGObject.getObject("player");
			if (player!=null) {
				JGAudio.play("laser"+randomstep(0,2,1));
				new Laser(this.x,this.y+10,
					Math.atan2(player.x-this.x,player.y-this.y)
					+random(-0.2,0.2) );
			}
		}
	}
	if (this.y<=20 && this.yspeed < 0.6) this.yspeed += 0.03;
}


UFO.prototype.hit = function(o) {
	this.hp--;
	if (this.hp<=0) {
		this.remove();
		o.remove();
		createExplosion(this.x,this.y,this.xspeed,this.yspeed,8);
		score += 25;
	} else {
		o.remove();
		createExplosion(o.x,o.y,this.xspeed,this.yspeed,2);
	}
}

var ufowindow1 = [-1,-2, 1,-2, 1,2, -1,2];
var ufowindow2 = [-0.5,-2, 0.5,-2, 0.5,2, -0.5,2];

UFO.prototype.paint = function(gl) {
	var ang = Math.sin(this.animspeed*this.timer);
	var winx = Math.sin( Math.PI*(-0.5 + (0.2*this.animspeed*this.timer)%1) );
	var winpoly = Math.abs(winx) < 0.6 ? ufowindow1 : ufowindow2;
	var winpolystr = Math.abs(winx) < 0.6 ? "ufowindow1" : "ufowindow2";
	var winx = 22*winx;
	var winy = 0.2*winx*ang;
	drawLine([this.x+winx,this.y+winy], 0.15*ang, 2.0, 1.5, [1.0, 0.2, 1.0, 1.0],
		winpoly, winpoly.length/2, true, winpolystr);
	drawLine([this.x,this.y],0.15*ang,
		1.5, 1.5, [1.0, 0.2, 1.0, 1.0],
		ufopoly, ufopoly.length/2, true, "ufo");
}


var laserpoly = [
	-0.5, -1,
	 0.0, -0.75,
	 0.5, -0.5,
	 0.0, -0.25,
	-0.5,  0,
	 0.0,  0.25,
	 0.5,  0.5,
	 0.0,  0.75,
	-0.5,  1,
];

function Laser(x,y,ang) {
	JGObject.apply(this,["bullet",true,x,y, 2]);
	this.ang = ang;
	this.xspeed = 3.0*Math.sin(ang);
	this.yspeed = 3.0*Math.cos(ang);
	this.setBBox(-4,-4,8,8);
}

Laser.prototype = new JGObject();

Laser.prototype.move = function() {
	var wavepos = getWavePos(this.x);
	if (wavepos.height < this.y+6) {
		this.remove();
		JGAudio.play("splash1-"+randomstep(0,2,1));
		addSplash(new Splash(this.x,15,15.0, 0.1, 0.0));
		createParticles(this.x,wavepos.height,this.xspeed,this.yspeed,8,true);
	}
}

Laser.prototype.paint = function(gl) {
	var ang = this.ang + Math.PI*( Math.floor(gametime/4)%2);
	drawLine([this.x,this.y],-ang, 10.0, 1.5,[1.0, 0.2, 1.0, 1.0],
		laserpoly, laserpoly.length/2, false, "laser");
}



// --------------------------------------------------------------------
// Bomber and Bomb
// --------------------------------------------------------------------

function Bomber() {
	JGObject.apply(this,["enemy",true,0,0, 2]);
	this.height = random(80,200);
	this.x = randomstep(-32, width+32, width+64);
	var wavepos = getWavePos(this.x);
	this.y = wavepos.height - this.height;
	this.xspeed = random(1,2) * (this.x<width/2 ? 1 : -1);
	this.setBBox(-12,-12,24,24);
	this.timer = random(100,200);
	this.animang=0;
	this.nr_bombs = 5;
}

Bomber.prototype = new JGObject();


Bomber.prototype.move = function() {
	if (this.x<8) this.x++;
	if (this.x>width-8) this.x--;
	var wavepos = getWavePos(this.x + this.xspeed*16);
	var ang = - Math.PI/2 - Math.atan2(this.xspeed,0.1*this.yspeed);
	var delta = this.y - (wavepos.height - this.height);
	if (delta < 0) {
		if (delta < -12) delta = -12;
		this.yspeed -= 0.015*delta;
		ang -= this.xspeed*0.012*delta;
	}
	if (delta > 0) {
		if (delta > 12) delta = 12;
		this.yspeed -= 0.015*delta;
		ang -= this.xspeed*0.012*delta;
	}
	if (this.y > wavepos.height-20) this.y -= 1;
	this.yspeed *= 0.96;
	if (this.x > width-40 && this.xspeed > 0) this.xspeed = -this.xspeed;
	if (this.x < 40 && this.xspeed < 0) this.xspeed = -this.xspeed;
	this.timer -= gamespeed;
	if (this.timer < 0 && this.nr_bombs>0) {
		this.timer = random(150,300);
		new Bomb(this.x,this.y,this.xspeed,this.yspeed);
		this.nr_bombs--;
		JGAudio.play("dropbomb");
	}
	this.animang = 0.9*this.animang + 0.1*ang;
}


Bomber.prototype.hit = function(o) {
	this.remove();
	o.remove();
	//playAudio("impact1-"+random(0,2,1));
	createExplosion(this.x,this.y,this.xspeed,this.yspeed,8);
	score += 10;
	//createParticles(x,y,xspeed,yspeed,12,false);
}

Bomber.prototype.paint = function(gl) {
	//var lines = [-20,-20, 20,-20, 20,20, -20,20];
	//drawLine([this.x,this.y],0.0, 20.0, 2, [1.0, 0.0, 0.0, 1.0],
	//	unit_circle, unit_circle.length/2, true);
	//	lines, lines.length/2, true);
	drawLine([this.x,this.y],this.animang, 1.0, 1.5, [1.0, 0.0, 0.0, 1.0],
		planepoly, planepoly.length/2, true, "plane");
}



function Bomb(x,y,xspd,yspd) {
	JGObject.apply(this,["enemy",true,x,y, 2]);
	this.in_water=false;
	this.xspeed = xspd*1.2;
	this.yspeed = yspd;
	this.setBBox(-8,-8,16,16);
}

Bomb.prototype = new JGObject();

Bomb.prototype.move = function() {
	if (this.x < 0) this.x=0;
	if (this.x > width) this.x = width;
	var wavepos = getWavePos(this.x);
	if (!this.in_water) {
		this.yspeed += 0.08;
		this.xspeed *= 0.98;
		if (this.y - wavepos.height >= -2) {
			this.in_water=true;
			this.yspeed = 0;
			this.xspeed = 0;
			addSplash(new Splash(this.x,15,20.0, 0.1, -3.2));
			createParticles(this.x,wavepos.height,this.xspeed,1.5*this.yspeed,10,true);
			JGAudio.play("splash2-"+randomstep(0,2,1));
		}
	}
	if (this.in_water) {
		this.x += wavepos.xspeed;
		this.y = wavepos.height - 2;
	}
}

Bomb.prototype.hit = function(o) {
	this.remove();
	o.remove();
	//playAudio("impact1-"+random(0,2,1));
	createExplosion(this.x,this.y,this.xspeed,this.yspeed,6);
	if (this.in_water)
		addSplash(new Splash(this.x,15,20.0, 0.1, -3.2));
	score += 5;
	//createParticles(x,y,xspeed,yspeed,8,false);
	//createParticles(x,y,xspeed,yspeed,8,true);
}

Bomb.prototype.paint = function(gl) {
	//var lines = [-12,-12, 12,-12, 12,12, -12,12];
	var wavepos1 = getWavePos(this.x-5);
	var wavepos2 = getWavePos(this.x+5);
	var ang=0.0;
	if (this.in_water) {
		ang = - Math.atan2(10,wavepos2.height - wavepos1.height);
	}
	drawLine([this.x,this.y],ang, 1.0, 1.5, [1.0, 0.0, 0.0, 1.0],
		minepoly, minepoly.length/2, true, "mine");
}

// --------------------------------------------------------------------
// EnemyShip and Missile
// --------------------------------------------------------------------


function EnemyShip() {
	JGObject.apply(this,["enemy",true,0,0, 2]);
	this.setBBox(-10,-10,20,20);
	this.x = randomstep(-32, width+32, width+64);
	var wavepos = getWavePos(this.x);
	this.y = wavepos.height - 2;
	this.xspeed = random(0.5,1) * (this.x < width/2 ? 1 : -1);
	this.setBBox(-10,-10,20,20);
	this.timer = random(80,150);
}

EnemyShip.prototype = new JGObject();

EnemyShip.prototype.move = function() {
	var wavepos = getWavePos(this.x-5);
	this.x += wavepos.xspeed;
	this.y = wavepos.height - 4;
	if (this.x > width && this.xspeed > 0) this.xspeed = -this.xspeed;
	if (this.x < 0 && this.xspeed < 0) this.xspeed = -this.xspeed;
	this.timer--;
	if (this.timer<=0) {
		this.timer = random(80,150);
		var player = JGObject.getObject("player");
		if (player!=null) {
			var dist = player.x - this.x;
			if (dist<-300) dist=-300;
			if (dist> 300) dist= 300;
			var ang = Math.PI - Math.PI*0.25*(dist/300);
			new Missile(this.x,this.y-10,
				ang + random(-0.2,0.2) );
			JGAudio.play("dropbomb");
		}
	}
}

EnemyShip.prototype.hit = function(o) {
	this.remove();
	o.remove();
	//playAudio("impact1-"+random(0,2,1));
	createExplosion(this.x,this.y,this.xspeed,this.yspeed,8);
	score += 20;
	//createParticles(x,y,xspeed,yspeed,8,true);
}

EnemyShip.prototype.paint = function(gl) {
	var wavepos1 = getWavePos(this.x-5);
	var wavepos2 = getWavePos(this.x+5);
	var ang = Math.PI/2 - Math.atan2(10,wavepos2.height - wavepos1.height);
	drawLine([this.x,this.y-5],ang, 1.0, 2, [1.0, 1.0, 0.0, 1.0],
		boatpoly, boatpoly.length/2, true, "boat");
	/*var ang = Math.PI/4 + Math.atan2(10,wavepos2.height - wavepos1.height);
	var lines = [
		- 16*Math.sin(ang),
		- 16*Math.cos(ang),
		- 16*Math.cos(ang),
		  16*Math.sin(ang),
		  16*Math.sin(ang),
		  16*Math.cos(ang),
		  16*Math.cos(ang),
		- 16*Math.sin(ang),
	];
	drawLine([this.x,this.y],0.0, 1.0, 2, [0.7, 0.7, 0.7, 1.0],
		lines, lines.length/2, true);*/
}


function Missile(x,y,ang) {
	JGObject.apply(this,["bullet",true,x,y, 2]);
	this.ang = ang;
	this.xspeed = 5.0*Math.sin(ang);
	this.yspeed = 5.0*Math.cos(ang);
	this.x += this.xspeed;
	this.y += this.yspeed;
	this.setBBox(-6,-6,12,12);
	this.starttimer = 5;
}

Missile.prototype = new JGObject();

Missile.prototype.move = function() {
	this.yspeed += 0.08;
	this.ang = Math.atan2(this.xspeed,this.yspeed);
	var wavepos = getWavePos(this.x);
	this.starttimer--;
	if (this.starttimer <= 0 && wavepos.height < this.y) {
		this.remove();
		JGAudio.play("splash1-"+randomstep(0,2,1));
		addSplash(new Splash(this.x,15,40.0, 0.1, 0.0));
		createParticles(this.x,wavepos.height,this.xspeed,this.yspeed,12,true);
	}
	if (random(0,1) > 0.8) {
		var	speed = random(2,4);
		createExplo(this.x,this.y,speed,this.ang+Math.PI,
			random(0,Math.PI*2)/*phase*/,
			0.2/*dphase*/,
			random(20,30)/*duration*/);
	}
}

Missile.prototype.paint = function(gl) {
	drawLine([this.x,this.y],-Math.PI/2-this.ang, 1.2, 1.5,[1.0, 1.0, 0.0, 1.0],
		missilepoly, missilepoly.length/2, true, "missile");
	/*drawLine([0,0],0.0, 1.0, 2, [1.0, 1.0, 0.0, 1.0],
		[this.x-8.0*Math.sin(this.ang),
		this.y-8.0*Math.cos(this.ang),
		this.x+8.0*Math.sin(this.ang),
		this.y+8.0*Math.cos(this.ang)], 2, false);*/
}



// --------------------------------------------------------------------
// JELLY
// --------------------------------------------------------------------

function Jelly() {
	JGObject.apply(this,["enemy",true,0,0, 2]);
	this.x = random(16,width-32);
	this.y = height + 16;
	this.setBBox(-10,-10,20,20);
	this.dir = -1;
	this.dirtimer = random(200,400);
	this.animtimer=0.0;
	this.animang=0.0;
}

Jelly.prototype = new JGObject();

Jelly.lathe = [ 0, 25, 30, 35, 9, 11, 12, 14, 13];


Jelly.prototype.move = function() {
	var wavepos = getWavePos(this.x);
	var depth = this.y - wavepos.height;
	if (depth > 0.0 && depth < 400.0) {
		var a = 1.0 - depth/400.0;
		this.x += a*1.5*wavepos.xspeed;
	}
	var player = JGObject.getObject("player");
	this.dirtimer--;
	if (this.dirtimer < 0) {
		this.dir = -this.dir;
		if (this.dir<0) { // to up
			this.dirtimer = random(200,300);
		} else { // to down
			this.dirtimer = random(150,250);
		}
	}
	if (this.dir < 0) { // up
		if (this.yspeed > -1.0) this.yspeed -= 0.05;
		if (this.y - wavepos.height < 20) this.yspeed *= 0.95;
		if (player) {
			if (this.x < player.x) {
				this.xspeed += 0.02;
			} else {
				this.xspeed -= 0.02;
			}
			this.xspeed *= 0.97;
		}
		this.animtimer += 0.3 + 0.7*Math.abs(this.yspeed);
	} else { // down
		if (this.yspeed < 1.0) this.yspeed += 0.05;
		if (this.y >= height-16) this.yspeed -= 0.075;
		this.xspeed *= 0.99;
		this.animtimer += 0.5;
	}
	// do not go above water
	if (this.y - wavepos.height < 2) {
		this.y = wavepos.height + 3;
		this.yspeed = 0;
	}
	if (this.dir < 0 && this.yspeed<-0.2) { // up
		var ang = Math.PI/2 + Math.atan2(this.yspeed,0.5*this.xspeed);
		this.animang = 0.9*this.animang + 0.1*ang;
	} else { // down
		this.animang *= 0.99;
		//var ang = 0;
		//this.animang = 0.99*this.animang + 0.01*ang;
	}
}

Jelly.prototype.hit = function(o) {
	this.remove();
	o.remove();
	//playAudio("impact3-"+random(0,2,1));
	createExplosion(this.x,this.y,this.xspeed,this.yspeed,8);
	score += 10;
	//createParticles(this.x,this.y,this.xspeed,this.yspeed,8,true);
}

Jelly.prototype.paint = function(gl) {
	var frame = Math.floor(0.5*this.animtimer) % jellypoly.length;
	drawLine([this.x,this.y],this.animang, 1.0, 2, [0.5, 1.0, 0.0, 1.0],
		jellypoly[frame], jellypoly[frame].length/2, false,
			"jelly"+frame);

	/*var jelly = [];
	for (i=Jelly.lathe.length-1; i>0; i--) {
		var ang = -0.12*this.animtimer+0.5*i;
		jelly.push(-0.5*Jelly.lathe[i] + (0.4*i+2.0)*Math.sin(ang));
		jelly.push(-15 + 4*i - (2.0-0.3*i)*Math.cos(ang));
	}

	for (var i=0; i<Jelly.lathe.length; i++) {
		var ang = -0.12*this.animtimer+0.5*i;
		jelly.push(0.5*Jelly.lathe[i] - (0.4*i+2.0)*Math.sin(ang));
		jelly.push(-15 + 4*i - (2.0-0.3*i)*Math.cos(ang));
	}

	drawLine([this.x,this.y],this.animang, 1.0, 2, [0.5, 1.0, 0.0, 1.0],
		jelly,
		jelly.length/2, false);*/

}


// --------------------------------------------------------------------
// FISH
// --------------------------------------------------------------------


function Fish() {
	JGObject.apply(this,["enemy",true,0,0, 2]);
	this.x = randomstep(-32, width+32, width+64);
	this.y = height + 16;
	this.xspeed = random(1.0,2.0) * (this.x<width/2 ? 1 : -1);
	this.setBBox(-9,-7,18,14);
	this.speed = random(0.95,0.98);
	this.going_up=true;
	this.underwater=true;
	this.animtimer = 0;
	this.animangle = 0;
}

Fish.lathe = [ 0, 13, 17, 15, 10, 6, 5, 9];


Fish.prototype = new JGObject();

Fish.prototype.move = function() {
	var wavepos = getWavePos(this.x);
	if (this.x > width-60 && this.xspeed > 0) this.xspeed = -this.xspeed;
	if (this.x < 60 && this.xspeed < 0) this.xspeed = -this.xspeed;
	var depth = this.y - wavepos.height;
	this.underwater = depth > 0.0;
	if (depth > 0.0 && depth < 400.0) {
		var a = 1.0 - depth/400.0;
		this.x += a*1.5*wavepos.xspeed;
	}
	if (this.going_up) {
		if (this.underwater) {
			this.yspeed -= 0.3*0.75;
			this.yspeed *= this.speed;
		} else {
			this.going_up = false;
			addSplash(new Splash(this.x,15,2.0*Math.abs(this.yspeed), 0.1, 0.0));
			createParticles(this.x,wavepos.height,this.xspeed,this.yspeed,8,false);
		}
	} else {
		if (this.underwater) {
			// swim down
			this.yspeed *= this.speed;
			if (this.y < height-150) {
				this.yspeed += 0.2*0.75;
			} else {
				this.going_up = true;
			}
		} else {
			// fall
			this.yspeed += 0.25*0.75;
			if (this.y + this.yspeed - wavepos.height >= 0.0) {
				addSplash(new Splash(this.x,15,2.0*Math.abs(this.yspeed), 0.1, 3.2));
				createParticles(this.x,wavepos.height,this.xspeed,this.yspeed,8,true);
				JGAudio.play("splash2-"+randomstep(0,2,1));
			}
		}
	}

	// animation
	var angle = - Math.PI/2.0 - Math.atan2(this.xspeed,this.yspeed);
	var angspeed=0.0;
	if (this.underwater) {
		this.animangle = angle;
	} else {
		var a = (140-depth)/200;
		if (a>0.97) a=0.97;
		angspeed = this.animangle;
		this.animangle = a*this.animangle + (1.0-a)*angle;
		angspeed -= this.animangle;
		angspeed = Math.abs(angspeed);
	}

	this.animtimer += 0.3;
	if (!this.underwater) this.animtimer += 0.15 + 10.0*angspeed;
	if (this.underwater && this.going_up) this.animtimer += 2.0;

};


Fish.prototype.paint = function(gl) {
	/*var lines = [];
	for (var i=0; i<Fish.lathe.length; i++) {
		var sinang = Math.sin(-0.20*this.animtimer+.5*i);
		lines.push(-15+ 5*i + (0.2*i+0.0)*sinang);
		lines.push( 0.6*Fish.lathe[i] + (0.4*i+2.0)*sinang);
	}

	for (i=Fish.lathe.length-1; i>0; i--) {
		var sinang = Math.sin(-0.20*this.animtimer+0.5*i);
		lines.push(-15+  5*i + (0.2*i+0.0)*sinang);
		lines.push(-0.6*Fish.lathe[i] + (0.4*i+2.0)*sinang);
	}*/

	var frame = Math.floor(this.animtimer) % fishpoly.length;
	drawLine([this.x,this.y],this.animangle, 1.0, 2, [1.0, 0.5, 0.0, 1.0],
		fishpoly[frame], fishpoly[frame].length/2, true,
			"fish"+frame);
};


Fish.prototype.hit = function(o) {
	this.remove();
	o.remove();
	//playAudio("impact3-"+random(0,2,1));
	createExplosion(this.x,this.y,this.xspeed,this.yspeed,8);
	score += 10;
	//createParticles(this.x,this.y,this.xspeed,this.yspeed,10,!this.underwater);
}

// --------------------------------------------------------------------
// BULLET
// --------------------------------------------------------------------

Bullet.prototype = new JGObject();

function Bullet(x,y,xspd,yspd,ang) {
	JGObject.apply(this,["bullet",true,x,y, 4]);
	this.ang = ang;
	this.xspeed = 9.0*Math.sin(ang);
	this.yspeed = 9.0*Math.cos(ang);
	this.x += this.xspeed;
	this.y += this.yspeed;
	this.underwatertimer = 5;
	this.checkUnderwater();
	this.setBBox(-9,-9,18,18);
}

Bullet.prototype.checkUnderwater = function() {
	var wavepos = getWavePos(this.x);
	this.underwater = wavepos.height < this.y;
	var speed = this.underwater ? 6.0 : 10.0;
	this.xspeed = speed*Math.sin(this.ang);
	this.yspeed = speed*Math.cos(this.ang);
}

Bullet.prototype.move = function() {
	if (!this.underwater) {
		this.yspeed += 0.17;
		this.ang = Math.atan2(this.xspeed,this.yspeed);
	}
	if (this.underwater) {
		if (random(0,1) > 0.8) {
			var	speed = random(2,4);
			createExplo(this.x,this.y,speed,this.ang+Math.PI,
				random(0,Math.PI*2)/*phase*/,
				0.2/*dphase*/,
				random(20,30)/*duration*/);
			//createBubble(0,this.x,this.y,
			//	random(-1,1) - this.xspeed*0.5,
			//	random(-1,1) - this.yspeed*0.5);
		}
	} else {
		if (random(0,1) > 0.8) {
			var	speed = random(2,4);
			createExplo(this.x,this.y,speed,this.ang+Math.PI,
				random(0,Math.PI*2)/*phase*/,
				0.2/*dphase*/,
				random(20,30)/*duration*/);
		}
	}
	var wavepos = getWavePos(this.x);
	if (this.underwatertimer > 0) {
		this.underwatertimer--;
		if (this.underwatertimer<=0) {
			this.checkUnderwater();
		}
	} else {
		var now_underwater = wavepos.height < this.y;
		if (now_underwater ^ this.underwater) {
			this.remove();
			addSplash(new Splash(this.x,15,12.0, 0.1,
				Math.PI/2 * (this.underwater ? -1 : 1)));
			createParticles(this.x,this.y,this.xspeed,this.yspeed,3,
				!this.now_underwater);
		}
	}
	if (this.x<-16 || this.y<-300 || this.x>width+16 || this.y>height+16) {
		this.remove();
	}
}

Bullet.prototype.paint = function() {
	//setColor(underwater ? JGColor.cyan: JGColor.white);
	/*drawLine([0,0],0.0, 1.0, 2, [1.0, 1.0, 1.0, 1.0],
		[this.x-10.0*Math.sin(this.ang),
		this.y-10.0*Math.cos(this.ang),
		this.x+10.0*Math.sin(this.ang),
		this.y+10.0*Math.cos(this.ang)], 2, false);*/
	var poly = this.underwater ? torpedopoly : missilepoly;
	var polystr = this.underwater ? "torpedo" : "missile";
	drawLine([this.x,this.y],-Math.PI/2-this.ang, 1.0, 1.5, [1.0, 1.0, 1.0, 1.0],
		poly, poly.length/2, true, polystr);
}

// --------------------------------------------------------------------
// PLAYER
// --------------------------------------------------------------------

Player.prototype = new JGObject();

function Player() {
	JGObject.apply(this,["player",false,width/2,height/2, 1]);
	this.prevmousex = 0;
	this.bultimer=0;

	this.firetouch=false;
	this.firecenx=-1;
	this.fireceny=-1;
	this.fireofsx=0;
	this.fireofsy=0;

	// move touch
	this.movetouch=false;
	this.movecenx=-1;
	this.touchxspeed=0;
	this.touchxtarget=this.x;

	this.contfire=true;
	this.setBBox(-10,-10,20,20);
}


var MOVESENS = 50;

Player.prototype.move = function() {
	var xdir=0;
	if (eng.getKey('A')) xdir=-1;
	if (eng.getKey('D')) xdir=1;
	//if (eng.getMouseButton(1)) {
	//	this.contfire = !this.contfire;
	//	eng.clearMouseButton(1);
	//}
	// android controls not ported
	if (gamepadcontrols) {
		xdir = gamepad.mx;
		this.fireofsx = gamepad.fx;
		this.fireofsy = gamepad.fy;
	} else if (touchcontrols) {
		var firefound = false;
		var movefound = false;
		for (var i=0; i<eng.touches.length; i++) {
			var touch = eng.touches[i];
			if (touch.x < width/2) {
				// left hand side -> move
				if (this.movetouch) {
					// relative
					this.touchxtarget += 2.0*(touch.x-this.movecenx);
					this.movecenx = touch.x;
					var dist = this.touchxtarget - this.x;
					this.touchxspeed += 0.03*dist;
					this.touchxspeed *= 0.50;
					xdir = this.touchxspeed;
					//xdir = 0.5*(touch.x-this.movecenx);
					/* // rate based
					if (touch.x <= this.movecenx - MOVESENS) {
						xdir = -1;
					} else if (touch.x >= this.movecenx + MOVESENS) {
						xdir = 1;
					} else if (touch.x > this.movecenx - MOVESENS
					&&  touch.x < this.movecenx + MOVESENS) {
						xdir = (1.0/MOVESENS)*(touch.x-this.movecenx);
					}*/
				} else {
					this.movecenx = touch.x;
					this.touchxtarget = this.x;
				}
				this.movetouch = true;
				movefound=true;
			} else {
				// fire
				if (this.firetouch) {
					this.fireofsx += 2.5*(touch.x - this.firecenx);
					this.fireofsy += 2.5*(touch.y - this.fireceny);
				}
				this.firecenx = touch.x;
				this.fireceny = touch.y;
				this.firetouch = true;
				firefound=true;
			}
		}
		if (!firefound) this.firetouch = false;
		if (!movefound) this.movetouch = false;
		// if fireofs too large, reduce it gradually
		var cendist = this.fireofsx*this.fireofsx + 
					  this.fireofsy*this.fireofsy;
		if (cendist > 150*150) {
			var cenang = Math.atan2(this.fireofsx,this.fireofsy);
			cendist = Math.sqrt(cendist);
			this.fireofsx = 0.995*cendist*Math.sin(cenang);
			this.fireofsy = 0.995*cendist*Math.cos(cenang);
		}
	} else if (this.contfire) {
		this.fireofsx = eng.getMouseX() - this.x;
		this.fireofsy = eng.getMouseY() - this.y;
	} else {
		this.fireofsx = 0;
		this.fireofsy = 0;
	}
	// check bounds
	if (this.x<60 && xdir<0) this.x=60;
	if (this.x>width-60 && xdir>0) this.x=width-60;
	// add wave forces
	var wavepos1 = getWavePos(this.x);
	var wavepos2 = getWavePos(this.x+5*xdir);
	this.x += wavepos1.xspeed;
	this.y = wavepos1.height - 4;
	// determine speed according to slope
	if (xdir != 0) {
		var slope = wavepos1.height - wavepos2.height;
		var exspeed = 1.0;
		if (slope > 2.0) {
			exspeed = 0.85;
		} else if (slope < -2.0) {
			exspeed = 1.25;
		}
		this.x += xdir*4.0*exspeed;
	}
	if (this.bultimer<=0 && (this.fireofsx!=0 || this.fireofsy!=0) ) {
		new Bullet(this.x,this.y,
			this.x - this.lastx,
			this.y - this.lasty,
			Math.atan2(this.fireofsx,this.fireofsy) );
		this.bultimer = 11;
	}
	if (this.bultimer > 0) this.bultimer--;
}

Player.prototype.hit = function(obj) {
	eng.addGameState("LifeLost",150);
	this.remove();
	obj.remove();
	//playAudio("playerexplo");
	createExplosion(this.x,this.y,this.xspeed,this.yspeed,15);
	//createParticles(x,y,xspeed,yspeed,16,false);
	//createParticles(x,y,xspeed,yspeed,16,true);
}

Player.prototype.paint = function(gl) {
	var wavepos1 = getWavePos(this.x-5);
	var wavepos2 = getWavePos(this.x+5);
	var ang = Math.PI/2 - Math.atan2(10,wavepos2.height - wavepos1.height);
	drawLine([this.x,this.y-5],ang, 1.0, 2, [1.0, 1.0, 1.0, 1.0],
		boatpoly, boatpoly.length/2, true, "boat");
	/*var lines = [
		this.x - 14*Math.sin(ang),
		this.y - 14*Math.cos(ang),
		this.x - 14*Math.cos(ang),
		this.y + 14*Math.sin(ang),
		this.x + 14*Math.sin(ang),
		this.y + 14*Math.cos(ang),
		this.x + 14*Math.cos(ang),
		this.y - 14*Math.sin(ang),
	];
	drawLine([0,0],0.0, 1.0, 2, [1.0, 1.0, 1.0, 1.0],
		lines, lines.length/2, true);*/
}




