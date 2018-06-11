/* global AFRAME, THREE */

AFRAME.registerComponent('ar-anchors', {

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

  getAnchors: function () {
    var source = this.getSource();
    if (!source || !source.getAnchors) return undefined;
    return source.getAnchors();
  }
});
