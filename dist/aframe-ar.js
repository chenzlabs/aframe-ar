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
	__webpack_require__(5);
	__webpack_require__(6);
	__webpack_require__(7);
	__webpack_require__(8);



/***/ }),
/* 1 */
/***/ (function(module, exports) {

	/* global AFRAME, THREE, VRFrameData */

	AFRAME.registerComponent('three-ar', {
	    schema: {
	        takeOverCamera: {default: true},
	        cameraUserHeight: {default: false},
	        worldSensing: {default: false} // currently unused
	    },

	    init: function () {
	        this.posePosition = new THREE.Vector3();
	        this.poseQuaternion = new THREE.Quaternion();
	        this.poseEuler = new THREE.Euler(0, 0, 0, 'YXZ');
	        this.poseRotation = new THREE.Vector3();
	        this.projectionMatrix = new THREE.Matrix4();

	        this.onceSceneLoaded = this.onceSceneLoaded.bind(this);
	        if (this.el.sceneEl.hasLoaded) {
	            setTimeout(this.onceSceneLoaded);
	        } else {
	            this.el.sceneEl.addEventListener('loaded', this.onceSceneLoaded);
	        }
	    },

	    tick: function (t, dt) {
	        if (!this.arDisplay || !this.arDisplay.getFrameData) { return; }

	        // If we have an ARView, render it.
	        if (this.arView) { this.arView.render(); }

	        // Get the ARDisplay frame data with pose and projection matrix.
	        if (!this.frameData) { this.frameData = new VRFrameData(); }
	        this.arDisplay.getFrameData(this.frameData);

	        // Get the pose information.
	        this.posePosition.fromArray(this.frameData.pose.position);
	        this.poseQuaternion.fromArray(this.frameData.pose.orientation);
	        this.poseEuler.setFromQuaternion(this.poseQuaternion);
	        this.poseRotation.set(
	            THREE.Math.RAD2DEG * this.poseEuler.x,
	            THREE.Math.RAD2DEG * this.poseEuler.y,
	            THREE.Math.RAD2DEG * this.poseEuler.z);

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

	        // Can use either left or right projection matrix; pick left for now.
	        this.projectionMatrix.fromArray(this.frameData.leftProjectionMatrix);
	    },

	    takeOverCamera: function (camera) {
	        this.arCamera = camera;
	        camera.isARPerspectiveCamera = true; // HACK - is this necessary?
	        camera.vrDisplay = this.arDisplay; // HACK - is this necessary?
	        camera.el.setAttribute('ar-camera', 'enabled', true);
	    },

	    onceSceneLoaded: function () {
	        // Add an event listener for ardisplayconnect,
	        // to check for AR display if we don't have one yet.
	        var self = this;
	        window.addEventListener('ardisplayconnect', function () {
	            if (!self.arDisplay) { self.checkForARDisplay(); }
	        });

	        // Check now for AR display.
	        this.checkForARDisplay();
	    },

	    checkForARDisplay: function () {
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
	            scene.renderer.autoClearColor = THREE.ARUtils.isARKit(display) && !window.WebARonARKitSendsCameraFrames;
	            scene.renderer.autoClearDepth = true;

	            // Create the ARView.
	            self.arView = new THREE.ARView(display, scene.renderer);
	        });
	    },

	    getPosition: function () {
	        if (!this.arDisplay || !this.arDisplay.getFrameData) { return null; }
	        return this.posePosition;
	    },

	    getOrientation: function () {
	        if (!this.arDisplay || !this.arDisplay.getFrameData) { return null; }
	        return this.poseQuaternion;
	    },

	    getRotation: function () {
	        if (!this.arDisplay || !this.arDisplay.getFrameData) { return null; }
	        return this.poseRotation;
	    },

	    getProjectionMatrix: function () {
	        if (!this.arDisplay || !this.arDisplay.getFrameData) { return null; }
	        return this.projectionMatrix;
	    },

	    hitAR: (function () {          
	        // Temporary variables, only within closure scope.
	        var transform = new THREE.Matrix4();
	        var hitpoint = new THREE.Vector3();
	        var hitquat = new THREE.Quaternion();
	        var hitscale = new THREE.Vector3();
	        var worldpos = new THREE.Vector3();
	          
	        // The desired function, which this returns.
	        return function (x, y, el, raycasterEl) {
	            if (!this.arDisplay || !this.arDisplay.hitTest) { return []; }

	            var hit = this.arDisplay.hitTest(x, y);

	            // Process AR hits.
	            var hitsToReturn = [];
	            for (var i = 0; hit && i < hit.length; i++) {
	                transform.fromArray(hit[i].modelMatrix);
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


/***/ }),
/* 2 */
/***/ (function(module, exports) {

	/* global AFRAME, THREE */

	function convertVertices(vertices) {
	    var verticesLength = vertices.length;
	    var newVertices = new Float32Array(verticesLength * 3);
	    var i = 0;
	    var j = 0;
	    var vertex;
	    for (i = 0; i < verticesLength; i++) {
	        vertex = vertices[i];
	        newVertices[j] = vertex.x;
	        newVertices[j + 1] = vertex.y;
	        newVertices[j + 2] = vertex.z;
	        j += 3;
	    }
	    return newVertices;
	}


	function encode(buffer) {
	var base64    = ''
	var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

	var bytes      = buffer;  // assume it's a typedArrayBuffer 
			
	if (buffer instanceof ArrayBuffer) {
	bytes = new Uint8Array(arrayBuffer)
	} else if (buffer instanceof ImageData) {
	bytes = buffer.data
	}

	var byteLength    = buffer.length
	var byteRemainder = byteLength % 3
	var mainLength    = byteLength - byteRemainder

	var a, b, c, d
	var chunk

	// Main loop deals with bytes in chunks of 3
	for (var i = 0; i < mainLength; i = i + 3) {
	// Combine the three bytes into a single integer
	chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

	// Use bitmasks to extract 6-bit segments from the triplet
	a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
	b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
	c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
	d = chunk & 63               // 63       = 2^6 - 1

	// Convert the raw binary segments to the appropriate ASCII encoding
	base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
	}

	// Deal with the remaining bytes and padding
	if (byteRemainder == 1) {
	chunk = bytes[mainLength]

	a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

	// Set the 4 least significant bits to zero
	b = (chunk & 3)   << 4 // 3   = 2^2 - 1

	base64 += encodings[a] + encodings[b] + '=='
	} else if (byteRemainder == 2) {
	chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

	a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
	b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

	// Set the 2 least significant bits to zero
	c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

	base64 += encodings[a] + encodings[b] + encodings[c] + '='
	}

	return base64
	}





	AFRAME.registerComponent('mozilla-xr-ar', {
	    schema: {
	        takeOverCamera: {default: true},
	        cameraUserHeight: {default: false},
	        worldSensing: {default: false}
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
	            setTimeout(this.onceSceneLoaded);
	        } else {
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

	        // Need these because WebXR Viewer...
	        window['setNativeTime'] = function (data) {
	          window.nativeTime = data.nativeTime;
	        };
	        ['arTrackingChanged',
	         'userGrantedWorldSensingData', // Needed for world sensing.
	         'arkitDidMoveBackground',
	         'arkitStartRecording',
	         'arkitStopRecording',
	         'arkitInterruptionEnded',
	         'arkitShowDebug',
	         'onError'].forEach(function (eventName) {
	          window[eventName] = function (data) {
	            console.log(eventName + ':', data);
	          };
	        });

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
	                light_intensity: true,
	                worldSensing: this.data.worldSensing
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
	        var element;

	        // WebXR Viewer returns geometry.vertices as an array of {x: number, y: number, y: number}
	        // https://github.com/mozilla-mobile/webxr-ios/blob/c77b12c235e3960e2cd51538e086a38c83d8ec7c/XRViewer/ARKController/ARKController.m#L845
	        // We transform this to a flatten array of number, like WebARonARCore.

	        if(data.newObjects && data.newObjects.length){
	          for (i = 0; i < data.newObjects.length; i++) {
	            element = data.newObjects[i];
	            if(element.plane_center){
	              this.planes_.set(element.uuid, {
	                id: element.uuid,
	                center: element.plane_center,
	                extent: [element.plane_extent.x, element.plane_extent.z],
	                modelMatrix: element.transform,
	                alignment: element.plane_alignment,
	                vertices: convertVertices(element.geometry.vertices)
	              });
	            }else{
	              var anchorData = {
	                id: element.uuid,
	                modelMatrix: element.transform
	              };
	              if (element.type === 'image') {
	                anchorData.name = element.uuid;
	              }
	              this.anchors_.set(element.uuid, anchorData);
	            }
	          }
	        }

	        if(data.removedObjects && data.removedObjects.length){
	          for (i = 0; i < data.removedObjects.length; i++) {
	            element = data.removedObjects[i];
	            if(this.planes_.get(element)){
	              this.planes_.delete(element);
	            }else{
	              this.anchors_.delete(element);
	            }
	          }
	        }

	        if(data.objects && data.objects.length){
	          for (i = 0; i < data.objects.length; i++) {
	            element = data.objects[i];
	            if(element.plane_center){
	              var plane = this.planes_.get(element.uuid);
	              if(!plane){
	                this.planes_.set(element.uuid, {
	                  id: element.uuid,
	                  center: element.plane_center,
	                  extent: [element.plane_extent.x, element.plane_extent.z],
	                  modelMatrix: element.transform,
	                  alignment: element.plane_alignment,
	                  vertices: convertVertices(element.geometry.vertices)
	                });
	              } else {
	                plane.center = element.plane_center;
	                plane.extent = [element.plane_extent.x, element.plane_extent.z];
	                plane.modelMatrix = element.transform;
	                plane.alignment = element.plane_alignment;
	                plane.vertices = convertVertices(element.geometry.vertices);
	              }
	            }else{
	              var anchor = this.anchors_.get(element.uuid);
	              if(!anchor){
	                this.anchors_.set(element.uuid, {
	                  id: element.uuid,
	                  modelMatrix: element.transform
	                });
	              }else{
	                anchor.modelMatrix = element.transform;
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

	    // Link to new ARKit image marker and anchor support.

	    addImage: function (name, url, physicalWidth) {
	        if (!this.arDisplay) { return null; }
	/*
	NSDictionary *imageAnchorInfoDictionary = [message body];
	NSString *createDetectionImageCallback = [[message body] objectForKey:WEB_AR_CALLBACK_OPTION];
	// callback

	CGFloat physicalWidth = [referenceImageDictionary[@"physicalWidth"] doubleValue];
	NSString* b64String = referenceImageDictionary[@"buffer"];
	size_t width = (size_t) [referenceImageDictionary[@"imageWidth"] intValue];
	size_t height = (size_t) [referenceImageDictionary[@"imageHeight"] intValue];
	...
	result.name = referenceImageDictionary[@"uid"];
	*/
	        // NOTE: looks like WebXR Viewer won't load from URL,
	        //       so we need to convert from img element
	        var aCanvas = document.createElement('canvas');
	        var aContext = aCanvas.getContext('2d');
	        var aImg; // Don't use element; chance of changed width/height.
	        if (!aImg) {
	          aImg = document.createElement('img');
	          aImg.crossOrigin = 'anonymous';
	          aImg.src = url;
	          document.body.appendChild(aImg);
	        }

	        // The image needs to be loaded...
	        if (!aImg.complete || !aImg.naturalHeight) {
	          console.log('!!! addImage: !aImg.complete || !aImg.naturalHeight, aborting');
	          return;
	        } 
	       
	        // The image needs to be have nonzero size...
	        if (!aImg.width || !aImg.height) {
	          console.log('!!! addImage: !aImg.width || !aImg.height, aborting');
	          return;
	        } 

	        aCanvas.width = aImg.width;
	        aCanvas.height = aImg.height;
	        aContext.drawImage(aImg, 0, 0);
	        var aImageData = aContext.getImageData(0, 0, aImg.width, aImg.height);
	        var b64ImageData = encode(aImageData.data);
	        if (!b64ImageData) {
	          console.log('!!! addImage: !b64ImageData, aborting');
	          return;
	        }

	        // NOTE: also, WebXR Viewer doesn't pass back which image/name,
	        //       so we need a per-image/name callback
	        window.callbackForCreateImageAnchorCounter = (window.callbackForCreateImageAnchorCounter || 0) + 1;
	        var callbackName = 'callbackForCreateImageAnchor_' + window.callbackForCreateImageAnchorCounter;
	        var imageName = name;
	        //console.log('creating ', callbackName, ' for ', imageName);
	        window[callbackName] = function (data) {
	          //console.log(callbackName);
	          //console.log(data);
	          //var name = callbackName.substring(29);
	          if (data.created !== undefined) {
	            if (!data.created) {
	              // we failed to create the image, for whatever reason.
	              console.log('addImage: !created; ', data.error);
	              delete window[callbackName];
	            } else {
	              //console.log('addImage: created, activating ', imageName);
	              window.webkit.messageHandlers.activateDetectionImage.postMessage({
	                callback: callbackName,
	                uid: imageName
	              });
	            }
	          } else
	          if (data.activated !== undefined) {
	            if (!data.activated) {
	              // we failed to activate the image, for whatever reason.
	              console.log('addImage: !activated; ', data.error);
	            } else {
	              //console.log('addImage: activated ', imageName);
	            }
	            delete window[callbackName];
	          }
	        };

	        window.webkit.messageHandlers.createImageAnchor.postMessage({
	          callback: callbackName,
	          uid: name,
	          buffer: b64ImageData,
	          imageWidth: aImg.width,
	          imageHeight: aImg.height,
	          physicalWidth: physicalWidth // in meters
	        });
	    },

	    removeImage: function (name) {
	        if (!this.arDisplay) { return null; }
	/*
	NSDictionary *imageAnchorInfoDictionary = [message body];
	NSString *imageName = imageAnchorInfoDictionary[WEB_AR_DETECTION_IMAGE_NAME_OPTION];
	// detectionImageName
	NSString *deactivateDetectionImageCallback = [[message body] objectForKey:WEB_AR_CALLBACK_OPTION];
	// callback
	*/
	        window.callbackForRemoveImageAnchorCounter = (window.callbackForRemoveImageAnchorCounter || 0) + 1;
	        var callbackName = 'callbackForRemoveImageAnchor_' + window.callbackForRemoveImageAnchorCounter;
	        var imageName = name;
	        //console.log('creating ', callbackName, ' for ', imageName);
	        window[callbackName] = function (data) {
	          //console.log(callbackName);
	          //console.log(data);

	          if (data.deactivated !== undefined) {
	            if (!data.deactivated) {
	              console.log('!!! ' + callbackName + ': !deactivated', data.error);
	              delete window[callbackName];
	            } else {
	              //console.log(callbackName + ': deactivated, destroying', imageName);
	            }
	            window.webkit.messageHandlers.destroyDetectionImage.postMessage({
	              callback: callbackName,
	              uid: imageName
	            });
	          }
	          if (data.destroyed !== undefined) {
	            if (!data.destroyed) {
	              console.log('!!! ' + callbackName + ': !destroyed, ', data.error);
	            } else {
	              //console.log(callbackName + ': destroyed', imageName);
	            }
	            delete window[callbackName];
	          }
	        };

	        window.webkit.messageHandlers.deactivateDetectionImage.postMessage({
	          callback: callbackName,
	          uid: imageName
	        });
	    },

	    getAnchors: function () {
	        return Array.from(this.anchors_.values());
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
				 planeQuaternion: new THREE.Quaternion()  // quat.create()
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
				 if (!planes || planes.length === 0) {
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
					 hitVars.planeCenter.set(plane.center.x, plane.center.y, plane.center.z);
					 hitVars.planePosition.copy(hitVars.planeCenter)
						 .applyMatrix4(hitVars.planeMatrix)

					 hitVars.planeAlignment = plane.alignment
	 
					 // Get the plane normal.
					 if (hitVars.planeAlignment === 0) {
						 hitVars.planeNormal.set(0, 1, 0);
	                 } else {
						 hitVars.planeNormal.set(hitVars.planeMatrix[4], hitVars.planeMatrix[5], hitVars.planeMatrix[6]);
	                 }
	 
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
					 hitVars.planeQuaternion.setFromRotationMatrix(hitVars.planeMatrix);
					 hitVars.planeHit.makeRotationFromQuaternion(hitVars.planeQuaternion).setPosition(hitVars.planeIntersection);
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
	                transform.fromArray(hit[i].modelMatrix);
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


/***/ }),
/* 3 */
/***/ (function(module, exports) {

	/* global AFRAME, THREE */

	AFRAME.registerComponent('ar-planes', {

	  getPlaneSource: function () {
	    var whichar;
	    if (!this.planeSource) {
	      whichar = this.el.sceneEl.components['three-ar'];
	      if (whichar && whichar.arDisplay) {
	        this.planeSource = whichar.arDisplay;
	      }
	    }
	    if (!this.planeSource) {
	      whichar = this.el.sceneEl.components['mozilla-xr-ar'];
	      if (whichar && whichar.arDisplay) {
	        this.planeSource = whichar;
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


/***/ }),
/* 4 */
/***/ (function(module, exports) {

	/* global AFRAME, THREE */

	AFRAME.registerComponent('ar-anchors', {

	  getSource: function () {
	    var whichar;
	    if (!this.source) {
	      whichar = this.el.sceneEl.components['three-ar'];
	      if (whichar && whichar.arDisplay) {
	        this.source = whichar.arDisplay;
	      }
	    }
	    if (!this.source) {
	      whichar = this.el.sceneEl.components['mozilla-xr-ar'];
	      if (whichar && whichar.arDisplay) {
	        this.source = whichar;
	      }
	    }
	    return this.source;
	  },

	  getAnchors: function () {
	    var source = this.getSource();
	    if (!source || !source.getAnchors) return undefined;
	    return source.getAnchors();
	  }
	});


/***/ }),
/* 5 */
/***/ (function(module, exports) {

	/* global AFRAME, THREE */

	AFRAME.registerComponent('ar-images', {

	  getSource: function () {
	    var whichar;
	    if (!this.source) {
	      whichar = this.el.sceneEl.components['three-ar'];
	      if (whichar && whichar.arDisplay) {
	        this.source = whichar.arDisplay;
	      }
	    }
	    if (!this.source) {
	      whichar = this.el.sceneEl.components['mozilla-xr-ar'];
	      if (whichar && whichar.arDisplay) {
	        this.source = whichar;
	      }
	    }
	    return this.source;
	  },

	  addImage: function (name, url, physicalWidth) {
	    var source = this.getSource();
	    if (!source || !source.addImage) return undefined;
	    return source.addImage(name, url, physicalWidth);
	  },

	  removeImage: function (name) {
	    var source = this.getSource();
	    if (!source || !source.removeImage) return undefined;
	    return source.removeImage(name);
	  },

	});


/***/ }),
/* 6 */
/***/ (function(module, exports) {

	/* global AFRAME */

	AFRAME.registerComponent('ar', {
	  schema: {
	    takeOverCamera: {default: true},
	    cameraUserHeight: {default: false},
	    worldSensing: {default: false},
	    hideUI: {default: true}
	  },
	  dependencies: ['three-ar', 'mozilla-xr-ar', 'ar-planes', 'ar-anchors'],
	  getSource: function () {
	    var whichar;
	    if (!this.source) {
	      whichar = this.el.sceneEl.components['three-ar'];
	      if (whichar && whichar.arDisplay) {
	        this.source = whichar.arDisplay;
	      }
	    }
	    if (!this.source) {
	      whichar = this.el.sceneEl.components['mozilla-xr-ar'];
	      if (whichar && whichar.arDisplay) {
	        this.source = whichar;
	      }
	    }
	    return this.source;
	  },
	  getPlanes: function () {
	    return this.source ? this.source.getPlanes() : undefined;
	  },
	  getAnchors: function () {
	    return this.source ? this.source.getAnchors() : undefined;
	  },
	  addImage: function (name, url, physicalWidth) {
	    return this.source.addImage(name, url, physicalWidth);
	  },
	  removeImage: function (name) {
	    return this.source.removeImage(name);
	  },
	  init: function () {
	    var options = {
	      takeOverCamera: this.data.takeOverCamera,
	      cameraUserHeight: this.data.cameraUserHeight,
	      worldSensing: this.data.worldSensing
	    };

	    this.el.setAttribute('three-ar', options);
	    this.el.setAttribute('mozilla-xr-ar', options);

	    if (this.data.hideUI) {
	      this.el.sceneEl.setAttribute('vr-mode-ui', {enabled: false});
	    }

	    // Ensure passthrough is visible, make sure A-Frame styles don't interfere.
	    document.head.insertAdjacentHTML('beforeend', 
	      '<style>html,body {background-color: transparent !important;}</style>');
	  }
	});


/***/ }),
/* 7 */
/***/ (function(module, exports) {

	/* global AFRAME */

	AFRAME.registerComponent('ar-camera', {
	  schema: {
	    enabled: {default:true}
	  },

	  init: function () {
	    var lookControls = this.el.getAttribute('look-controls');
	    this.wasLookControlsEnabled = lookControls ? lookControls.enabled : false;
	  },

	  update: function (oldData) {
	    if (!oldData || oldData.enabled !== this.data.enabled) {
	      // Value changed, so react accordingly.
	      if (this.data.enabled) {
	        // Save camera look-controls enabled, and turn off for AR.
	        var lookControls = this.el.getAttribute('look-controls');
	        this.wasLookControlsEnabled = lookControls ? lookControls.enabled : false;
	        if (this.wasLookControlsEnabled) {
	          this.el.setAttribute('look-controls', 'enabled', false);
	        }
	      } else {
	        // Restore camera look-controls enabled.
	        if (this.wasLookControlsEnabled) {
	          this.el.setAttribute('look-controls', 'enabled', true);
	        }
	      }
	    }
	  },
	  
	  tick: function (t, dt) {
	    if (!this.data.enabled) { return; }
	    
	    var whichar = this.checkWhichAR();
	    if (!whichar) { return; }
	    
	    // Apply the pose position via setAttribute,
	    // so that other A-Frame components can see the values.
	    this.el.setAttribute('position', whichar.getPosition());

	    // Apply the pose rotation via setAttribute,
	    // so that other A-Frame components can see the values.
	    this.el.setAttribute('rotation', whichar.getRotation());

	    // Apply the projection matrix, if we're not in VR.
	    if (!this.el.sceneEl.is('vr-mode')) {
	      this.el.components.camera.camera.projectionMatrix = whichar.getProjectionMatrix();
	    }    
	  },
	  
	  checkWhichAR: function () {
	    if (!this.whichar) {
	      var whichar = this.el.sceneEl.components['three-ar'];
	      if (!whichar || !whichar.arDisplay) {
	        whichar = this.el.sceneEl.components['mozilla-xr-ar'];
	      }
	      if (!whichar || !whichar.arDisplay) { return; }
	      this.whichar = whichar;
	    }
	    return this.whichar;
	  }  
	});


/***/ }),
/* 8 */
/***/ (function(module, exports) {

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
	    if (rawIntersections) {
	      results = rawIntersections = rawIntersections.concat(this.hitAR());
	    } else {
	      results = results.concat(this.hitAR());
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
	      var whichar = this.el.sceneEl.components['three-ar'];
	      if (!whichar || !whichar.arDisplay) {
	        whichar = this.el.sceneEl.components['mozilla-xr-ar'];
	      }
	      if (!whichar || !whichar.arDisplay) { return; }
	      this.whichar = whichar;
	    }
	    return this.whichar;
	  }
	});



/***/ })
/******/ ]);