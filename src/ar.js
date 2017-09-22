AFRAME.registerComponent('ar', {
  dependencies: ['three-ar-planes'],
  init: function () {
    this.el.sceneEl.setAttribute('vr-mode-ui', {enabled: false});
  }
});
