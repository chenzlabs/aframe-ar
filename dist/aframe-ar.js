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

	AFRAME.registerComponent('ar', {
	  dependencies: ['three-ar'],
	  init: function () {
	    this.el.sceneEl.setAttribute('vr-mode-ui', {enabled: false});
	  }
	});


/***/ }),
/* 3 */
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