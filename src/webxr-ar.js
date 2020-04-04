/* global AFRAME, THREE, VRFrameData */

AFRAME.registerComponent('webxr-ar', {
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

        // Add planes handling, so we can do synchronous hit test.

        this.rawPlanes_ = null;
        this.planes_ = new Map();
        this.anchors_ = new Map();
    },

    convertPolygonToVertices: function(polygon) {
        return newVertices;
    },

    convertedPlane: function(rawPlane, pose) {
        var mins = [0, 0];
        var maxs = [0, 0];
        var verticesLength = rawPlane.polygon.length;
        var newVertices = new Float32Array(verticesLength * 3);
        var i = 0;
        var j = 0;
        var vertex;
        for (i = 0; i < verticesLength; i++) {
            vertex = rawPlane.polygon[i];
            newVertices[j] = vertex.x;
            newVertices[j + 1] = vertex.y;
            newVertices[j + 2] = vertex.z;
            j += 3;
            if (i == 0) {
                mins[0] = maxs[0] = vertex.x;
                mins[1] = maxs[1] = vertex.z;
            } else {
                if (mins[0] > vertex.x) { mins[0] = vertex.x; }
                if (maxs[0] < vertex.x) { maxs[0] = vertex.x; }
                if (mins[1] > vertex.z) { mins[1] = vertex.z; }
                if (maxs[1] < vertex.z) { maxs[1] = vertex.z; }
            }
        }
        var position = pose.transform.position;
        rawPlane.position.set(position.x, position.y, position.z);
        var converted = {
            id: rawPlane.id,
            center: rawPlane.position,
            extent: [maxs[0] - mins[0], maxs[1] - mins[1]],
            modelMatrix: pose.transform.matrix,
            alignment: rawPlane.orientation != 'Horizontal' ? 1 : 0,
            vertices: newVertices
        };
        return converted;
    },

    rawPlaneRemoved: function(rawPlane) {
        // remove the converted plane
        this.planes_.delete(rawPlane.id);
    },

    rawPlaneUpdated: function(rawPlane, pose) {
        // convert the updated plane
        this.planes_.set(rawPlane.id, this.convertedPlane(rawPlane, pose));
    },

    rawPlaneNotUpdated: function(rawPlane, pose) {
        // FIXME: check is broken so update anyway
        this.rawPlaneUpdated(rawPlane, pose);
        // do nothing
    },

    rawPlaneCreated: function(rawPlane, pose) {
        // assign and attach an id... for now, use Math.random()
        rawPlane.id = Math.random().toString().substring(2);
        rawPlane.position = new THREE.Vector3();
        // convert the plane
        this.planes_[rawPlane.id] = this.convertedPlane(rawPlane, pose);
    },

    tick: function (t, dt) {
        let frame = this.el.sceneEl.frame;
        if (!this.arDisplay
         || !frame
         || !frame.worldInformation) { return; }

        // use the planes information
        let world = frame.worldInformation;

        // check for removed planes
        this.rawPlanes_ && this.rawPlanes_.forEach(plane => {
            if(!world.detectedPlanes || !world.detectedPlanes.has(plane)) {
                // Handle removed plane - `plane` was present in previous frame but is no longer tracked.
                this.rawPlaneRemoved(plane);
            }
        });

        // check for changed planes
        let timestamp = this.el.sceneEl.time;
        world.detectedPlanes && world.detectedPlanes.forEach(plane => {
            let planePose = frame.getPose(plane.planeSpace, this.refSpace);
            if (this.rawPlanes_.has(plane)) {
                if(plane.lastChangedTime == timestamp) {
                    // Handle previously seen plane that was updated in current frame.
                    this.rawPlaneUpdated(plane, planePose);
                } else {
                    // Handle previously seen plane that was not updated in current frame.
                    // Depending on the application, this could be a no-op.
                    this.rawPlaneNotUpdated(plane, planePose);
                }
            } else {
                // Handle new plane.
                this.rawPlaneCreated(plane, planePose);
            }
        });
 
        this.rawPlanes_ = world.detectedPlanes;
    },

    takeOverCamera: function (camera) {
        this.arCamera = camera;
        camera.isARPerspectiveCamera = true; // HACK - is this necessary?
        camera.vrDisplay = this.arDisplay; // HACK - is this necessary?
        camera.el.setAttribute('ar-camera', 'enabled', true);
    },

    onceSceneLoaded: function () {
        var self = this;
        window.addEventListener('ardisplayconnect', function () {
            if (!self.arDisplay) { self.checkForARDisplay(); }
        });

        // Check now for AR display.
        this.checkForARDisplay();
    },

    checkForARDisplay: function () {
        // check to see if webxr ar mode is supported
        if (!navigator.xr || !navigator.xr.isSessionSupported) { return; }

            var self = this;
        self.arDisplay = {type: 'webxr-ar'};

        navigator.xr.isSessionSupported('immersive-ar').then(function(supported) {
          if (supported) {
            let ourRequiredFeatures = ['local-floor'];
            let ourOptionalFeatures = [];
            (self.data.worldSensing ? ourRequiredFeatures : ourOptionalFeatures).push('hit-test');
            let existingFeatures = self.el.sceneEl.getAttribute('webxr');
            if (!existingFeatures) {
                // here, we assume we can set as map and not String (?) 
                self.el.sceneEl.setAttribute('webxr', { 
                    requiredFeatures: ourRequiredFeatures.join(','), 
                    optionalFeatures: ourOptionalFeatures.join(',') 
                });
            } else {
                // here, we assume we get and set as map and not String (?)
                // remove existing optional features from our optional
                existingFeatures.optionalFeatures.forEach(function (feature) {
                    ourOptionalFeatures = ourOptionalFeatures.filter(function(value, index, arr){ return value != feature;});
                });
                // remove existing required features from our required
                existingFeatures.requiredFeatures.forEach(function (feature) {
                    ourRequiredFeatures = ourRequiredFeatures.filter(function(value, index, arr){ return value != feature;});
                });
                // remove our required features from existing optional
                ourRequiredFeatures.forEach(function (feature) {
                    existingFeatures.optionalFeatures = existingFeatures.optionalFeatures.filter(function(value, index, arr){ return value != feature;});
                });
                // add our required and optional features to the existing
                existingFeatures.requiredFeatures = existingFeatures.requiredFeatures.concat(ourRequiredFeatures);
                existingFeatures.optionalFeatures = existingFeatures.optionalFeatures.concat(ourOptionalFeatures);

                self.el.sceneEl.setAttribute('webxr', existingFeatures);
            }

            self.el.sceneEl.setAttribute('vr-mode-ui', "enabled", "true");
            // auto-entering AR doesn't work.

            self.xrHitTestSource = null;
            self.viewerSpace = null;
            self.refSpace = null;

            self.el.sceneEl.renderer.xr.addEventListener('sessionend', (ev) => {
                self.viewerSpace = null;
                self.refSpace = null;
                self.xrHitTestSource = null;
            });
            self.el.sceneEl.renderer.xr.addEventListener('sessionstart', (ev) => {
                let session = self.el.sceneEl.renderer.xr.getSession();
                let el = self.el.sceneEl.canvas;

                session.addEventListener('selectstart', function (e) {
                    // dispatch touchstart
                    var pageX = e.inputSource.gamepad.axes[0];
                    var pageY = e.inputSource.gamepad.axes[1];
                    setTimeout(() => {
                        var event = new TouchEvent('touchstart', {
                            view: window,
                            bubbles: true,
                            cancelable: true
                        });
                        event.targetTouches = [{ pageX: pageX, pageY: pageY }];
                        el.dispatchEvent(event);
                    });
                });

                session.addEventListener('selectend', function (e) {
                    // dispatch touchend
                    var pageX = e.inputSource.gamepad.axes[0];
                    var pageY = e.inputSource.gamepad.axes[1];
                    setTimeout(() => {
                        var event = new TouchEvent('touchend', {
                            view: window,
                            bubbles: true,
                            cancelable: true
                        });
                        event.targetTouches = [{ pageX: pageX, pageY: pageY }];
                        el.dispatchEvent(event);
                    });
                });

                session.addEventListener('select', function (e) {
                    // dispatch click
                    var pageX = e.inputSource.gamepad.axes[0];
                    var pageY = e.inputSource.gamepad.axes[1];
                    setTimeout(() => {
                        var event = new MouseEvent('click', { 
                            clientX: pageX, 
                            clientY: pageY, 
                            bubbles: true,
                            cancelable: true
                        });
                        el.dispatchEvent(event);
                    });
                });

                session.requestReferenceSpace('viewer').then((space) => {
                    self.viewerSpace = space;
                    if (self.data.worldSensing) {
                        session.requestHitTestSource({space: self.viewerSpace})
                        .then((hitTestSource) => {
                            self.xrHitTestSource = hitTestSource;
                        })
                    }
                });

                session.requestReferenceSpace('local-floor').then((space) => {
                    self.refSpace = space;
                });

                // Ask for planes, if we should.
                if (self.data.worldSensing) {
                    session.updateWorldTrackingState({planeDetectionState : {enabled : true}});
                }
            });
          }
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
            if (!this.arDisplay) { return []; }
            var hitsToReturn = [];

            if (this.el.sceneEl.is('ar-mode')) {
              if (!this.viewerSpace) return;

              let frame = this.el.sceneEl.frame;
              let xrViewerPose = frame.getViewerPose(this.refSpace);

              if (this.xrHitTestSource && xrViewerPose) {
                let hitTestResults = frame.getHitTestResults(this.xrHitTestSource);

                    // Process AR hits.
                    var hitsToReturn = [];
                    for (var i = 0; hitTestResults && i < hitTestResults.length; i++) {
                    let pose = hitTestResults[i].getPose(this.refSpace);
                        transform.fromArray(pose.transform.matrix);
                        hitpoint.setFromMatrixPosition(transform); //transform.decompose(hitpoint, hitquat, hitscale);
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
                }
            }

            return hitsToReturn;
        }
    })(),

    // Link to image marker and anchor support.

    addImage: function (name, url, physicalWidth) {
        if (!this.arDisplay) { return null; }

        return null;
    },

    removeImage: function (name) {
        if (!this.arDisplay) { return null; }

        return null;
    },

    getAnchors: function () {
        return Array.from(this.anchors_.values());
    },

    // Use planes to do synchronous hit test.

    getPlanes: function () {
        return Array.from(this.planes_.values());
    }
});
