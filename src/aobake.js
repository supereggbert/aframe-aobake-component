var Octree = require("./octree");

const EPSILON=1e-10;

class AOBake{
  constructor(graphNode, sampleRate=3,gamma=3,exposure=1,distance=5){
    this.graphNode=graphNode;
    this.sampleRate=sampleRate;
    this.gamma=gamma;
    this.exposure=exposure;
    this.distance=distance;
    this.normalVector=new THREE.Vector3;
    this.positionVector=new THREE.Vector3;
    this.sampleRay = new THREE.Ray;
    this.sampleCache={};
    this.buildSamples();
  }
  buildSamples(){
    var samples=[];
    var inc=1/this.sampleRate;
    for(var x=0;x<=1;x+=inc){
      for(var y=0;y<=1;y+=inc){
        var sx=(x-0.5)*2;
        var sy=(y-0.5)*2;
        samples.push(new THREE.Vector3(sx,sy,1).normalize());
        samples.push(new THREE.Vector3(sx,sy,-1).normalize());
        if(x>0 && x<1){
          samples.push(new THREE.Vector3(sx,1,sy).normalize());
          samples.push(new THREE.Vector3(sx,-1,sy).normalize());
          if(y>0 && y<1){
            samples.push(new THREE.Vector3(1,sx,sy).normalize());
            samples.push(new THREE.Vector3(-1,sx,sy).normalize());
          }
        }
      }
    }
    this.samples=samples;
  }
  updateTransforms(){
    this.graphNode.traverse((obj)=>{
        obj.updateMatrix();  
        obj.updateWorldMatrix();
    });
  }
  getNormalOffset(x,y,z,matrix,distance){
    return this.normalVector.set(x,y,z).applyMatrix3(matrix).multiplyScalar(-distance);
  }
  getAdjustedPosition(x,y,z,matrix,normalOffset){
    return new THREE.Vector3(x,y,z).applyMatrix4(matrix).add(normalOffset);
  }
  scaleTriangle(triangle){
    var v1=triangle.a,v2=triangle.b,v3=triangle.c;
    var center=v1.clone().add(v2).add(v3).multiplyScalar(1/3);
    v1.sub(center).multiplyScalar(1+EPSILON*10).add(center);
    v2.sub(center).multiplyScalar(1+EPSILON*10).add(center);
    v3.sub(center).multiplyScalar(1+EPSILON*10).add(center);
    return triangle;
  }
  buildOctree(){
    this.updateTransforms();
    var octree=new Octree(), offsetDistance=EPSILON, positions, normals, transform,normalMatrix,v1,v2,v3;
    this.graphNode.traverse((obj)=>{
      if(obj.type=="Mesh"){
        if(obj.geometry.index) obj.geometry=obj.geometry.toNonIndexed();
        obj.material.vertexColors=THREE.VertexColors;
        positions=obj.geometry.attributes.position.array;
        normals=obj.geometry.attributes.normal.array;
        transform=obj.matrixWorld;
        normalMatrix=new THREE.Matrix3().getNormalMatrix( obj.matrixWorld );
        for(let i=0;i<positions.length;i+=9){
          var normalOffset=this.getNormalOffset(normals[i],normals[i+1],normals[i+2],normalMatrix,offsetDistance);
          v1 = this.getAdjustedPosition(positions[i],positions[i+1],positions[i+2],transform,normalOffset);
          var normalOffset=this.getNormalOffset(normals[i+3],normals[i+4],normals[i+5],normalMatrix,offsetDistance);
          v2 = this.getAdjustedPosition(positions[i+3],positions[i+4],positions[i+5],transform,normalOffset);
          var normalOffset=this.getNormalOffset(normals[i+6],normals[i+7],normals[i+8],normalMatrix,offsetDistance);
          v3 = this.getAdjustedPosition(positions[i+6],positions[i+7],positions[i+8],transform,normalOffset);
          octree.addTriangle( this.scaleTriangle(new THREE.Triangle(v1,v2,v3)) );
        } 
      }
    });
    octree.build();
    this.octree=octree;
  }
  sampleVertex(position,normal){
    var hash=JSON.stringify([position,normal]),ao=0, samples=this.samples, m=1/this.samples.length, sampleRay=this.sampleRay, ao_distance=this.distance, octree=this.octree;
    if(this.sampleCache[hash]) return this.sampleCache[hash];
    position.add(normal.clone().multiplyScalar(EPSILON*10));
    for(let i=0;i<samples.length;i++){
      var dir=samples[i].dot(normal);
      if(dir<0){
        ao+=m;
        continue;
      }
      sampleRay.set(position,samples[i]);
      var distance=octree.rayIntersect(sampleRay);
      if(distance){
        var f=Math.min(1,(distance*distance)/ao_distance);
        ao+=m*f;
      }else{
        ao+=m;
      }
    };
    ao*=this.exposure; 
    ao=Math.pow(ao,this.gamma);
    this.sampleCache[hash]=ao;
    return ao;
  }
  applyAO(){
    this.buildOctree();
    var octree=this.octree;
    this.graphNode.traverse((obj)=>{
      if(obj.type=="Mesh"){
        obj.geometry=obj.geometry.clone(); // Geometry needs to be unique so clone it
        
        var normalMatrix=new THREE.Matrix3().getNormalMatrix( obj.matrixWorld ),
          positions=obj.geometry.attributes.position.array,
          normals=obj.geometry.attributes.normal.array;
           
        obj.geometry.addAttribute( 'color', new THREE.BufferAttribute( new Float32Array(positions.length), 3 ) );
        var colors=obj.geometry.attributes.color;

		    colors.needsUpdate = true;
        var color,position=this.positionVector,
          normal=this.normalVector,
          transform=obj.matrixWorld;  
        
        for(let i=0;i<positions.length;i+=3){
          position.set(positions[i],positions[i+1],positions[i+2]).applyMatrix4(transform);
          normal.set(normals[i],normals[i+1],normals[i+2]).applyMatrix3(normalMatrix);
          color=this.sampleVertex(position,normal);
          colors.array[i]=color;
          colors.array[i+1]=color;
          colors.array[i+2]=color;
        }
      }
    }); 
  }
}

module.exports = AOBake;
