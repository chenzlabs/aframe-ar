# aframe-ar
Basic [A-Frame](https://aframe.io) support for browser-based augmented reality (AR), 
supporting the new [three.ar.js](https://github.com/google-ar/three.ar.js) library 
and [WebARonARKit / WebARonARCore browsers](https://developers.google.com/ar/develop/web/getting-started).

Also, basic camera passthrough and pose support for [Mozilla's WebXR Viewer using ARKit](https://blog.mozilla.org/blog/2017/10/20/bringing-mixed-reality-web/) has recently been added; 
additional features may be supported in future versions of [WebXR Viewer](https://itunes.apple.com/us/app/webxr-viewer/id1295998056).

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
<script src="https://rawgit.com/aframevr/aframe/master/dist/aframe-master.min.js"></script>
<!-- Next, include three.ar.js; add the speech recognition polyfill if you want. -->
<script src="https://rawgit.com/google-ar/three.ar.js/master/dist/three.ar.js"></script>
<!-- Last, include aframe-ar. -->
<script src="https://rawgit.com/chenzlabs/aframe-ar/master/dist/aframe-ar.js"></script>

<!-- Place the ar component on your scene, and the camera will use AR by default. -->
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
- (remix with Glitch here: https://glitch.com/edit/#!/remix/aframe-ar-plane?path=index.html)

https://aframe-ar-dragonites.glitch.me with many thanks to Twitter user @uveavanto et al.
- (as seen at https://twitter.com/machenmusik/status/915692630926938112)
- (remix with Glitch here: https://glitch.com/edit/#!/remix/aframe-ar-dragonites?path=index.html)

Reference links:

- https://aframe.io
- https://github.com/google-ar/three.ar.js
- https://developers.google.com/ar/develop/web/getting-started
- https://blog.mozilla.org/blog/2017/10/20/bringing-mixed-reality-web/
