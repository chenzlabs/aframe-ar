/* global AFRAME */

AFRAME.registerComponent('ar', {
  schema: {
    takeOverCamera: {default: true},
    cameraUserHeight: {default: false},
    worldSensing: {default: false},
    hideUI: {default: true}
  },
  dependencies: ['three-ar', 'mozilla-xr-ar', 'ar-planes', 'ar-anchors'],
  getPlanes: function () {
    if (!this.planeSource) {
      this.planeSource = this.el.components['ar-planes'];
    }
    return this.planeSource ? this.planeSource.getPlanes() : undefined;
  },
  getAnchors: function () {
    if (!this.anchorSource) {
      this.anchorSource = this.el.components['ar-anchors'];
    }
    return this.anchorSource ? this.anchorSource.getAnchors() : undefined;
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
