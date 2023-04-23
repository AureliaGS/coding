// Copyright (c) 2014 by Boris van Schooten boris@13thmonkey.org
// Released under BSD license. See LICENSE for details.
// This file is part of jgame.js - a 2D game engine


function JGAudio() { }

// false, null -> init
// true,null -> use audio element
// true,nonnull -> use web audio api
JGAudio._inited = false;
JGAudio._context = null;

// sound enable per-channel
JGAudio._disabled = {};

// source or Audio element per channel
JGAudio._playing = {};

// Audio elements
JGAudio._soundcache = {};

// mapping from sound name to filename
// or from sound name to audio buffer
JGAudio._sounds = {};

// name of channel if a looping sound was played before it was loaded
// -> play as soon as loaded. 
JGAudio._sounds_queued = {};

JGAudio._init = function() {
	if (JGAudio._inited) return;
	if (window.AudioContext || window.webkitAudioContext) {
		try {
			window.AudioContext=window.AudioContext||window.webkitAudioContext;
			JGAudio._context = new AudioContext();
		} catch (e) {
			// web audio not supported, use audio element
		}
	}
	JGAudio._inited = true;
}

// tries to load mp3 and ogg
JGAudio._loadFile = function(basefilename) {
	var ret=null;
	if ((new Audio()).canPlayType("audio/mpeg;")) {
		ret = new Audio(basefilename+".mp3");
	} else if ((new Audio()).canPlayType("audio/ogg;")) {
		ret = new Audio(basefilename+".ogg");
	}
	return ret;
}

JGAudio.load = function (name,basefilename) {
	JGAudio._init();
	if (JGAudio._context) {
		JGAudio._sounds[name] = "loading";
		var request = new XMLHttpRequest();
		request.open('GET', basefilename+".mp3", true);
		request.responseType = 'arraybuffer';
		// Decode asynchronously
		request.onload = function() {
			JGAudio._context.decodeAudioData(request.response,
				function(buffer) {
					JGAudio._sounds[name] = buffer;
					if (JGAudio._sounds_queued[name]) {
						JGAudio.play(name,JGAudio._sounds_queued[name],true);
						JGAudio._sounds_queued[name] = false;
					}
				},
				function(error) { }/*onError*/
			);
		}
		request.send();
	} else {
		JGAudio._sounds[name] = basefilename;
		JGAudio._soundcache[name] = JGAudio._loadFile(basefilename);
	}
}

JGAudio.play = function(name,channel,loop) {
	if (channel && JGAudio._disabled[channel]) return;
	if (!channel && JGAudio._disabled["_NO_CHANNEL"]) return;
	if (typeof JGAudio._sounds[name] == "undefined") return;
	if (JGAudio._context) {
		if (JGAudio._sounds[name] == "loading") {
			if (loop) {
				JGAudio._sounds_queued[name] = channel;
			}		
		} else {
			var source = JGAudio._context.createBufferSource();
			var sourceGain = JGAudio._context.createGain();
			sourceGain.gain.value = 0.6;
			source.buffer = JGAudio._sounds[name];
			source.connect(sourceGain);
			sourceGain.connect(JGAudio._context.destination);
			if (loop) source.loop = true;
			source.start(0);
			if (channel) JGAudio._playing[channel] = source;
		}
	} else {
		var audio = JGAudio._loadFile(JGAudio._sounds[name]);
		// http://stackoverflow.com/questions/3273552/html-5-audio-looping
		if (loop) audio.loop = true;
		audio.volume = 0.6;
		audio.play();
		if (channel) JGAudio._playing[channel] = audio;
		//audio.preload="auto";
		//audio.addEventListener("canplay", function() { alert("canplay"); audio.play(); });
	}
}

JGAudio.stop = function(channel) {
	var playing = JGAudio._playing[channel];
	if (!playing) return;
	if (JGAudio._context) {
		if (playing.stop) {
			playing.stop();
		} else if (playing.noteOff) {
			playing.noteOff(0);
		}
	} else {
		playing.pause();
	}
	JGAudio._playing[channel] = null;
}

JGAudio.enable = function(channel) {
	if (!channel) channel = "_NO_CHANNEL";
	JGAudio._disabled[channel] = false;

}

JGAudio.disable = function(channel) {
	if (channel) JGAudio.stop(channel);
	if (!channel) channel = "_NO_CHANNEL";
	JGAudio._disabled[channel] = true;
}

JGAudio.isEnabled = function(channel) {
	if (!channel) channel = "_NO_CHANNEL";
	return !JGAudio._disabled[channel];
}

