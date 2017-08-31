AFRAME.registerComponent('three-ar-planes', {
  dependencies: ['three-ar'],

  init: function () {
    console.log('three-ar-planes-arkit: Make sure you are using the right WebARonARKit!');
  },
  
  addEventListeners: function (obj) {
    // Install event listeners.
    obj.addEventListener('anchorsAdded', this.anchorsAdded.bind(this));
    obj.addEventListener('anchorsUpdated', this.anchorsUpdated.bind(this));
    obj.addEventListener('anchorsRemoved', this.anchorsRemoved.bind(this));
  },

  tick: function (t, dt) {
    if (this.alreadyFiredFirstUpdate) { return; }
    
    // Fire anchors added events for existing anchors.
    // (This needs to fire for first ARKit update only.)
    var threear = this.el.components['three-ar'];
    if (!threear || !threear.arDisplay) { return; }
    
    if (!this.alreadyAddedEventListeners) {
      this.alreadyAddedEventListeners = true;
      // Install event listeners on display.
      this.addEventListeners(threear.arDisplay);
    }
    
    var anchors = threear.arDisplay.anchors_;
    if (!anchors) { return; }
    this.emitAnchorEvents('createplane', anchors);
    this.alreadyFiredFirstUpdate = true;
  },
  
  // Note that this is a shim to a prior code convention that would emit
  // createplane / updateplane / removeplane for each plane in question.
  // (per-plane events).
  // Really, there's nothing wrong with using aggregated event forms,
  // especially from lower layers.
  emitAnchorEvents: function (eventName, anchors) {
    if (!this.tempPosition) { this.tempPosition = new THREE.Vector3(); }
    if (!this.tempQuaternion) { this.tempQuaternion = new THREE.Quaternion(); }
    if (!this.tempScale) { this.tempScale = new THREE.Vector3(); }
    if (!this.tempRotation) { this.tempRotation = new THREE.Euler(0, 0, 0, 'YXZ'); }
    if (!this.tempMatrix4) { this.tempMatrix4 = new THREE.Matrix4(); }
    for (i=0; i<anchors.length; i++) {
      var anchor = anchors[i];
      this.tempMatrix4.fromArray(anchor.transform);
      this.tempMatrix4.decompose(this.tempPosition, this.tempQuaternion, this.tempScale);
      this.tempRotation.setFromQuaternion(this.tempQuaternion);
      
      this.el.emit(eventName, {
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
  },
  
  anchorsAdded: function (evt) {
    this.emitAnchorEvents('createplane', evt.detail.anchors);
  },
    
  anchorsUpdated: function (evt) {
    this.emitAnchorEvents('updateplane', evt.detail.anchors);
  },
  
  anchorsRemoved: function (evt) {
    this.emitAnchorEvents('removeplane', evt.detail.anchors);
  }
});
