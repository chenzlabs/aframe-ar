/* global AFRAME, THREE */

AFRAME.registerComponent('ar-anchors', {

  getSource: function () {
    var whichar;
    if (!this.source) {
      whichar = this.el.sceneEl.components['ar'];
      if (whichar) {
        this.source = whichar.getSource();
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
