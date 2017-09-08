AFRAME.registerComponent('three-ar-planes', {
  dependencies: ['three-ar'],

  init: function () {
    // Remember planes when we see them.
    // Map, so we can enumerate it properly.
    this.planes = new Map();
  },

  tick: (function (t, dt) {
    // Create the temporary variables we will reuse, if needed.
    var tempAlignment = 0;
    var tempScale = new THREE.Vector3(1, 1, 1);
    var tempExtent3 = new THREE.Vector3();
    var tempMat4 = new THREE.Matrix4();
    var tempPosition = new THREE.Vector3();
    var tempRotation = new THREE.Vector3();
    var tempQuaternion = new THREE.Quaternion();
    var tempEuler = new THREE.Euler(0, 0, 0, 'YXZ');

    // The actual function, which we return.
    return function (t, dt) {
      // Check to see if the anchor list is available.
      var threear = this.el.components['three-ar'];
      if (!threear || !threear.arDisplay) { return; }
      var arDisplay = threear.arDisplay;

      // Ideally we would have either events, or separate lists for added / updated / removed.
      var addedThese = [];
      var updatedThese = [];
      var removedThese = [];

      // Because we don't have an indication of added / updated / removed,
      // try to keep track ourselves.
      var seenThese = {};
      var i;
      // Iterate over the available planes.
      var planes = arDisplay.getPlanes ? arDisplay.getPlanes() : arDisplay.anchors_;
      for (i=0; planes && i<planes.length; i++) {
        var plane = planes[i];
        // Get plane identifier.
        // Force plane identifier conformance to common spec (almost latest spec).
        var id = (plane.identifier !== undefined ? plane.identifier : plane.id).toString();
        // Note that we've seen it.
        seenThese[id] = true;
        // Figure out whether added or updated.
        var updatedThis = !this.planes.has(id);
        if (this.planes.has(id)) {
          // If we've seen it before, we should have it cached in this.planes already, to compare against.
          if (!AFRAME.deepEqual(plane, this.planes[id])) {
            updatedThese.push(plane);
          }
        } else {
          // Remember by cloning the plane into this.planes.
          this.planes[id] = JSON.parse(JSON.stringify(plane));
          addedThese.push(plane);
        }
      }
      // To find ones we've removed, we need to scan this.planes.
      this.planes.forEach(function (key, value, map) {
        if (!seenThese[key]) {
          removedThese.push(value);
        }
      });
      // Remove any we should from the cache, afterward to avoid iteration races.
      var self = this;
      removedThese.forEach(function (plane) {
        var id = (plane.identifier !== undefined ? plane.identifier : plane.id).toString();
        self.planes.delete(id);
      });

      // OK, now we should have separate added / updated / removed lists,
      // from which we can emit appropriate events downstream.

      // First, emit remove events as appropriate.
      removedThese.forEach(function (plane) {
        var id = (plane.identifier !== undefined ? plane.identifier : plane.id).toString();
        self.el.emit('removeplane', {id: id});
      });

      // Next, emit updated events as appropriate.
      updatedThese.forEach(function (plane) {
        var id = (plane.identifier !== undefined ? plane.identifier : plane.id).toString();
	// Per spec, we get position (as array3), quaternion (as array4), and extent (as vec2).
        // But ARKit doesn't follow spec, instead giving transform (mat4).
	if (plane.transform) {
          // ARKit
          tempMat4.fromArray(plane.transform);
          tempMat4.decompose(tempPosition, tempQuaternion, tempScale);
        } else {
          tempPosition.fromArray(plane.position);
          tempQuaternion.fromArray(plane.orientation);
	}
        tempEuler.setFromQuaternion(tempQuaternion);
        tempRotation.set(
          tempEuler.x * THREE.Math.RAD2DEG,
          tempEuler.y * THREE.Math.RAD2DEG,
          tempEuler.z * THREE.Math.RAD2DEG);
        tempExtent3.set(plane.extent[0], 0, plane.extent[1]);

        self.el.emit('updateplane', {
          id: id,
          alignment: tempAlignment,
          position: tempPosition,
          rotation: tempRotation,
          extent: tempExtent3,
          vertices: plane.vertices || plane.polygon,
          scale: tempScale});
      });

      // Last, emit added/created events as appropriate.
      addedThese.forEach(function (plane) {
        var id = (plane.identifier !== undefined ? plane.identifier : plane.id).toString();
	// Per spec, we get position (as array3), quaternion (as array4), and extent (as vec2).
        // But ARKit doesn't follow spec, instead giving transform (mat4).
	if (plane.transform) {
          // ARKit
          tempMat4.fromArray(plane.transform);
          tempMat4.decompose(tempPosition, tempQuaternion, tempScale);
        } else {
          tempPosition.fromArray(plane.position);
          tempQuaternion.fromArray(plane.orientation);
	}
        tempEuler.setFromQuaternion(tempQuaternion);
        tempRotation.set(
          tempEuler.x * THREE.Math.RAD2DEG,
          tempEuler.y * THREE.Math.RAD2DEG,
          tempEuler.z * THREE.Math.RAD2DEG);
        tempExtent3.set(plane.extent[0], 0, plane.extent[1]);

        self.el.emit('createplane', {
          id: id,
          alignment: tempAlignment,
          position: tempPosition,
          rotation: tempRotation,
          extent: tempExtent3,
          vertices: plane.vertices || plane.polygon,
          scale: tempScale});
      });
    };    
  })()
});
