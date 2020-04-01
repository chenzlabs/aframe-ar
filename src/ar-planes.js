/* global AFRAME, THREE */

AFRAME.registerComponent('ar-planes', {

  getPlaneSource: function () {
    var whichar;
    if (!this.planeSource) {
      whichar = this.el.sceneEl.components['ar'];
      if (whichar) {
        this.planeSource = whichar.getSource();
      }
    }
    return this.planeSource;
  },

  getPlanes: function () {
    var planeSource = this.getPlaneSource();
    if (!planeSource || !planeSource.getPlanes) return undefined;
    return planeSource.getPlanes();
  },

  init: function () {
    // Remember planes when we see them.
    this.planes = {};
    this.anchorsAdded = [];
    this.anchorsAddedDetail = {type:'added', anchors: this.anchorsAdded};
    this.anchorsUpdated = [];
    this.anchorsUpdatedDetail = {type:'updated', anchors: this.anchorsUpdated};
    this.anchorsRemoved = [];
    this.anchorsRemovedDetail = {type:'removed', anchors: this.anchorsRemoved};
  },

  tick: (function (t, dt) {
    // Create the temporary variables we will reuse, if needed.
    var tempScale = new THREE.Vector3(1, 1, 1);
    var tempMat4 = new THREE.Matrix4();
    var tempPosition = new THREE.Vector3();
    var tempQuaternion = new THREE.Quaternion();

    // The actual function, which we return.
    return function (t, dt) {
      // Get the list of planes.
      var planes = this.getPlanes();
      if (!planes) { return; }

      // Ideally we would have either events, or separate lists for added / updated / removed.
      var addedThese = [];
      var updatedThese = [];
      var removedThese = [];

      // Because we don't have an indication of added / updated / removed,
      // try to keep track ourselves.
      var seenThese = {};
      var i;

      // Iterate over the available planes.
      for (i=0; planes && i<planes.length; i++) {
        var plane = planes[i];

        // Force plane conformance to latest spec.
        // (Hopefully soon, this will no longer be required.)
        var planespec;
        // Get plane identifier and conform.
        var id = (plane.identifier !== undefined ? plane.identifier : plane.id).toString();
        // Get plane timestamp, if available.
        var timestamp = plane.timestamp;

        // Note that we've seen it.
        seenThese[id] = true;

        var adding = !this.planes[id];
        var hasTimestamp = timestamp !== undefined;
        if (!adding) {
            // We've seen this plane before.
            // If this plane has a timestamp,
            if (hasTimestamp) {
                // And the timestamp is identical,
                if (timestamp === this.planes[id].timestamp) {
                    // Then we don't need to do any more work for this plane,
                    // since it hasn't changed.
                    continue;
                } else {
                    // We have a timestamp, and it doesn't match,
                    // so we'll be updating the previous plane spec.
                }
            } else {
                // This plane didn't have a timestamp,
                // so unfortunately we'll need to do brute force comparison.
                // We might update the previous plane spec afterward.
            }
        } else {
            // We haven't seen this plane before, so we'll be adding it.
        }

        // If we're still here, we need to finish building the plane spec.

        planespec = {identifier: id};
        if (timestamp !== undefined) { planespec.timestamp = timestamp; }

	// New API plane spec uses modelMatrix (same as transform).
        if (plane.modelMatrix || plane.transform) {
          planespec.modelMatrix = plane.modelMatrix || plane.transform;
        } else {
          // Create modelMatrix from position and orientation.
          tempPosition.fromArray(plane.position);
          tempQuaternion.fromArray(plane.orientation);
          tempScale.set(1, 1, 1);
          tempMat4.compose(tempPosition, tempQuaternion, tempScale);
          planespec.modelMatrix = tempMat4.elements.slice();
        }

        planespec.extent = plane.extent;
        if (plane.center) { planespec.center = plane.center; }
        if (plane.polygon) { planespec.vertices = plane.polygon; } 
        else if (plane.vertices) { planespec.vertices = plane.vertices; }

        // Figure out whether added or updated.
        // If we've seen it before,
        if (!adding) {
          // And it has a timestamp,
          if (hasTimestamp) {
            // We're updating it (because if not we'd be done already.)
            updatedThese.push(planespec);
	  } else
          // If it didn't have a timestamp, do brute force comparison.
          // FIXME: better brute-force comparison!
          if (AFRAME.utils.deepEqual(planespec, this.planes[id])) {
            // It didn't change, so we're done with this one.
            continue;
          } else {
            // It changed, so we're updating it.
            // However, since we need to do brute force comparison,
            // we'll need to clone it when we remember.
            updatedThese.push(planespec);
          }
        } else {
          // We haven't see it, so we're adding it.
          addedThese.push(planespec)
        }

        // If we're still here, we need to remember the new planespec.

        // If we have timestamps,
        if (hasTimestamp) {
          // We only need to compare that,
          // so we don't need to copy or clone anything.
          // since we always make a new plane spec right now.
          this.planes[id] = planespec;
        } else {
          // Because the objects in the plane may be updated in place,
          // we need to clone those parts of the remembered plane spec.
          this.planes[id] = {
            identifier: planespec.identifier,
            modelMatrix: planespec.modelMatrix.slice(),
            extent: planespec.extent.slice()
          };
/* WebXR Viewer problem? WebARon___ doesn't use.
          if (planespec.center) {
            this.planes[id].center = planespec.center.slice();
          }
*/
          if (planespec.vertices) {
            this.planes[id].vertices = planespec.vertices.slice();
          }
        }
      }

      // To find ones we've removed, we need to scan this.planes.
      var self = this;
      Object.keys(self.planes).forEach(function (key) {
        if (!seenThese[key]) {
          removedThese.push(self.planes[key]);
          delete self.planes[key];
        }
      });

      // OK, now we should have separate added / updated / removed lists,
      // with planes that match spec,
      // from which we can emit appropriate events downstream.

      // Replace the old list.
      this.anchorsAdded = addedThese;
      // Emit event if list isn't empty.
      if (addedThese.length > 0) {
        // Reuse the same event detail to avoid making garbage.
        // TODO: Reuse same CustomEvent?
        this.anchorsAddedDetail.anchors = addedThese;
        this.el.emit('anchorsadded', this.anchorsAddedDetail);
      }

      // Replace the old list.
      this.anchorsUpdated = updatedThese;
      // Emit event if list isn't empty.
      if (updatedThese.length > 0) {
        // Reuse the same event detail to avoid making garbage.
        // TODO: Reuse same CustomEvent?
        this.anchorsUpdatedDetail.anchors = updatedThese;
        this.el.emit('anchorsupdated', this.anchorsUpdatedDetail);
      }

      // Replace the old list.
      this.anchorsRemoved = removedThese;
      // Emit event if list isn't empty.
      if (removedThese.length > 0) {
        // Reuse the same event detail to avoid making garbage.
        // TODO: Reuse same CustomEvent?
        this.anchorsRemovedDetail.anchors = removedThese;
        this.el.emit('anchorsremoved', this.anchorsRemovedDetail);
      }
    };    
  })()
});
