# AO Bake Component

The AO bake is a component created for [A-Frame](https://aframe.io/). It will automatically bake the ambient occlusion to the vertex colors to geometry of meshes. 

## Gotchas

* Because the AO is baked to the vertex colors the more geometry the better the effect.
* Can be quite slow, so once backed, it is advised to export the colors to a gltf model using aframes export feature.
* If polygons overlap without verts along the intersection then the results will be off.
         
## Properties
| Property | Default | Description |
|----------|---------|-------------|
| sample-rate | 3 | The number of samples to take in each direction, higher values give better results but take more time |
| gamma | 3 | The gamma to apply to the resulting AO, higher values give higher contrast |
| exposure | 1 | Adjusts the amount of exposure the AO produced |
| distance | 5 | The maximum distance to consider as occulded |
| auto-apply | true | Will automatically generate the AO on load |

## Methods

| Method | Description |
|--------|-------------|
| applyAO | Manually apply AO when auto-apply is false |


## Events

| Name | Event Type | Description |
|------|-------|-------------|
| children-ready | N/A |  Dispatched when all models in child elements have finshed loading |
| ao-baked | N/A |  Dispatched when the AO has been baked |

## How to Use

To use the component you just add the component to the A-Frame entity containing the html.  For example:
```html
<a-scene>
    <a-entity aobake>
      <a-torus-knot material="color: #fff" position="0 1 -4" arc="180" p="2" q="3" radius="1" radius-tubular="0.2"></a-torus-knot>
    </a-entity>
</a-scene>
```


## Installation

### Browser

Install and use by directly including the  browser files:
```html
<head>
  <title>My A-Frame Scene</title>
  <script src="https://aframe.io/releases/1.3.0/aframe.min.js"></script>
  <script src="http://supereggbert.github.io/aframe-aobake-component/dist/build.js"></script>
</head>
```

### npm

Install via npm:

*npm install aframe-aobake-component*

Then register and use.
```js
require('aframe');
require('aframe-aobake-component');
```

## Building

-   Install  [Node.js](https://nodejs.org/).
    
-   Clone the project to your file system:
    
```
git clone https://github.com/supereggbert/aframe-aobake-component.git
```
*   enter the aframe-aobake-component directory.

```cd ./aframe-aobake-component```

*   Install build dependencies

```npm install```

*   Run the build script.

```npm run build```

The compiled file is at  `aframe-aobake-component/dist/build.js`

