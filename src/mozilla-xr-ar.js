AFRAME.registerComponent('mozilla-xr-ar', {
    schema: {
        takeOverCamera: {default: true},
        cameraUserHeight: {default: false}
    },

    init: function () {
        this.onInit = this.onInit.bind(this);
        this.onWatch = this.onWatch.bind(this);

        this.poseMatrix = new THREE.Matrix4();
        this.posePosition = new THREE.Vector3();
        this.poseQuaternion = new THREE.Quaternion();
        this.poseEuler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.poseRotation = new THREE.Vector3();
        this.projectionMatrix = new THREE.Matrix4();
        this.viewMatrix = new THREE.Matrix4();

        this.onceSceneLoaded = this.onceSceneLoaded.bind(this);
        if (this.el.sceneEl.hasLoaded) {
            console.log('mozilla-xr-ar: hasLoaded, setTimeout');
            setTimeout(this.onceSceneLoaded);
        } else {
            console.log('mozilla-xr-ar: !hasLoaded, addEventListener');
            this.el.sceneEl.addEventListener('loaded', this.onceSceneLoaded);
        }

        // Add planes handling, so we can do synchronous hit test.
        // From google-ar/WebARonARKit; also see webxr-polyfill/ARKitWrapper.js

        this.planes_ = new Map();
        this.anchors_ = new Map();
    },

    // For WebXR Viewer, we are currently directly hooking the callback
    // used to provide frame data, so we don't need to do anything in tick!

    takeOverCamera: function (camera) {
        this.arCamera = camera;
        camera.el.setAttribute('ar-camera', 'enabled', true);
    },

    onceSceneLoaded: function () {
        // Check if the low-level WebXR Viewer interfaces are there.
        if (!window.webkit || !window.webkit.messageHandlers) { return; }
        if (!window.webkit.messageHandlers.initAR) { return; }

        // Ugly hack to get around WebXR Viewer resizing issue.
        setTimeout(function () {
            var scene = AFRAME.scenes[0];
            scene.canvas.style.position = "absolute !important";
            scene.canvas.style.width = "100% !important";
            scene.canvas.style.height = "100% !important";
            setTimeout(function () { scene.resize(); });
        }, 1000);

        window['arkitCallback' + 0] = this.onInit;
        window['arkitCallback' + 1] = this.onWatch;

        // Compose data to use with initAR.
        var data = {
            options: {
                ui: {
                    browser: true,
                    points: true,
                    focus: false,
                    rec: true,
                    rec_time: true,
                    mic: false,
                    build: false,
                    plane: true,
                    warnings: true,
                    anchors: false,
                    debug: true,
                    statistics: false
                }
            },
            callback: 'arkitCallback0' // this.onInit as window callback
        };

        // Call initAR.
        window.webkit.messageHandlers.initAR.postMessage(data);
    },

    checkForARDisplay: function () {
        // Check if the low-level WebXR Viewer interfaces are there.
        if (!window.webkit || !window.webkit.messageHandlers) { return; }
        if (!window.webkit.messageHandlers.watchAR) { return; }

        // Mozilla WebXR Viewer detected.
        this.arDisplay = true;

        // Compose data to use with watchAR.
        var data = {
            options: {
	        location: true,
                camera: true,
                objects: true,
                light_intensity: true
            },
            callback: 'arkitCallback1' // this.onWatch as window callback
        };

        // Add resize handling.
        window['arkitWindowResize'] = function () {
            setTimeout(function() {
                AFRAME.scenes[0].resize();
            }, 100);
        };

        // Start watching AR.
        window.webkit.messageHandlers.watchAR.postMessage(data);

        var self = this;

        // The scene is loaded, so scene components etc. should be available.
        var scene = self.el.sceneEl;

        // Take over the scene camera, if so directed.
        // But wait a tick, because otherwise injected camera will not be present.
        if (self.data.takeOverCamera) {
            setTimeout(function () { self.takeOverCamera(scene.camera); });
        }

        // Modify the scene renderer to allow ARView video passthrough.
        scene.renderer.setPixelRatio(1);
        scene.renderer.autoClear = false;
        scene.renderer.setClearColor('#000', 0);
        scene.renderer.alpha = true;
    },

    onInit: function (deviceId) {
        this.checkForARDisplay();
    },

    onWatch: function (data) {
        this.frameData = data;
        this.handleFrame(data);
    },

    handleFrame: function (data) {
        var scene = this.el.sceneEl;

        // Decompose to get camera pose.
        this.poseMatrix.fromArray(data.camera_transform);
        this.poseMatrix.decompose(this.posePosition, this.poseQuaternion, this.poseRotation); // poseRotation is really scale, we redo below
        this.poseEuler.setFromQuaternion(this.poseQuaternion);
        this.poseRotation.set(
            THREE.Math.RAD2DEG * this.poseEuler.x,
            THREE.Math.RAD2DEG * this.poseEuler.y,
            THREE.Math.RAD2DEG * this.poseEuler.z);

        this.projectionMatrix.fromArray(data.projection_camera);
        this.viewMatrix.fromArray(data.camera_view);

        // If we control a camera, and should apply user height, do it.
        if (this.arCamera && this.data.cameraUserHeight) {
            this.posePosition.y += this.arCamera.el.components.camera.data.userHeight;
        }

        // For A-Painter, detect bogus pose and fire poseFound / poseLost.
        var poseValid = this.posePosition.x || this.posePosition.y || this.posePosition.z || this.poseQuaternion.x || this.poseQuaternion.y || this.poseQuaternion.z;
        if (poseValid) {
          if (this.poseLost !== false) {
            this.poseLost = false;
            this.el.emit('poseFound');
          }
        } else {
          if (this.poseLost !== true) {
            this.poseLost = true;
            this.el.emit('poseLost', false);
          }
        }

        // Add planes handling, so we can do synchronous hit test.
        // From google-ar/WebARonARKit; also see webxr-polyfill/ARKitWrapper.js

        var i;

        if(data.newObjects && data.newObjects.length){
          for (i = 0; i < data.newObjects.length; i++) {
            var element = data.newObjects[i];
            if(element.h_plane_center){
              this.planes_.set(element.uuid, {
                id: element.uuid,
                center: element.h_plane_center,
                extent: [element.h_plane_extent.x, element.h_plane_extent.z],
                modelMatrix: element.transform
              });
            }else{
              this.anchors_.set(element.uuid, {
                id: element.uuid,
                modelMatrix: element.transform
              });
            }
          }
        }

        if(data.removedObjects && data.removedObjects.length){
          for (i = 0; i < data.removedObjects.length; i++) {
            var element = data.removedObjects[i];
            if(element.h_plane_center){
              this.planes_.delete(element.uuid);
            }else{
              this.anchors_.delete(element.uuid);
            }
          }
        }

        if(data.objects && data.objects.length){
          for (i = 0; i < data.objects.length; i++) {
            var element = data.objects[i];
            if(element.h_plane_center){
              var plane = this.planes_.get(element.uuid);
              if(!plane){
                this.planes_.set(element.uuid, {
                  id: element.uuid,
                  center: element.h_plane_center,
                  extent: [element.h_plane_extent.x, element.h_plane_extent.z],
                  transform: element.transform
                });
              } else {
                plane.center = element.h_plane_center;
                plane.extent = [element.h_plane_extent.x, element.h_plane_extent.z];
                plane.transform = element.transform;
              }
            }else{
              var anchor = this.anchors_.get(element.uuid);
              if(!anchor){
                this.anchors_.set(element.uuid, {
                  id: element.uuid,
                  transform: element.transform
                });
              }else{
                anchor.transform = element.transform;
              }
            }
          }
        }
    },

    getPosition: function () {
        if (!this.arDisplay) { return null; }
        return this.posePosition;
    },

    getOrientation: function () {
        if (!this.arDisplay) { return null; }
        return this.poseQuaternion;
    },

    getRotation: function () {
        if (!this.arDisplay) { return null; }
        return this.poseRotation;
    },

    getProjectionMatrix: function () {
        if (!this.arDisplay) { return null; }
        return this.projectionMatrix;
    },

    // Use planes to do synchronous hit test.
    // From google-ar/WebARonARKit; also see webxr-polyfill/ARKitWrapper.js

    getPlanes: function () {
        return Array.from(this.planes_.values());
    },

    hitTestNoAnchor: (function () {
        // Temporary variables, only within closure scope.

		/**
		 * The result of a raycast into the AR world encoded as a transform matrix.
		 * This structure has a single property - modelMatrix - which encodes the
		 * translation of the intersection of the hit in the form of a 4x4 matrix.
		 * @constructor
		 */
		function VRHit() {
			this.modelMatrix = new Float32Array(16);
			return this;
		};

                       /**
			* Cached vec3, mat4, and quat structures needed for the hit testing to
			* avoid generating garbage.
			* @type {Object}
			*/
			var hitVars = {
			 rayStart: new THREE.Vector3(), //vec3.create(),
			 rayEnd: new THREE.Vector3(), //vec3.create(),
			 cameraPosition: new THREE.Vector3(), //vec3.create(),
			 cameraQuaternion: new THREE.Quaternion(), //quat.create(),	
			 //modelViewMatrix: new THREE.Matrix4(), //mat4.create(),
			 //projectionMatrix: new THREE.Matrix4(), //mat4.create(),
			 projViewMatrix: new THREE.Matrix4(), //mat4.create(),
			 worldRayStart: new THREE.Vector3(), //vec3.create(),
			 worldRayEnd: new THREE.Vector3(), //vec3.create(),
			 worldRayDir: new THREE.Vector3(), //vec3.create(),
			 planeMatrix: new THREE.Matrix4(), //mat4.create(),
			 planeMatrixInverse: new THREE.Matrix4(), //mat4.create(),
			 planeExtent: new THREE.Vector3(), //vec3.create(),
			 planePosition: new THREE.Vector3(), //vec3.create(),
			 planeCenter: new THREE.Vector3(), //vec3.create(),
			 planeNormal: new THREE.Vector3(), //vec3.create(),
			 planeIntersection: new THREE.Vector3(), //vec3.create(),
			 planeIntersectionLocal: new THREE.Vector3(), //vec3.create(),
			 planeHit: new THREE.Matrix4(), //mat4.create()
			 //planeQuaternion: quat.create()
		 };
 
		 /**
			* Tests whether the given ray intersects the given plane.
			*
			* @param {!vec3} planeNormal The normal of the plane.
			* @param {!vec3} planePosition Any point on the plane.
			* @param {!vec3} rayOrigin The origin of the ray.
			* @param {!vec3} rayDirection The direction of the ray (normalized).
			* @return {number} The t-value of the intersection (-1 for none).
			*/
		 var rayIntersectsPlane = (function() {
			 var rayToPlane = new THREE.Vector3();
			 return function(planeNormal, planePosition, rayOrigin, rayDirection) {
				 // assuming vectors are all normalized
				 var denom = planeNormal.dot(rayDirection);
				 rayToPlane.subVectors(planePosition, rayOrigin);
				 return rayToPlane.dot(planeNormal) / denom;
			 };
		 })();
 
		 /**
			* Sorts based on the distance from the VRHits to the camera.
			*
			* @param {!VRHit} a The first hit to compare.
			* @param {!VRHit} b The second hit item to compare.
			* @returns {number} -1 if a is closer than b, otherwise 1.
			*/
		 var sortFunction = function(a, b) {
			 // Get the matrix of hit a.
			 hitVars.planeMatrix.fromArray(a.modelMatrix);
			 // Get the translation component of a's matrix.
			 hitVars.planeIntersection.setFromMatrixPosition(hitVars.planeMatrix);
			 // Get the distance from the intersection point to the camera.
			 var distA = hitVars.planeIntersection.distanceTo(hitVars.cameraPosition);
 
			 // Get the matrix of hit b.
			 hitVars.planeMatrix.fromArray(b.modelMatrix);
			 // Get the translation component of b's matrix.
			 hitVars.planeIntersection.setFromMatrixPosition(hitVars.planeMatrix);
			 // Get the distance from the intersection point to the camera.
			 var distB = hitVars.planeIntersection.distanceTo(hitVars.cameraPosition);
 
			 // Return comparison of distance from camera to a and b.
			 return distA < distB ? -1 : 1;
		 };
 
		 return function(x, y) {
			 // Coordinates must be in normalized screen space.
			 if (x < 0 || x > 1 || y < 0 || y > 1) {
				 throw new Error(
						 "hitTest - x and y values must be normalized [0,1]!")
				 ;
			 }
 
			 var hits = [];
			 // If there are no anchors detected, there will be no hits.
			 var planes = this.getPlanes();
			 if (!planes || planes.length == 0) {
				 return hits;
			 }

			 // Create a ray in screen space for the hit test ([-1, 1] with y flip).
			 hitVars.rayStart.set(2 * x - 1, 2 * (1 - y) - 1, 0);
			 hitVars.rayEnd.set(2 * x - 1, 2 * (1 - y) - 1, 1);

			 // Set the projection matrix.
			 //hitVars.projectionMatrix.fromArray(this.projectionMatrix);
 
			 // Set the model view matrix.
			 //hitVars.modelViewMatrix.fromArray(this.viewMatrix);
 
			 // Combine the projection and model view matrices.
			 hitVars.planeMatrix.multiplyMatrices(
				 this.projectionMatrix, //hitVars.projectionMatrix,
				 this.viewMatrix //hitVars.modelViewMatrix
			 );
			 // Invert the combined matrix because we need to go from screen -> world.
			 hitVars.projViewMatrix.getInverse(hitVars.planeMatrix);
 
			 // Transform the screen-space ray start and end to world-space.
			 hitVars.worldRayStart.copy(hitVars.rayStart)
				 .applyMatrix4(hitVars.projViewMatrix);
			 hitVars.worldRayEnd.copy(hitVars.rayEnd)
				 .applyMatrix4(hitVars.projViewMatrix);
 
			 // Subtract start from end to get the ray direction and then normalize.
			 hitVars.worldRayDir.subVectors(
				 hitVars.worldRayEnd,
				 hitVars.worldRayStart
			 ).normalize();

			 // Go through all the anchors and test for intersections with the ray.
			 for (var i = 0; i < planes.length; i++) {
				 var plane = planes[i];
				 // Get the anchor transform.
				 hitVars.planeMatrix.fromArray(plane.modelMatrix);
 
				 // Get the position of the anchor in world-space.
				 hitVars.planeCenter.set(0, 0, 0);
				 hitVars.planePosition.copy(hitVars.planeCenter)
					 .applyMatrix4(hitVars.planeMatrix)
 
				 // Get the plane normal.
				 // TODO: use alignment to determine this.
				 hitVars.planeNormal.set(0, 1, 0);
 
				 // Check if the ray intersects the plane.
				 var t = rayIntersectsPlane(
					 hitVars.planeNormal,
					 hitVars.planePosition,
					 hitVars.worldRayStart,
					 hitVars.worldRayDir
				 );

				 // if t < 0, there is no intersection.
				 if (t < 0) {
					 continue;
				 }
 
				 // Calculate the actual intersection point.
				 hitVars.planeIntersectionLocal.copy(hitVars.worldRayDir).multiplyScalar(t);
				 hitVars.planeIntersection.addVectors(
					 hitVars.worldRayStart,
					 hitVars.planeIntersectionLocal
				 );
				 // Get the plane extents (extents are in plane local space).
				 hitVars.planeExtent.set(plane.extent[0], 0, plane.extent[1]);
				 /*
					 ///////////////////////////////////////////////
					 // Test by converting extents to world-space.
					 // TODO: get this working to avoid matrix inversion in method below.
 
					 // Get the rotation component of the anchor transform.
					 mat4.getRotation(hitVars.planeQuaternion, hitVars.planeMatrix);
 
					 // Convert the extent into world space.
					 vec3.transformQuat(
					 hitVars.planeExtent, hitVars.planeExtent, hitVars.planeQuaternion);
 
					 // Check if intersection is outside of the extent of the anchor.
					 if (Math.abs(hitVars.planeIntersection[0] - hitVars.planePosition[0]) > hitVars.planeExtent[0] / 2) {
					 continue;
					 }
					 if (Math.abs(hitVars.planeIntersection[2] - hitVars.planePosition[2]) > hitVars.planeExtent[2] / 2) {
					 continue;
					 }
					 ////////////////////////////////////////////////
					 */
 
				 ////////////////////////////////////////////////
				 // Test by converting intersection into plane-space.
				 hitVars.planeMatrixInverse.getInverse(hitVars.planeMatrix);
				 hitVars.planeIntersectionLocal.copy(hitVars.planeIntersection)
					 .applyMatrix4(hitVars.planeMatrixInverse);
 
				 // Check if intersection is outside of the extent of the anchor.
				 // Tolerance is added to match the behavior of the native hitTest call.
				 var tolerance = 0.0075;
				 if (
					 Math.abs(hitVars.planeIntersectionLocal.x) >
					 hitVars.planeExtent.x / 2 + tolerance
				 ) {
					 continue;
				 }
				 if (
					 Math.abs(hitVars.planeIntersectionLocal.z) >
					 hitVars.planeExtent.z / 2 + tolerance
				 ) {
					 continue;
				 }
 
				 ////////////////////////////////////////////////
 
				 // The intersection is valid - create a matrix from hit position.
				 hitVars.planeHit.makeTranslation(
                                   hitVars.planeIntersection.x,
                                   hitVars.planeIntersection.y,
                                   hitVars.planeIntersection.z);
				var hit = new VRHit();
				 for (var j = 0; j < 16; j++) {
					 hit.modelMatrix[j] = hitVars.planeHit.elements[j];
				 }
				 hit.i = i;
				 hits.push(hit);
			 }
 

			 // Sort the hits by distance.
			 hits.sort(sortFunction);
			 return hits;
		 };
    })(),

    hitAR: (function () {
        // Temporary variables, only within closure scope.
        var transform = new THREE.Matrix4();
        var hitpoint = new THREE.Vector3();
        var hitquat = new THREE.Quaternion();
        var hitscale = new THREE.Vector3();
        var worldpos = new THREE.Vector3();

        // The desired function, which this returns.
        return function (x, y, el, raycasterEl) {
            if (!this.arDisplay) { return []; }

            var hit = this.hitTestNoAnchor(x, y);

            // Process AR hits.
            var hitsToReturn = [];
            for (var i = 0; hit && i < hit.length; i++) {
                transform.fromArray(hit[0].modelMatrix);
                transform.decompose(hitpoint, hitquat, hitscale);
                raycasterEl.object3D.getWorldPosition(worldpos);

                hitsToReturn.push({
                    distance: hitpoint.distanceTo(worldpos),
                    point: hitpoint, // Vector3
                    object: (el && el.object3D) || this.el.sceneEl.object3D
/*
                    // We don't have any of these properties...
                    face: undefined, // Face3
                    faceIndex: undefined,
                    index: undefined,
                    uv: undefined // Vector2
*/
                });
            }
            return hitsToReturn;
        }   
    })()
});
