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

        if (navigator.xr.isSessionSupported('immersive-ar')) {
            this.el.sceneEl.setAttribute('webxr', "requiredFeatures:hit-test,local-floor");
            this.el.sceneEl.setAttribute('vr-mode-ui', "enabled", "true");
            // auto-entering AR doesn't work.

            this.xrHitTestSource = null;
            this.viewerSpace = null;
            this.refSpace = null;

            this.el.sceneEl.renderer.xr.addEventListener('sessionend', (ev) => {
                this.viewerSpace = null;
                this.refSpace = null;
                this.xrHitTestSource = null;
            });
            this.el.sceneEl.renderer.xr.addEventListener('sessionstart', (ev) => {
                let session = this.el.sceneEl.renderer.xr.getSession();

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
                    this.viewerSpace = space;
                    session.requestHitTestSource({space: this.viewerSpace})
                    .then((hitTestSource) => {
                        this.xrHitTestSource = hitTestSource;
                        console.log('session requestHitTestSource OK');
                    })
                });

                session.requestReferenceSpace('local-floor').then((space) => {
                    this.refSpace = space;
                });
            });
        }
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
