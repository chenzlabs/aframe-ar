/* global AFRAME */

AFRAME.registerComponent('ar-camera', {
  schema: {
    enabled: {default:true}
  },

  init: function () {
    var lookControls = this.el.getAttribute('look-controls');
    this.wasLookControlsEnabled = lookControls ? lookControls.enabled : false;
  },

  update: function (oldData) {
    if (!oldData || oldData.enabled !== this.data.enabled) {
      // Value changed, so react accordingly.
      if (this.data.enabled) {
        // Save camera look-controls enabled, and turn off for AR.
        var lookControls = this.el.getAttribute('look-controls');
        this.wasLookControlsEnabled = lookControls ? lookControls.enabled : false;
        if (this.wasLookControlsEnabled) {
          this.el.setAttribute('look-controls', 'enabled', false);
        }
      } else {
        // Restore camera look-controls enabled.
        if (this.wasLookControlsEnabled) {
          this.el.setAttribute('look-controls', 'enabled', true);
        }
      }
    }
  },
  
  tick: function (t, dt) {
    if (!this.data.enabled) { return; }
    
    var whichar = this.checkWhichAR();
    if (!whichar) { return; }
    
    // Apply the pose position via setAttribute,
    // so that other A-Frame components can see the values.
    this.el.setAttribute('position', whichar.getPosition());

    // Apply the pose rotation via setAttribute,
    // so that other A-Frame components can see the values.
    this.el.setAttribute('rotation', whichar.getRotation());

    // Apply the projection matrix, if we're not in VR.
    if (!this.el.sceneEl.is('vr-mode')) {
      this.el.components.camera.camera.projectionMatrix = whichar.getProjectionMatrix();
    }    
  },
  
  checkWhichAR: function () {
    if (!this.whichar) {
      var whichar = this.el.sceneEl.components['three-ar'];
      if (!whichar || !whichar.arDisplay) {
        whichar = this.el.sceneEl.components['mozilla-xr-ar'];
      }
      if (!whichar || !whichar.arDisplay) { return; }
      this.whichar = whichar;
    }
    return this.whichar;
  }  
});
