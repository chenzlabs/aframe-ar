/* global AFRAME, THREE */

AFRAME.registerComponent('ar-images', {

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

  addImage: function (name, url, physicalWidth) {
    var source = this.getSource();
    if (!source || !source.addImage) return undefined;
    return source.addImage(name, url, physicalWidth);
  },

  removeImage: function (name) {
    var source = this.getSource();
    if (!source || !source.removeImage) return undefined;
    return source.removeImage(name);
  },

});
