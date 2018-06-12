/* global AFRAME */

AFRAME.registerComponent('ar', {
  schema: {
    takeOverCamera: {default: true},
    cameraUserHeight: {default: false},
    worldSensing: {default: false},
    hideUI: {default: true}
  },
  dependencies: ['three-ar', 'mozilla-xr-ar', 'ar-planes', 'ar-anchors'],
  getSource: function () {
    var whichar;
    if (!this.source) {
      whichar = this.el.sceneEl.components['three-ar'];
      if (whichar && whichar.arDisplay) {
        this.source = whichar.arDisplay;
      }
    }
    if (!this.source) {
      whichar = this.el.sceneEl.components['mozilla-xr-ar'];
      if (whichar && whichar.arDisplay) {
        this.source = whichar;
      }
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

    this.el.setAttribute('three-ar', options);
    this.el.setAttribute('mozilla-xr-ar', options);

    if (this.data.hideUI) {
      this.el.sceneEl.setAttribute('vr-mode-ui', {enabled: false});
    }

    // Ensure passthrough is visible, make sure A-Frame styles don't interfere.
    document.head.insertAdjacentHTML('beforeend', 
      '<style>html,body {background-color: transparent !important;}</style>');
  }
});
