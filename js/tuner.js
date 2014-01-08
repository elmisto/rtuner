window.requestAnimFrame = ( window.requestAnimationFrame       ||
                            window.webkitRequestAnimationFrame ||
                            window.mozRequestAnimationFrame );

window.cancelAnimFrame  = ( window.cancelAnimationFrame       ||
                            window.webkitCancelAnimationFrame ||
                            window.mozCancelAnimationFrame );

navigator.getMedia      = ( navigator.getUserMedia       ||
                            navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia    ||
                            navigator.msGetUserMedia );

// Control variables
var requestId;

// Text lists
var notes = [ 
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
];

var scientificOctaves = [ "2", "3", "4", "5", "6", "7", "8", "9" ];
var namedOctaves = [
  "Great", "Small", "One-lined", "Two-lined",
  "Three-lined", "Four-lined", "Five-lined", "Six-lined"
];

// Settings object -------------------------------------------------------------
var Settings = function Settings() {
  this.baseA4Frequency = 440;
  this.baseC2Frequency = 65.406;
  this.microphoneGain  = 3.0;
  this.noiseThreshold  = 0.05;
  this.bufferSize      = 1024;
  
  this.load = function() {
    if(localStorage.getItem("mtuner-settings") !== null) {
      this.baseA4Frequency = localStorage.getItem("mtuner-base-a4-frequency");
      this.baseC2Frequency = localStorage.getItem("mtuner-base-c2-frequency");
      this.microphoneGain  = localStorage.getItem("mtuner-microphone-gain");
    }
  };
  
  this.save = function() {
    localStorage.setItem("mtuner-settings", true);
    localStorage.setItem("mtuner-base-a4-frequency", this.baseA4Frequency);
    localStorage.setItem("mtuner-base-c2-frequency", this.baseC2Frequency);
    localStorage.setItem("mtuner-microphone-gain", this.microphoneGain);
  }
};

// Microphone object -----------------------------------------------------------
var Microphone = function Microphone(bufferSize, microphoneGain) {
  this.bufferSize = bufferSize;
  this.microphoneGain = microphoneGain;
  this.actx   = new AudioContext();
  this.gain   = this.actx.createGain();
  this.output = this.actx.createScriptProcessor(bufferSize, 1, 0);

  this.outputProcessor = function(e) {
    data = e.inputBuffer.getChannelData(0);
  };

  this.init = function(mediaStream) {
    this.input = this.actx.createMediaStreamSource(mediaStream);
    this.gain.gain.value = this.microphoneGain;
    this.output.onaudioprocess = this.outputProcessor;    
    this.input.connect(this.gain);
    this.gain.connect(this.output);
  };

  this.destroy = function() {
    this.gain.disconnect(this.output);
    this.input.disconnect(this.gain);
    this.input = null;
  };
  
  this.setGain = function(gain) {
    this.microphoneGain = gain;
    this.gain.gain.value = gain;
  };
};

// Tuner object ----------------------------------------------------------------
var Tuner = function Tuner(windowSize, sampleRate) {
  this.windowSize = windowSize;
  this.sampleRate = sampleRate;
  this.pitch      = 0;
  this.note       = 0;
  this.octave     = 0;
  this.difference = 0;
  this.volume     = 0;
  this.n          = new Float32Array(windowSize);

  this.update = function(data, threshold) {  
    // Normalized square difference function and volume calculation
    var sum = 0;
    for(var t = 0; t < this.windowSize; t++) {
      var m = 0;
      var r = 0;
      for(var j = 0; j < (this.windowSize - t); j++) {
        r += data[j] * data[j + t];
        m += data[j] * data[j] + data[j + t] * data[j + t];
      }
      this.n[t] = 2 * r / m;
      sum += Math.abs(data[t]);
    }
    
    // Find first peak
    for(var zero = 1; zero < this.windowSize; zero++) {
      if(this.n[zero - 1] <= 0 && this.n[zero] >= 0 ) { break; }
    }
    
    for(var peak = zero; peak < this.windowSize - 1; peak++) {
      if(this.n[peak + 1] < this.n[peak]) { break; }
    }
    
    // Calculate values
    this.volume = sum / windowSize;
    if( this.volume > threshold ) {
      this.pitch = this.pitch * 0.8 + this.sampleRate / peak * 0.2;
      this.note = ( 12 * Math.log( this.pitch / settings.baseC2Frequency ) / Math.log(2) );
      this.difference = Math.round( ( tuner.note - Math.round( tuner.note ) ) * 100 );
      this.octave = Math.floor(tuner.note / 12);
    }
  }
};

// UI object -------------------------------------------------------------------
var UI = function UI() {
  this.volume     = document.getElementById("volume");
  this.canvas     = document.getElementById("note-meter");
  this.strip      = document.createElement("canvas");
  this.difference = document.getElementById("difference");
  this.frequency  = document.getElementById("frequency");
  this.octave     = document.getElementById("octave");
  
  this.cctx = this.canvas.getContext("2d");
  
  this.init = function() {
    this.resize();
    this.renderNoteScope(33);
  };
  
  this.resize = function() {
    this.canvas.width  = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.strip.width   = this.canvas.width / 3 * 14;
    this.strip.height  = this.canvas.height;
    this.renderNoteStrip();
  };
  
  this.renderNoteScope = function(note) {
    this.cctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.cctx.drawImage(
      this.strip,
      -1 * (((note + 0.5) % 12) - 0.5) * this.canvas.width / 3,
      0
    );
    this.cctx.fillStyle = "#0AC";
    this.cctx.fillRect(this.canvas.width / 2 - 1, 0, 2, this.canvas.height);
  }
  
  this.renderNoteStrip = function() {
    var sctx = this.strip.getContext("2d");
    
    sctx.clearRect(0, 0, this.strip.width, this.strip.height);
    sctx.fillStyle = "black";
    for(var i = 1; i < 14 * 10; i++) {
      if((i + 5) % 10 === 0) {
        sctx.fillRect(i * this.strip.width / 140, 0, 1, this.strip.height);
      }
      else {
        sctx.fillRect(
          i * this.strip.width / 140, this.strip.height / 2, 
          1, this.strip.height
        );
      }
    }
    
    sctx.font = '20px FiraMono';
    sctx.fillStyle = "black";
    
    sctx.fillText(
      notes[11],
      this.canvas.width / 3 / 2,
      this.canvas.height / 2 - 1
    );
    for(i = 0; i < 12; i++) {
      sctx.fillText(
        notes[i],
        this.canvas.width / 2 + i * this.canvas.width / 3,
        this.canvas.height / 2 - 1
      );
    }
    sctx.fillText(
      notes[0],
      this.strip.width - this.canvas.width / 3 / 2,
      this.canvas.height / 2 - 1
    );    
  };
};

function initialize() {
  settings   = new Settings();
  settings.load();
  data       = new Float32Array(settings.bufferSize);
  microphone = new Microphone(settings.bufferSize, settings.microphoneGain);
  tuner      = new Tuner(settings.bufferSize, microphone.actx.sampleRate);
  ui         = new UI();

  navigator.getMedia(
    { audio: true },
    function(mediaStream) { microphone.init(mediaStream); },
    function(e) { console.log("Audio input error!"); }
  );
  
  window.onresize = function() { ui.resize(); };
  document.addEventListener("visibilitychange", sleep, false);
  
  ui.init();
  requestId = requestAnimFrame(animate);
}

function sleep() {
  if(document.hidden === true) {
    microphone.destroy();
    cancelAnimFrame(requestId);
  }
  else {
    navigator.getMedia(
      { audio: true },
      function(mediaStream) { microphone.init(mediaStream); },
      function(e) { console.log("Audio input error!"); }
    );
    requestId = requestAnimFrame(animate);
  }
}

function animate() {
  tuner.update(data, settings.noiseThreshold);
  
  ui.volume.setAttribute("value", Math.round(tuner.volume * 100));  
  ui.renderNoteScope(tuner.note);
  ui.octave.textContent = namedOctaves[tuner.octave];
  ui.frequency.textContent = Math.round(tuner.pitch);
    
  if( tuner.difference >= 0 ) { ui.difference.textContent = "+" +  Math.abs(tuner.difference); }
  else { ui.difference.textContent = "-" +  Math.abs(tuner.difference); }
  
  requestId = requestAnimFrame(animate);
}

window.onload = initialize();
