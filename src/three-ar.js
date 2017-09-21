AFRAME.registerComponent('three-ar', {
    schema: {
        takeOverCamera: { default: true },
        enabled: { default: true }
    },

    init: function () {
        this.previousValues = {}
    },

    update: function (oldData) {
        if(typeof(oldData.enabled) !== 'undefined' && this.data.enabled !== oldData.enabled) {
            if(this.data.enabled) {
                this.enable();
            } else {
                this.disable();
            }
        }
    },

    play: function () {
        if(this.data.enabled) {
            this.enable()
        }
    },

    enable: function () {
        if (this.el.sceneEl.hasLoaded) { this.enableARView(); }
        else { this.el.sceneEl.addEventListener('loaded', this.enableARView.bind(this)); }
    },

    pause: function () {
        this.disable()
    },

    disable: function () {
        this.restorePreviousView()
        this.previousValues = {}
        delete this.arDisplay;
    },

    remove: function () {
        this.pause()
    },

    tick: function (t, dt) {
        if (!this.isPlaying || !this.arDisplay || !this.arDisplay.getFrameData) { return; }

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
        // Save previous values to be restored when component is disabled or removed
        this.previousValues.lookControlsEnabled = AFRAME.utils.entity.getComponentProperty(camera.el, 'look-controls.enabled');
        this.previousValues.cameraIsARPerspectiveCamera = camera.isARPerspectiveCamera;
        this.previousValues.cameraVrDisplay = camera.vrDisplay;

        // Take over camera
        this.arCamera = camera;
        camera.isARPerspectiveCamera = true; // HACK - is this necessary?
        camera.vrDisplay = this.arDisplay; // HACK - is this necessary?

        // ARKit/Core will give us rotation, don't compound it with look-controls.
        AFRAME.utils.entity.setComponentProperty(camera.el, 'look-controls.enabled', false)
    },

    enableARView: function () {
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

            // Save previous values to be restored when component is disabled or removed
            self.previousValues.sceneRendererAlpha = scene.renderer.alpha;
            self.previousValues.sceneRendererAutoClearColor = scene.renderer.autoClearColor;
            self.previousValues.sceneRendererAutoClearDepth = scene.renderer.autoClearDepth;

            // Modify the scene renderer to allow ARView video passthrough.
            scene.renderer.alpha = true;
            scene.renderer.autoClearColor = THREE.ARUtils.isARKit(display);
            scene.renderer.autoClearDepth = true;

            // Create the ARView.
            self.arView = new THREE.ARView(display, scene.renderer);
        });
    },

    restorePreviousView: function () {
        var scene = this.el.sceneEl;
        scene.renderer.alpha = this.previousValues.sceneRendererAlpha;
        scene.renderer.autoClearColor = this.previousValues.sceneRendererAutoClearColor;
        scene.renderer.autoClearDepth = this.previousValues.sceneRendererAutoClearDepth;

        var camera = scene.camera;
        camera.isARPerspectiveCamera = this.previousValues.cameraIsARPerspectiveCamera;
        camera.vrDisplay = this.previousValues.cameraVrDisplay;

        AFRAME.utils.entity.setComponentProperty(
            camera.el,
            'look-controls.enabled',
            this.previousValues.lookControlsEnabled
        );
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
