/* global AFRAME */

// ar-raycaster modifies raycaster to append AR hit, if any.
// But note that current AR hit API does not support orientation as input.
AFRAME.registerComponent('ar-raycaster', {      
  dependencies: ['raycaster'],
        
  schema: {
    x: {default: 0.5},
    y: {default: 0.5},
    el: {type: 'selector'}
  },
        
  init: function () {
    // HACK: monkey-patch raycaster to append AR hit result
    this.raycaster = this.el.components['raycaster'].raycaster;
    this.raycasterIntersectObjects = this.raycaster.intersectObjects.bind(this.raycaster);
    this.raycaster.intersectObjects = this.intersectObjects.bind(this);
  },
        
  update: function (oldData) {
    if (!this.data.el) {
      // If not given some other element, return hit against the scene.
      // HACK: But that means we need its object3D to have an el.
      if (!this.el.sceneEl.object3D.el) {
        this.el.sceneEl.object3D.el = this.el.sceneEl;
      }
    }
  },
        
  intersectObjects: function (objects, recursive, rawIntersections) {
    // it appears that intersectObjects is now returning in rawIntersections
    var results = this.raycasterIntersectObjects(objects, recursive, rawIntersections);
    // Tack on AR hit result, if any.
    var hitARResults = this.hitAR();
    if (hitARResults && hitARResults.length) {
      if (rawIntersections) {
        hitARResults.forEach((hit) => rawIntersections.push(hit));
        results = rawIntersections;
      } else {
        hitARResults.forEach((hit) => results.push(hit));
      }
    }
    return results;
  },        
        
  hitAR: function () {
    var whichar = this.checkWhichAR();
    if (!whichar || !whichar.arDisplay) { return []; }
    var x = this.data.x;
    var y = this.data.y;
    if (arguments.length >= 2) {
      x = arguments[0];
      y = arguments[1];
    }
    return whichar.hitAR(x, y, this.data.el, this.el);
  },

  checkWhichAR: function () {
    if (!this.whichar) {
      var whichar = this.el.sceneEl.components['ar'];
      if (whichar) { whichar = whichar.getSource ? whichar.getSource() : undefined; }
      if (!whichar || !whichar.arDisplay) { return; }
      this.whichar = whichar;
    }
    return this.whichar;
  }  
});

