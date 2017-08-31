AFRAME.registerComponent('three-ar-planes', {
  dependencies: ['three-ar'],

  init: function () {
    // Remember planes when we see them.
    // Map, so we can enumerate it properly.
    this.planes = new Map();
  },

  tick: function (t, dt) {
    // Check to see if the anchor list is available.
    var threear = this.el.components['three-ar'];
    if (!threear || !threear.arDisplay) { return; }
    var anchors = threear.arDisplay.anchors_;
    if (!anchors) { return; }

    // Create the temporary variables we will reuse, if needed.
    if (!this.tempPosition) { this.tempPosition = new THREE.Vector3(); }
    if (!this.tempQuaternion) { this.tempQuaternion = new THREE.Quaternion(); }
    if (!this.tempScale) { this.tempScale = new THREE.Vector3(); }
    if (!this.tempRotation) { this.tempRotation = new THREE.Euler(0, 0, 0, 'YXZ'); }
    if (!this.tempMatrix4) { this.tempMatrix4 = new THREE.Matrix4(); }
    
    // Iterate over the available anchors.
    for (var i=0; i<anchors.length; i++) {
      var anchor = anchors[i];
      this.tempMatrix4.elements = anchor.transform;
      this.tempMatrix4.decompose(this.tempPosition, this.tempQuaternion, this.tempScale);
      this.tempRotation.setFromQuaternion(this.tempQuaternion);
      // Check if we've seen this one.
      if (this.planes[anchor.identifier]) {
        // Is it cheaper to treat every time as an update, or to check?
        // DEFINITELY cheaper to check.
        // Unfortunately with current WebARonARKit, brute force is needed.
        if (!AFRAME.utils.deepEqual(anchor, this.planes[anchor.identifier])) {
          // Remember the updated information.
          this.planes[anchor.identifier] = anchor;
          
          // Emit event.
          this.el.emit('updateplane', {
            id: anchor.identifier,
            alignment: anchor.alignment,
            extent: {x:anchor.extent[0], y:0, z:anchor.extent[1]},
            position: this.tempPosition,
            rotation: {x: THREE.Math.RAD2DEG * this.tempRotation.x,
                       y: THREE.Math.RAD2DEG * this.tempRotation.y,
                       z: THREE.Math.RAD2DEG * this.tempRotation.z},
            scale: {x:1, y:1, z:1}
          });
        }
        this.planes[anchor.identifier].marked = true;
      } else {
        // We haven't seen it, so remember it.
        this.planes[anchor.identifier] = anchor;
        this.planes[anchor.identifier].marked = true;

        // Emit event.
        this.el.emit('createplane', {
          id: anchor.identifier,
          alignment: anchor.alignment,
          extent: {x:anchor.extent[0], y:0, z:anchor.extent[1]},
          position: this.tempPosition,
            rotation: {x: THREE.Math.RAD2DEG * this.tempRotation.x,
                       y: THREE.Math.RAD2DEG * this.tempRotation.y,
                       z: THREE.Math.RAD2DEG * this.tempRotation.z},
          scale: {x:1, y:1, z:1}
        });
      }
      // TODO:
      // If removed anchors can still appear in the list,
      // handle that here.
    }

    // Iterate over planes we've seen; if they're removed, emit events.
    this.planes.forEach(function(key, value, map) {
      var plane = this.planes[key];
      if (plane.marked) {
        // Clear flag in preparation for next time.
        plane.marked = false;
      } else {
        // Emit event.
        this.el.emit('removeplane', {id: plane.identifier});
        delete this.planes[key];
      }
    });
  }
});
