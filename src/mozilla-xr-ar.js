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
        worldSensing: {default: true}
    },

    init: function () {
        this.onInit = this.onInit.bind(this);
        this.onWatch = this.onWatch.bind(this);

        this.forceResize = this.forceResize.bind(this);

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

        // If we are the new version 2.0, don't use this!
        if (navigator.userAgent.indexOf('Mobile WebXRViewer/v1.') < 0) {
/*
          // FIXME: sure but we do need a wakelock, and camera position is wrong with the new version
          // sigh, we do still need the wakelock killer
          var scene = this.el.sceneEl;
          scene.addEventListener('enter-vr', function (data) {
            // Kill broken wakelock, but wait a tick for it to be created!
            setTimeout(function () { if (scene.wakelock) { scene.wakelock.release(); }});
          });
*/
          return;
        }

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
        //if (window['setNativeTime']) {
        //  console.log('window handler already defined for ', 'setNativeTime');
        //} else
        window['setNativeTime'] = function (data) {
          window.nativeTime = data.nativeTime;
        };
        [
         'arkitStartRecording',
         'arkitStopRecording',
         'arkitDidMoveBackground',
         'arkitWillEnterForeground',
         'arkitInterrupted',
         'arkitInterruptionEnded',
         'arkitShowDebug',
         // elsewhere... 'arkitWindowResize',
         'onError',
         'arTrackingChanged',
         'ios_did_receive_memory_warning',
         'onComputerVisionData',
         // above... 'setNativeTime',
         'userGrantedComputerVisionData',
         'userGrantedWorldSensingData', // Needed for world sensing.
        ].forEach(function (eventName) {
          //if (window[eventName]) {
          //  console.log('window handler already defined for ', eventName);
          //} else
          window[eventName] = function (data) {
            console.log(eventName + ':', data);
          };
        });

        var self = this;

        self.el.addEventListener('exit-vr', function (data) {
          // tell WebXR Viewer to stop
          // FIXME: well, no, that's too much, camera tracking stops.
          window.webkit.messageHandlers.stopAR.postMessage({});
          // release ar-camera
          if (self.data.takeOverCamera && self.arCamera) {
            self.arCamera.el.setAttribute('ar-camera', 'enabled', false);
          }
          // turn AR button back on
          setTimeout(function () {
            var vrmodeui = self.el.sceneEl.components['vr-mode-ui'];
            vrmodeui.enterAREl.classList.remove('a-hidden');
          });
        });

        // act like Chrome WebXR by forcibly showing AR button and making it work
        var vrmodeui = this.el.sceneEl.components['vr-mode-ui'];
        var newarbutton = vrmodeui.enterAREl.cloneNode(true);
        vrmodeui.enterAREl.parentNode.replaceChild(newarbutton, vrmodeui.enterAREl);
        vrmodeui.enterAREl = newarbutton;
        vrmodeui.enterAREl.classList.remove('a-hidden');
        vrmodeui.enterAREl.onclick = function() {
          var scene = AFRAME.scenes[0];

          // Note we're in AR mode (the way WebXR handling does).
          scene.addState('ar-mode');

          // Kill the Cardboard display that gets in our way.
          scene.components['vr-mode-ui'].orientationModalEl.style='display:none!important';

          // Fake VR mode from enterVRSuccess.
          scene.addState('vr-mode');
          scene.emit('enter-vr', {target: scene});

          // Call initAR.
          window.webkit.messageHandlers.initAR.postMessage(data);
            
          // Kill broken wakelock!
          scene.wakelock.release();

          // Take over the scene camera, if so directed.
          // But wait a tick, because otherwise injected camera will not be present.
          if (self.data.takeOverCamera) {
            setTimeout(function () { self.takeOverCamera(scene.camera); });
          }

          let sz = new THREE.Vector2();
          let pixelRatio = scene.renderer.getPixelRatio();
          scene.renderer.getSize(sz);
          console.log("pixelRatio ", pixelRatio, " size ", sz);

          // Ugly hack to get around WebXR Viewer resizing issue.
          scene.canvas.style.position = "absolute !important";
          scene.canvas.style.width = "100% !important";
          scene.canvas.style.height = "100% !important";

          // Force resize after we have access to data (?!)
          window.userGrantedWorldSensingData = function(data) {
           console.log('userGrantedWorldSensingData:', data);
           setTimeout(function () {
            self.forceResize(
              screen.width * window.devicePixelRatio,
              screen.height * window.devicePixelRatio);
           }, 100); // 1000 seems to be long enough initially
          };
        };
    },

    forceResize: function (sx, sy) {
        var sc = this.el.sceneEl, self = this;
        console.log('forceResize ', sx, sy,
             ' was ', 
             sc.canvas.width, sc.canvas.height, 
             screen.width, screen.height,
             window.devicePixelRatio, sc.renderer.getPixelRatio());

  var pixelRatio = sc.renderer.getPixelRatio();
  var maxSize = sc.maxCanvasSize;
  if (sx * pixelRatio > maxSize.width ||
    sy * pixelRatio > maxSize.height) {

    console.log('applying maxSize constraints ', maxSize);

    aspectRatio = sx / sy;

    if ((sx * pixelRatio) > maxSize.width && maxSize.width !== -1) {
      sx = Math.round(maxSize.width / pixelRatio);
      sy = Math.round(maxSize.width / aspectRatio / pixelRatio);
    }

    if ((sy * pixelRatio) > maxSize.height && maxSize.height !== -1) {
      sy = Math.round(maxSize.height / pixelRatio);
      sx = Math.round(maxSize.height * aspectRatio / pixelRatio);
    }

    console.log('applied maxSize constraints ', sx, sy, maxSize);
  }

        sx = sx || this.forceResizeX; this.forceResizeX = sx;
        sy = sy || this.forceResizeY; this.forceResizeY = sy;
        sc.canvas.setAttribute('width', sx);
        sc.canvas.setAttribute('height', sy);
        sc.camera.aspect = sx / sy;
        sc.camera.projectionMatrix.copy(self.projectionMatrix);
        sc.renderer.setSize(sx, sy, false);
        sc.emit('rendererresize', null, false);
    },

    checkForARDisplay: function () {
        // Check if the low-level WebXR Viewer interfaces are there.
        if (!window.webkit || !window.webkit.messageHandlers) { return; }
        if (!window.webkit.messageHandlers.watchAR) { return; }

        // If we are the new version 2.0, don't use this!
        if (navigator.userAgent.indexOf('Mobile WebXRViewer/v1.') < 0) { return; }

        // Mozilla WebXR Viewer detected.
        var self = this;
        self.arDisplay = true;


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
        window['arkitWindowResize'] = function (data) {
          console.log('arkitWindowResize' + ':', data);

          // we're faking being in vr-mode anyway so resize will exit.
          //window.emit('resize', {target: window});

          // on iOS, AFRAME waits 100ms... 
          setTimeout(function () {
            self.forceResize(
              data.width * window.devicePixelRatio,
              data.height * window.devicePixelRatio);
          }, 150); // 250 seems to be long enough
        };

        // Start watching AR.
        window.webkit.messageHandlers.watchAR.postMessage(data);
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
                    point: hitpoint.clone(), // Vector3
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
