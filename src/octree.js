class Octree {
  constructor(box) {
    this.triangles = [];
    this.box = box;
    this.bounds = new THREE.Box3();
    this.subTrees = [];
  }
  addTriangle(tri) {
    this.bounds.min.x = Math.min(this.bounds.min.x, tri.a.x, tri.b.x, tri.c.x);
    this.bounds.min.y = Math.min(this.bounds.min.y, tri.a.y, tri.b.y, tri.c.y);
    this.bounds.min.z = Math.min(this.bounds.min.z, tri.a.z, tri.b.z, tri.c.z);
    this.bounds.max.x = Math.max(this.bounds.max.x, tri.a.x, tri.b.x, tri.c.x);
    this.bounds.max.y = Math.max(this.bounds.max.y, tri.a.y, tri.b.y, tri.c.y);
    this.bounds.max.z = Math.max(this.bounds.max.z, tri.a.z, tri.b.z, tri.c.z);
    this.triangles.push(tri);
    this.intersect = new THREE.Vector3;
  }
  calcBox() {
    this.box = this.bounds.clone();
  }
  split(level) {
    if (!this.box) return;
    var subTrees = [],
      halfsize = this.box.max.clone().sub(this.box.min).multiplyScalar(0.5),
      box, v, tri;
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        for (let z = 0; z < 2; z++) {
          box = new THREE.Box3;
          v = new THREE.Vector3(x, y, z);
          box.min = this.box.min.clone().add(v.multiply(halfsize))
          box.max = box.min.clone().add(halfsize);
          subTrees.push(new Octree(box));
        }
      }
    }
    while (tri = this.triangles.pop()) {
      for (let i = 0; i < subTrees.length; i++) {
        if (subTrees[i].box.intersectsTriangle(tri)) {
          subTrees[i].addTriangle(tri);
        }
      }
    }
    for (let i = 0; i < subTrees.length; i++) {
      var len = subTrees[i].triangles.length;
      if (len > 8 && level < 16) {
        subTrees[i].split(level + 1);
      }
      if (len != 0) {
        this.subTrees.push(subTrees[i]);
      }
    }
  }
  build() {
    this.calcBox();
    this.split(0);
  }
  getRayTris(ray, triangles) {
    for (let i = 0; i < this.subTrees.length; i++) {
      var subTree = this.subTrees[i];
      if (!ray.intersectBox(subTree.box, this.intersect)) continue;
      if (subTree.triangles.length > 0) {
        for (let j = 0; j < subTree.triangles.length; j++) {
          if (triangles.indexOf(subTree.triangles[j]) == -1) triangles.push(subTree.triangles[j])
        }
      } else {
        subTree.getRayTris(ray, triangles);
      }
    }
  }
  rayIntersect(ray) {
    if (ray.direction.length() == 0) return;
    var tris = [],
      distance = 1e100,
      result;
    this.getRayTris(ray, tris);
    for (let i = 0; i < tris.length; i++) {
      result = ray.intersectTriangle(tris[i].a, tris[i].b, tris[i].c, false, this.intersect);
      if (result) {
        distance = Math.min(distance, result.sub(ray.origin).length())
      }
    }
    return distance < 1000 ? distance : false;
  }
}

module.exports = Octree;
