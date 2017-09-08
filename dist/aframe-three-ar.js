/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	__webpack_require__(1);
	__webpack_require__(2);
	__webpack_require__(3);
	__webpack_require__(4);



/***/ }),
/* 1 */
/***/ (function(module, exports) {

	AFRAME.registerComponent('three-ar', {
	    schema: {
	        takeOverCamera: { default: true }
	    },

	    init: function () {
	        if (this.el.sceneEl.hasLoaded) { this.onceSceneLoaded(); }
	        else { this.el.sceneEl.addEventListener('loaded', this.onceSceneLoaded.bind(this)); }
	    },

	    tick: function (t, dt) {
	        if (!this.arDisplay || !this.arDisplay.getFrameData) { return; }

	        // If we have an ARView, render it.
	        if (this.arView) { this.arView.render(); }

	        // If we've taken over a camera, update it.  If not, we're done.
	        if (!this.arCamera) { return; }

	        var camera = this.arCamera;

	        // Get the ARDisplay frame data with pose and projection matrix.
	        if (!this.frameData) {
	            this.frameData = new VRFrameData();
	        }
	        this.arDisplay.getFrameData(this.frameData);

	        // Apply the pose position so that other A-Frame components can see the values.
	        var position = this.frameData.pose.position;
	        camera.el.setAttribute('position', { x: position['0'], y: position['1'], z: position['2'] });

	        // Apply the pose rotation so that other A-Frame components can see the values.
	        if (!this.poseEuler) {
	            this.poseEuler = new THREE.Euler(0, 0, 0, 'YXZ');
	        }
	        if (!this.poseQuaternion) {
	            this.poseQuaternion = new THREE.Quaternion();
	        }
	        var orientation = this.frameData.pose.orientation;
	        this.poseQuaternion.set(orientation["0"], orientation["1"], orientation["2"], orientation["3"]);
	        this.poseEuler.setFromQuaternion(this.poseQuaternion);
	        camera.el.setAttribute('rotation', {
	            x: THREE.Math.RAD2DEG * this.poseEuler.x,
	            y: THREE.Math.RAD2DEG * this.poseEuler.y,
	            z: THREE.Math.RAD2DEG * this.poseEuler.z
	        });

	        // Apply the projection matrix.
	        // Can use either left or right projection matrix; pick left for now.
	        camera.projectionMatrix.fromArray(this.frameData.leftProjectionMatrix);
	    },

	    takeOverCamera: function (camera) {
	        this.arCamera = camera;
	        camera.isARPerspectiveCamera = true; // HACK - is this necessary?
	        camera.vrDisplay = this.arDisplay; // HACK - is this necessary?
	        // ARKit/Core will give us rotation, don't compound it with look-controls.
	        camera.el.setAttribute('look-controls', { enabled: false });
	    },

	    onceSceneLoaded: function () {
	        // Get the ARDisplay, if any.
	        var self = this;
	        THREE.ARUtils.getARDisplay().then(function (display) {
	            self.arDisplay = display;
	            if (!display) { return; }

	            // The scene is loaded, so scene components etc. should be available.
	            var scene = self.el.sceneEl;

	            // Take over the scene camera, if so directed.
	            // But wait a tick, because otherwise injected camera will not be present.
	            if (self.data.takeOverCamera) {
	              setTimeout(function () { self.takeOverCamera(scene.camera); });
	            }

	            // Modify the scene renderer to allow ARView video passthrough.
	            scene.renderer.alpha = true;
	            scene.renderer.autoClearColor = THREE.ARUtils.isARKit(display);
	            scene.renderer.autoClearDepth = true;

	            // Create the ARView.
	            self.arView = new THREE.ARView(display, scene.renderer);
	        });
	    },

	    getProjectionMatrix: function () {
	        if (!this.arDisplay || !this.arDisplay.getFrameData) { return null; }

	        // Get the ARDisplay frame data with pose and projection matrix.
	        if (!this.frameData) {
	            this.frameData = new VRFrameData();
	        }
	        this.arDisplay.getFrameData(this.frameData);

	        // Can use either left or right projection matrix; pick left for now.
	        return this.frameData.leftProjectionMatrix;
	    }
	});


/***/ }),
/* 2 */
/***/ (function(module, exports) {

	AFRAME.registerComponent('three-ar-planes', {
	  dependencies: ['three-ar'],

	  init: function () {
	    // Remember planes when we see them.
	    this.planes = {};
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

	      // Get the list of planes.
	      var planes = arDisplay.getPlanes ? arDisplay.getPlanes() : arDisplay.anchors_;

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
	        var planespec = {};
	        // Get plane identifier and conform.
	        planespec.identifier = (plane.identifier !== undefined ? plane.identifier : plane.id).toString();
	        // Copy plane timestamp, if available.
	        if (plane.timestamp) { planespec.timestamp = plane.timestamp; }
		// Make the position, orientation and extent data conform.
	        if (plane.transform) {
	          // ARKit exposes transform, not position and orientation.
	          // We don't have change timestamps, so planespec needs to be JSON stringify/parse cloneable.
	          tempMat4.fromArray(plane.transform);
	          tempMat4.decompose(tempPosition, tempQuaternion, tempScale);
	          planespec.position = [tempPosition.x, tempPosition.y, tempPosition.z];
	          planespec.orientation = [tempQuaternion._x, tempQuaternion._y, tempQuaternion._z, tempQuaternion._w];
	          planespec.extent = plane.extent;
	        } else {
	          // Draft ARCore exposes typed arrays, which JSON stringify/parse hates.
	          // (However, if we can rely on timestamps for update check, we don't need to worry about that.)
	          if (planespec.timestamp !== undefined) {
	            planespec.position = plane.position;
	            planespec.orientation = plane.orientation;
	            planespec.extent = plane.extent;
	            if (plane.polygon) { planespec.vertices = plane.polygon; } 
	            else if (plane.vertices) { planespec.vertices = plane.vertices; }
	          } else {
	            // Make planespec stringify/parse clone friendly.
	            planespec.position = [plane.position['0'], plane.position['1'], plane.position['2']];
	            planespec.orientation = [plane.orientation['0'], plane.orientation['1'], plane.orientation['2'], plane.orientation['3']];
	            planespec.extent = [plane.extent['0'], plane.extent['1']];
	            if (plane.polygon) {
	              planespec.vertices = [];
	              plane.polygon.forEach(function (n) { planespec.vertices.push(n); });
	            } else if (plane.vertices) { planespec.vertices = plane.vertices; }
	          }
	        }

	        // Note that we've seen it.
		var id = planespec.identifier;
	        seenThese[id] = true;
	        // Figure out whether added or updated.
	        if (this.planes[id]) {
	          // If we've seen it before, and we have timestamp values, just check those
	          if (this.planes[id].timestamp) {
	            if (planespec.timestamp !== this.planes[id].timestamp) {
	              updatedThese.push(planespec);
	            }
		  } else
	          // If we've seen it before, we should have it cached in this.planes already, to compare against.
	          if (!AFRAME.utils.deepEqual(planespec, this.planes[id])) {
	            updatedThese.push(planespec);
	          }
	        } else {
	          // Remember by cloning the plane into this.planes.
	          // If there is a timestamp to check, we don't need to stringify/parse clone for AFRAME.utils.deepEqual.
	          this.planes[id] = planespec.timestamp !== undefined ? planespec : JSON.parse(JSON.stringify(planespec));
	          addedThese.push(planespec);
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

	      // First, emit remove events as appropriate.
	      removedThese.forEach(function (plane) {
	        self.el.emit('removeplane', {id: plane.identifier});
	      });

	      // Next, emit updated events as appropriate.
	      updatedThese.forEach(function (plane) {
		// Per spec, we get:
	        // identifier (as string),
	        // position (as number[3]),
	        // orientation (as number[4]),
	        // extent (as number[2]),
	        // and possible vertices (as number[3*n]

	        // For now, convert to legacy format.
	        tempPosition.fromArray(plane.position);
	        tempQuaternion.fromArray(plane.orientation);
	        tempEuler.setFromQuaternion(tempQuaternion);
	        tempRotation.set(
	          tempEuler.x * THREE.Math.RAD2DEG,
	          tempEuler.y * THREE.Math.RAD2DEG,
	          tempEuler.z * THREE.Math.RAD2DEG);
	        tempExtent3.set(plane.extent[0], 0, plane.extent[1]);

	        self.el.emit('updateplane', {
	          id: plane.identifier,
	          alignment: tempAlignment,
	          position: tempPosition,
	          rotation: tempRotation,
	          extent: tempExtent3,
	          vertices: plane.vertices,
	          scale: tempScale});
	      });

	      // Last, emit added/created events as appropriate.
	      addedThese.forEach(function (plane) {
		// Per spec, we get:
	        // identifier (as string),
	        // position (as number[3]),
	        // orientation (as number[4]),
	        // extent (as number[2]),
	        // and possible vertices (as number[3*n]

	        // For now, convert to legacy format.
	        tempPosition.fromArray(plane.position);
	        tempQuaternion.fromArray(plane.orientation);
	        tempEuler.setFromQuaternion(tempQuaternion);
	        tempRotation.set(
	          tempEuler.x * THREE.Math.RAD2DEG,
	          tempEuler.y * THREE.Math.RAD2DEG,
	          tempEuler.z * THREE.Math.RAD2DEG);
	        tempExtent3.set(plane.extent[0], 0, plane.extent[1]);

	        self.el.emit('createplane', {
	          id: plane.identifier,
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


/***/ }),
/* 3 */
/***/ (function(module, exports) {

	AFRAME.registerComponent('ar', {
	  dependencies: ['three-ar-planes'],
	  init: function () {
	    this.el.sceneEl.setAttribute('vr-mode-ui', {enabled: false});
	  }
	});


/***/ }),
/* 4 */
/***/ (function(module, exports) {

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
	    // Tack on AR hit result, if any.
	    return this.raycasterIntersectObjects(objects, recursive)
	      .concat(this.hitAR());
	  },        
	        
	  hitAR: (function () {          
	    // Temporary variables, only within closure scope.
	    var transform = new THREE.Matrix4();
	    var hitpoint = new THREE.Vector3();
	    var hitquat = new THREE.Quaternion();
	    var hitscale = new THREE.Vector3();
	          
	    // The desired function, which this returns.
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
	      return [{
	        distance: hitpoint.distanceTo(this.el.object3D.position), // Is that right point?
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



/***/ })
/******/ ]);