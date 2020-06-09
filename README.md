# aframe-ar
Basic [A-Frame](https://aframe.io) support for browser-based augmented reality (AR), 
supporting the new [WebXR AR support](https://github.com/immersive-web/webxr-ar-module) in Chrome v81+
as well as [WebXR Viewer](https://blog.mozvr.com/experimenting-with-ar-and-the-web-on-ios/).

By simply adding the `ar` component to your [A-Frame](https://aframe.io) scene declaration:

```
<a-scene ar>
...
</a-scene>
```

[aframe-ar](https://github.com/chenzlabs/aframe-ar) will, when using a supported browser, take over the scene camera using information from ARKit / ARCore.

Basic usage:
```
<!-- First, include whichever version of A-Frame you like. -->
<script src="https://cdn.jsdelivr.net/gh/aframevr/aframe@master/dist/aframe-master.min.js"></script>
<!-- Last, include aframe-ar. -->
<script src="https://cdn.jsdelivr.net/gh/chenzlabs/aframe-ar@master/dist/aframe-ar.min.js"></script>

<!-- Place the ar component on your scene, and the camera will use AR by default. -->
<!-- Note that world sensing is required to use AR raycaster with WebXR Viewer on iOS. -->
<a-scene ar>
  <a-sphere radius="0.01" position="0 0.005 -0.5"></a-sphere>
<a-scene>  
```

Examples:

Basic AR camera: https://aframe-ar.glitch.me
- (remix with Glitch here: https://glitch.com/edit/#!/remix/aframe-ar?path=public/index.html)

`ar-raycaster` usage: https://aframe-ar-raycaster-logo-test.glitch.me/ar.html
- (remix with Glitch here: https://glitch.com/edit/#!/remix/aframe-ar-raycaster-logo-test?path=ar.html)

Plane detection and visualization: https://aframe-ar-plane.glitch.me
- NOTE: WebXR support for planes is still a work in progress, and this may not work yet with Mozilla's 2.0 version.
  At time of writing, Chrome appears to need `chrome://flags#webxr-incubations` enabled for plane support.
- (remix with Glitch here: https://glitch.com/edit/#!/remix/aframe-ar-plane?path=index.html)

Remix of xr-horses: https://aframe-ar-horses.glitch.me
- (as seen at https://twitter.com/milk/status/1244680165969383425?s=20)
- (remix with Glitch here: https://glitch.com/edit/#!/remix/aframe-ar-horses)

(Unfortunately aframe-ar-dragonites is now broken, apologies!)

Reference links:

- https://aframe.io
- https://www.chromestatus.com/feature/5450241148977152
- https://developers.google.com/ar/develop/web/getting-started
- https://blog.mozvr.com/experimenting-with-ar-and-the-web-on-ios/
