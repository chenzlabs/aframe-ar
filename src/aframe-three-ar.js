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
