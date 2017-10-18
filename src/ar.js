AFRAME.registerComponent('ar', {
  dependencies: ['three-ar-planes'],
  init: function () {
    this.el.sceneEl.setAttribute('vr-mode-ui', {enabled: false});
    // Ensure passthrough is visible, make sure A-Frame styles don't interfere.
    document.head.insertAdjacentHTML('beforeend', 
      '<style>html,body {background-color: transparent !important;}</style>');
  }
});
