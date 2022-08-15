var Octree = require('./octree');

const EPSILON = 1e-10;

class AOBake {
  constructor(graphNode, sampleRate = 3, gamma = 3, exposure = 1, distance = 5) {
    this.graphNode = graphNode;
    this.sampleRate = sampleRate;
    this.gamma = gamma;
    this.exposure = exposure;
    this.distance = distance;
    this.normalVector = new THREE.Vector3;
    this.positionVector = new THREE.Vector3;
    this.centerVector = new THREE.Vector3;
    this.scalar = 1 + EPSILON * 10;
    this.scalarDivBy3 = 1 / 3;
    this.normalVectorTmp = new THREE.Vector3;
    this.normalMatrix = new THREE.Matrix3;
    this.sampleRay = new THREE.Ray;
    this.sampleCache = {};
    this.buildSamples();
  }
  buildSamples() {
    var samples = [];
    var inc = 1 / this.sampleRate;
    for (var x = 0; x <= 1; x += inc) {
      for (var y = 0; y <= 1; y += inc) {
        var sx = (x - 0.5) * 2;
        var sy = (y - 0.5) * 2;
        samples.push(new THREE.Vector3(sx, sy, 1).normalize());
        samples.push(new THREE.Vector3(sx, sy, -1).normalize());
        if (x > 0 && x < 1) {
          samples.push(new THREE.Vector3(sx, 1, sy).normalize());
          samples.push(new THREE.Vector3(sx, -1, sy).normalize());
          if (y > 0 && y < 1) {
            samples.push(new THREE.Vector3(1, sx, sy).normalize());
            samples.push(new THREE.Vector3(-1, sx, sy).normalize());
          }
        }
      }
    }
    this.samples = samples;
  }
  updateTransforms() {
    this.graphNode.traverse((obj) => {
      obj.updateMatrix();
      obj.updateWorldMatrix();
    });
  }
  getNormalOffset(v, matrix, distance) {
    return v.applyMatrix3(matrix).multiplyScalar(-distance);
  }
  getAdjustedPosition(v, matrix, normalOffset) {
    return v.applyMatrix4(matrix).add(normalOffset);
  }
  scaleTriangle(triangle) {
    var v1 = triangle.a,
      v2 = triangle.b,
      v3 = triangle.c;
    var center = this.centerVector.copy(v1).add(v2).add(v3).multiplyScalar(this.scalarDivBy3);
    v1.sub(center).multiplyScalar(this.scalar).add(center);
    v2.sub(center).multiplyScalar(this.scalar).add(center);
    v3.sub(center).multiplyScalar(this.scalar).add(center);
    return triangle;
  }
  buildOctree() {
    this.updateTransforms();
    var octree = new Octree(),
      offsetDistance = EPSILON,
      transform, normalMatrix, v1, v2, v3;
    this.graphNode.traverse((obj) => {
      if (obj.isMesh === true) {
        if (obj.geometry.index !== null) {
          const geometry = obj.geometry;
          obj.geometry = obj.geometry.toNonIndexed();
          geometry.dispose();
        } else {
          const geometry = obj.geometry;
          obj.geometry = obj.geometry.clone(); // Geometry needs to be unique so clone it
          geometry.dispose();
        }
        obj.material.vertexColors = THREE.VertexColors;
        obj.material.needsUpdate = true;
        const positionAttribute = obj.geometry.getAttribute('position');
        const normalAttribute = obj.geometry.getAttribute('normal');
        transform = obj.matrixWorld;
        normalMatrix = this.normalMatrix.getNormalMatrix(obj.matrixWorld);
        for (let i = 0; i < positionAttribute.count; i += 3) {
          var normalOffset = this.getNormalOffset(this.normalVector.fromBufferAttribute(normalAttribute, i), normalMatrix, offsetDistance);
          v1 = this.getAdjustedPosition(new THREE.Vector3().fromBufferAttribute(positionAttribute, i), transform, normalOffset);
          var normalOffset = this.getNormalOffset(this.normalVector.fromBufferAttribute(normalAttribute, i + 1), normalMatrix, offsetDistance);
          v2 = this.getAdjustedPosition(new THREE.Vector3().fromBufferAttribute(positionAttribute, i + 1), transform, normalOffset);
          var normalOffset = this.getNormalOffset(this.normalVector.fromBufferAttribute(normalAttribute, i + 2), normalMatrix, offsetDistance);
          v3 = this.getAdjustedPosition(new THREE.Vector3().fromBufferAttribute(positionAttribute, i + 2), transform, normalOffset);
          octree.addTriangle(this.scaleTriangle(new THREE.Triangle(v1, v2, v3)));
        }
      }
    });
    octree.build();
    this.octree = octree;
  }
  sampleVertex(position, normal) {
    var hash = JSON.stringify([position, normal]),
      ao = 0,
      samples = this.samples,
      m = 1 / this.samples.length,
      sampleRay = this.sampleRay,
      ao_distance = this.distance,
      octree = this.octree;
    if (this.sampleCache[hash]) return this.sampleCache[hash];
    position.add(this.normalVectorTmp.copy(normal).multiplyScalar(EPSILON * 10));
    for (let i = 0; i < samples.length; i++) {
      var dir = samples[i].dot(normal);
      if (dir < 0) {
        ao += m;
        continue;
      }
      sampleRay.set(position, samples[i]);
      var distance = octree.rayIntersect(sampleRay);
      if (distance) {
        var f = Math.min(1, (distance * distance) / ao_distance);
        ao += m * f;
      } else {
        ao += m;
      }
    };
    ao *= this.exposure;
    ao = Math.pow(ao, this.gamma);
    this.sampleCache[hash] = ao;
    return ao;
  }
  applyAO() {
    this.buildOctree();
    var octree = this.octree;
    this.graphNode.traverse((obj) => {
      if (obj.isMesh === true) {
        var normalMatrix = this.normalMatrix.getNormalMatrix(obj.matrixWorld),
          positions = obj.geometry.attributes.position.array,
          normals = obj.geometry.attributes.normal.array;

        obj.geometry.addAttribute('color', new THREE.BufferAttribute(new Float32Array(positions.length), 3));
        var colors = obj.geometry.attributes.color;

        colors.needsUpdate = true;
        var color, position = this.positionVector,
          normal = this.normalVector,
          transform = obj.matrixWorld;

        for (let i = 0; i < positions.length; i += 3) {
          position.set(positions[i], positions[i + 1], positions[i + 2]).applyMatrix4(transform);
          normal.set(normals[i], normals[i + 1], normals[i + 2]).applyMatrix3(normalMatrix);
          color = this.sampleVertex(position, normal);
          colors.array[i] = color;
          colors.array[i + 1] = color;
          colors.array[i + 2] = color;
        }
      }
    });
  }
}

module.exports = AOBake;
