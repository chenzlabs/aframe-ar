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
    var pos = whichar.getPosition();
    if (pos) { this.el.setAttribute('position', pos); }

    // Apply the pose rotation via setAttribute,
    // so that other A-Frame components can see the values.
    var rot = whichar.getRotation();
    if (rot) { this.el.setAttribute('rotation', rot); }

    // Apply the projection matrix, if we're not in VR.
    if (!this.el.sceneEl.is('vr-mode')) {
      var matrix = whichar.getProjectionMatrix();
      if (matrix) { this.el.components.camera.camera.projectionMatrix = matrix; }
    }    
  },
  
  checkWhichAR: function () {
    if (!this.whichar) {
      var whichar = this.el.sceneEl.components['ar'].getSource();
      if (!whichar || !whichar.arDisplay) { return; }
      this.whichar = whichar;
    }
    return this.whichar;
  }  
});
