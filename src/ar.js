AFRAME.registerComponent('ar', {
  schema: {
    takeOverCamera: {default: true},
    cameraUserHeight: {default: false},
    hideUI: {default: true}
  },
  dependencies: ['three-ar', 'mozilla-xr-ar', 'ar-planes'],
  init: function () {
    this.el.setAttribute('three-ar', {
      takeOverCamera: this.data.takeOverCamera,
      cameraUserHeight: this.data.cameraUserHeight
    });

    this.el.setAttribute('mozilla-xr-ar', {
      takeOverCamera: this.data.takeOverCamera,
      cameraUserHeight: this.data.cameraUserHeight
    });

    if (this.data.hideUI) {
      this.el.sceneEl.setAttribute('vr-mode-ui', {enabled: false});
    }

    // Ensure passthrough is visible, make sure A-Frame styles don't interfere.
    document.head.insertAdjacentHTML('beforeend', 
      '<style>html,body {background-color: transparent !important;}</style>');
  }
});
