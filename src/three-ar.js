AFRAME.registerComponent('three-ar', {
    schema: {
        takeOverCamera: { default: true }
    },

    init: function () {
        this.posePosition = new THREE.Vector3();
        this.poseQuaternion = new THREE.Quaternion();
        this.poseEuler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.poseRotation = new THREE.Vector3();
        this.projectionMatrix = new THREE.Matrix4();

        this.onceSceneLoaded = this.onceSceneLoaded.bind(this);
        if (this.el.sceneEl.hasLoaded) {
            console.log('three-ar: hasLoaded, setTimeout');
            setTimeout(this.onceSceneLoaded);
        } else {
            console.log('three-ar: !hasLoaded, addEventListener');
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

        // Can use either left or right projection matrix; pick left for now.
        this.projectionMatrix.fromArray(this.frameData.leftProjectionMatrix);

        // If we've taken over a camera, update it.  If not, we're done.
        if (!this.arCamera) { return; }

        var camera = this.arCamera;

        // Apply the pose position via setAttribute,
        // so that other A-Frame components can see the values.
        camera.el.setAttribute('position', this.posePosition);

        // Apply the pose rotation via setAttribute,
        // so that other A-Frame components can see the values.
        camera.el.setAttribute('rotation', this.poseRotation);

        // Apply the projection matrix, if we're not in VR.
        if (!this.el.sceneEl.is('vr-mode')) {
          camera.projectionMatrix = this.projectionMatrix;
        }
    },

    takeOverCamera: function (camera) {
        this.arCamera = camera;
        camera.isARPerspectiveCamera = true; // HACK - is this necessary?
        camera.vrDisplay = this.arDisplay; // HACK - is this necessary?
        // ARKit/Core will give us rotation, don't compound it with look-controls.
        camera.el.setAttribute('look-controls', { enabled: false });
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
            scene.renderer.autoClearColor = THREE.ARUtils.isARKit(display);
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
    }
});
