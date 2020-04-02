/* global AFRAME */

AFRAME.registerComponent('ar', {
  schema: {
    takeOverCamera: {default: true},
    cameraUserHeight: {default: false},
    worldSensing: {default: true},
    hideUI: {default: false}
  },
  dependencies: ['webxr-ar', 'mozilla-xr-ar', 'ar-planes', 'ar-anchors'],
  getSource: function () {
    var whichar;
    if (!this.source) {
      var self = this;
      self.dependencies.forEach(function(sys) {
        whichar = self.el.sceneEl.components[sys];
        if (whichar && whichar.arDisplay) {
          self.source = whichar;
        }
      });	
    }
    return this.source;
  },
  getPlanes: function () {
    return this.source ? this.source.getPlanes() : undefined;
  },
  getAnchors: function () {
    return this.source ? this.source.getAnchors() : undefined;
  },
  addImage: function (name, url, physicalWidth) {
    return this.source.addImage(name, url, physicalWidth);
  },
  removeImage: function (name) {
    return this.source.removeImage(name);
  },
  init: function () {
    var options = {
      takeOverCamera: this.data.takeOverCamera,
      cameraUserHeight: this.data.cameraUserHeight,
      worldSensing: this.data.worldSensing
    };

    var self = this;
    this.dependencies.forEach(function(sys) {
        self.el.setAttribute(sys, options);
    });

    if (this.data.hideUI) {
      this.el.sceneEl.setAttribute('vr-mode-ui', {enabled: false});
    }

    // Ensure passthrough is visible, make sure A-Frame styles don't interfere.
    document.head.insertAdjacentHTML('beforeend', 
      '<style>html,body {background-color: transparent !important;}</style>');
  }
});
