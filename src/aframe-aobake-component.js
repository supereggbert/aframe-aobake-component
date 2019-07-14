if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

var AOBake = require("./aobake");

AFRAME.registerComponent('aobake', {
  schema: {
    'sampleRate': {type:'number', default:3},
    'gamma': {type:'number', default:3},
    'exposure': {type:'number', default:1},
    'distance': {type:'number', default:5},
    'autoApply': {type:'boolean', default:true}
  },
  init: function () {
    this.baked=false;
    if(this.data.autoApply) this.el.setAttribute('visible',false);
    var elements=Array.from(this.el.querySelectorAll("*"));
    var promises=[];
    elements.map((el)=>{
      var component, components=el.components;
      for(component in components){
        if(components[component].hasOwnProperty('loader')){
          promises.push(new Promise(resolve =>{
            el.addEventListener('model-loaded',()=>{
              resolve();
            });
          }));
        }
      }
    });
    Promise.all(promises).then(()=>{
      this.el.emit('children-ready');
      if(this.data.autoApply) this.applyAO();
    });
  },
  applyAO: function(){
    if(!this.baked){
      var bake=new AOBake(this.el.object3D, this.data.sampleRate,this.data.gamma,this.data.exposure,this.data.distance);
      bake.applyAO();
      if(this.data.autoApply) this.el.setAttribute('visible',true);
      this.el.emit('ao-baked');
    }
  }
});

