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
    },

    tick: function (t, dt) {
        if (!this.arDisplay || !this.arDisplay.getFrameData) { return; }

        // let aframe do its thing
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

                session.addEventListener('select', function () {
                    // dispatch click on window.
                    // FIXME: not always right...
                    setTimeout(() => {
                        var event = new MouseEvent('click', {
                            view: window,
                            bubbles: true,
                            cancelable: true
                        });
                        window.dispatchEvent(event);
                    });
                });

                session.requestReferenceSpace('viewer').then((space) => {
                    self.viewerSpace = space;
                    if (self.data.worldSensing) {
                        session.requestHitTestSource({space: self.viewerSpace})
                        .then((hitTestSource) => {
                            self.xrHitTestSource = hitTestSource;
                            console.log('session requestHitTestSource OK');
                        })
                    }
                });

                session.requestReferenceSpace('local-floor').then((space) => {
                    self.refSpace = space;
                });
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
                        console.log(i, hitpoint);
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
    })()
});
