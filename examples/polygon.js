// Polygon component.

AFRAME.registerGeometry('polygon', {
  schema: {
    stride: { default: 3 },
    vertices: { default: [-1,1,0, -1,-1,0, 1,-1,0, 1,0.5,0] }
  },

  init: function (data) {
    var geometry = new THREE.Geometry();
    var i;
    for (i = 0; (i+2) < data.vertices.length; i += data.stride) {
      geometry.vertices.push(new THREE.Vector3(data.vertices[i], data.vertices[i+1], data.vertices[i+2]));
    }
    geometry.computeBoundingBox();
    // generate faces - this makes a triangle fan, from the first +Y point around
    for (i = 0; i < geometry.vertices.length - 2; i++)
    {
      geometry.faces.push(new THREE.Face3(0, i + 1, i + 2));
    }
    geometry.mergeVertices();
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();
    this.geometry = geometry;
  }
});      

