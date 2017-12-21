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

        this.onceSceneLoaded = this.onceSceneLoaded.bind(this);
        if (this.el.sceneEl.hasLoaded) {
            console.log('mozilla-xr-ar: hasLoaded, setTimeout');
            setTimeout(this.onceSceneLoaded);
        } else {
            console.log('mozilla-xr-ar: !hasLoaded, addEventListener');
            this.el.sceneEl.addEventListener('loaded', this.onceSceneLoaded);
        }
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
    }
});
