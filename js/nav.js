// Settings open ---------------------------------------------------------------
document.querySelector('#btn-settings').addEventListener ('click', function () {
  cancelAnimFrame(requestId);
  document.querySelector('#settings').className = 'current';
  document.querySelector('[data-position="current"]').className = 'left';
  var animend = (/webkit/i).test(navigator.appVersion) ? 'webkitAnimationEnd' : 'animationend';

  document.addEventListener(animend, function animationend() {
    document.removeEventListener(animend, animationend);
    
    document.getElementById("a-frequency").setAttribute(
      'aria-valuenow',
      settings.baseA4Frequency
    );
    
    document.getElementById("a-frequency").onchange = function(e) {
      document.querySelector("#a-frequency label").textContent = Math.round(e.detail / 10) * 10 +  " Hz";
    };
    
    document.getElementById("microphone-gain").setAttribute(
      'aria-valuenow',
      settings.microphoneGain * 10
    );
    
    document.getElementById("microphone-gain").onchange = function(e) {
      document.querySelector("#microphone-gain label").textContent = Math.round(e.detail / 5) * 5 / 10;
    };

    utils.seekbars.init();
  });
});

// Settings apply --------------------------------------------------------------
document.querySelector('#btn-settings-back').addEventListener ('click', function () {
  document.querySelector('#settings').className = 'right';
  document.querySelector('[data-position="current"]').className = 'current';
  
  settings.baseA4Frequency = Math.round(document.getElementById('a-frequency').getAttribute('aria-valuenow') / 10) * 10;
  settings.baseC2Frequency = Math.pow(2, -33 / 12) * settings.baseA4Frequency;
  settings.microphoneGain  = Math.round(document.getElementById('microphone-gain').getAttribute('aria-valuenow') / 5) * 5 / 10;
  
  settings.save();
  microphone.setGain(settings.microphoneGain);
  requestId = requestAnimFrame(animate);
});


