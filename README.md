# aframe-ar
Basic [A-Frame](https://aframe.io) support for browser-based augmented reality (AR), 
using the new [three.ar.js](https://github.com/google-ar/three.ar.js) library 
and [WebARonARKit / WebARonARCore browsers](https://developers.google.com/ar/develop/web/getting-started).

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
- https://aframe-ar.glitch.me
- - (remix with Glitch here: https://glitch.com/edit/#!/aframe-ar?path=public/index.html)
- `ar-raycaster` usage: https://aframe-ar-raycaster-logo-test.glitch.me/ar.html
- - (remix with Glitch here: https://glitch.com/edit/#!/aframe-ar-raycaster-logo-test?path=ar.html)
- https://aframe-ar-dragonites.glitch.me with many thanks to Twitter user @uveavanto et al.
- - (as seen at https://twitter.com/machenmusik/status/915692630926938112)
- - (remix with Glitch here: https://glitch.com/edit/#!/aframe-ar-dragonites?path=index.html)

Reference links:
- https://aframe.io
- https://github.com/google-ar/three.ar.js
- https://developers.google.com/ar/develop/web/getting-started
