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
        
  intersectObjects: function (objects, recursive) {
    var results = this.raycasterIntersectObjects(objects, recursive);
    // Tack on AR hit result, if any.
    return results.concat(this.hitAR());
  },        
        
  hitAR: (function () {          
    // Temporary variables, only within closure scope.
    var transform = new THREE.Matrix4();
    var hitpoint = new THREE.Vector3();
    var hitquat = new THREE.Quaternion();
    var hitscale = new THREE.Vector3();
    var worldpos = new THREE.Vector3();
          
    // The desired function, which this returns.

    // If we detect Mozilla's WebXR Viewer, use its implementation of hitAR.
    if (window.webkit && window.webkit.messageHandlers.initAR) {
      return function () {
/*
window.webkit.messageHandlers.hitTest.postMessage({
  x: x,
  y: y,
  type: 27, // ARKitWrapper.HIT_TEST_TYPE_ALL
  callback: this._createPromiseCallback('hitTest', resolve)
})
*/
        // For testing at the moment, force a hit at (0,0,0)
        this.el.object3D.getWorldPosition(worldpos);
        return [{
          distance: hitpoint.distanceTo(worldpos),
          point: hitpoint, // Vector3
          object: (this.data.el && this.data.el.object3D) || this.el.sceneEl.object3D
/*
          // We don't have any of these properties...
          face: undefined, // Face3
          faceIndex: undefined,
          index: undefined,
          uv: undefined // Vector2
*/
        }];
      }
    }

    // No WebXR Viewer, so it's either three-ar or nothing.
    return function () {
      var threear = this.el.sceneEl.components['three-ar'];
      if (!threear || !threear.arDisplay || !threear.arDisplay.hitTest) { return []; }

      var hit = threear.arDisplay.hitTest(this.data.x, this.data.y);
      if (!hit || hit.length <= 0) {
        // No AR hit.
        return [];
      }
            
      // At least one hit.  For now, only process the first AR hit.
      transform.fromArray(hit[0].modelMatrix);
      transform.decompose(hitpoint, hitquat, hitscale);
      this.el.object3D.getWorldPosition(worldpos);
      return [{
        distance: hitpoint.distanceTo(worldpos),
        point: hitpoint, // Vector3
        object: (this.data.el && this.data.el.object3D) || this.el.sceneEl.object3D
/*
        // We don't have any of these properties...
        face: undefined, // Face3
        faceIndex: undefined,
        index: undefined,
        uv: undefined // Vector2                
*/                  
      }];
    }        
  })()
});

