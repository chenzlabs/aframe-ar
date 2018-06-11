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
