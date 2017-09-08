AFRAME.registerComponent('three-ar-planes', {
  dependencies: ['three-ar'],

  init: function () {
    // Remember planes when we see them.
    // Map, so we can enumerate it properly.
    this.planes = new Map();
  },

  tick: (function (t, dt) {
    // Create the temporary variables we will reuse, if needed.
    var tempScale = new THREE.Vector3(1, 1, 1);
    var tempExtent = new THREE.Vector3();
    var tempMat4 = new THREE.Matrix4();

    // The actual function, which we return.
    return function (t, dt) {
      // Check to see if the anchor list is available.
      var threear = this.el.components['three-ar'];
      if (!threear || !threear.arDisplay) { return; }
      var arDisplay = threear.arDisplay;
      // Because we don't have an indication of added / updated / removed,
      // try to keep track ourselves.
      var seenThese = {};
      // Iterate over the available planes.
      var planes = arDisplay.getPlanes ? arDisplay.getPlanes() : arDisplay.anchors_;
      for (var i=0; planes && i<planes.length; i++) {
        var plane = planes[i];

        // Force plane conformance to common spec (almost latest spec).
        if (!plane.identifier) { plane.identifier = plane.id; }
        if (typeof plane.identifier !== 'string') {
          plane.identifier = plane.identifier.toString();
        }
        if (plane.polygon) { plane.vertices = plane.polygon; }     

        seenThese[plane.identifier] = true;

        // Unify position and orientation into vector3 and quaternion.
        // Compute unification (since we have to assume it may be updated.)
        // Note that although it is possible to construct the arrays for
        // position and orientation from transform, it's not worth it,
        // since we will want to use vector3 and quaternion anyway.
        if (!plane.vector3) { plane.vector3 = new THREE.Vector3(); }
        if (!plane.quaternion) { plane.quaternion = new THREE.Quaternion(); }
        if (!plane.rotation) { plane.rotation = new THREE.Euler(0,0,0,'YXZ'); }
        if (!plane.extent3) { plane.extent3 = new THREE.Vector3(); }
        if (plane.transform) { // ARKit
          tempMat4.fromArray(plane.transform);
          tempMat4.decompose(plane.vector3, plane.quaternion, tempScale);
        } else { // ARCore
          plane.vector3.fromArray(plane.position);
          plane.quaternion.fromArray(plane.orientation);
        }
        plane.rotation.setFromQuaternion(plane.quaternion);
        plane.rotation.x *= THREE.Math.RAD2DEG;
        plane.rotation.y *= THREE.Math.RAD2DEG;
        plane.rotation.z *= THREE.Math.RAD2DEG;
        plane.extent3.set(plane.extent[0], 0, plane.extent[1]);

        var planeExistsAlready = this.planes.has(plane.identifier);
        var emitEvent = !planeExistsAlready 
          // Is it cheaper to treat every time as an update, or to check?
          // DEFINITELY cheaper to check.
          // Unfortunately with current WebARonARKit, brute force is needed.
          || !AFRAME.utils.deepEqual(plane, this.planes[plane.identifier]);
        
        if (emitEvent) {
          // Remember the updated information. (Clone it.)
          this.planes[plane.identifier] = JSON.parse(JSON.stringify(plane));

          // Conversions to emit (legacy) event.
          tempExtent.set(plane.extent[0], 0, plane.extent[1]);

          // Emit event.
          this.el.emit(planeExistsAlready ? 'updateplane' : 'createplane', {
            id: plane.identifier,
            alignment: plane.alignment || 0 /* horizontal */,
            extent: plane.extent3,
            position: plane.vector3,
            rotation: plane.rotation,
            scale: tempScale
          });
        }
        
        // TODO:
        // If removed planes can still appear in the list,
        // handle that here.
      }

      // Iterate over planes we've seen; if they're removed, emit events.
      var keys = Object.keys(this.planes);
      for (var j=0; j<keys.length; j++) {
        var key = keys[j];
        if (!seenThese[key]) {
          // Emit event.
          this.el.emit('removeplane', {id: key});
          // Delete key.
          this.planes.delete(key);
        }
      }
    };    
  })()
});
