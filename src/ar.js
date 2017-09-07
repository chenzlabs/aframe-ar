AFRAME.registerComponent('ar', {
  dependencies: ['three-ar'],
  init: function () {
    this.el.sceneEl.setAttribute('vr-mode-ui', {enabled: false});
  }
});
