/**
 * dat.globe Javascript WebGL Globe Toolkit
 * https://github.com/dataarts/webgl-globe
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

const GLOBE_RADIUS = 200;
const CURVE_MIN_ALTITUDE = 20;
const CURVE_MAX_ALTITUDE = 200;
const DEGREE_TO_RADIAN = Math.PI / 180;

function clamp(num, min, max) {
    return num <= min ? min : (num >= max ? max : num);
}

function coordinateToPosition(lat, lng, radius) {
    const phi = (90 - lat) * DEGREE_TO_RADIAN;
    const theta = (lng + 180) * DEGREE_TO_RADIAN;

    return new THREE.Vector3(
        - radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

function getSplineFromCoords(coords) {
    const startLat = coords[0];
    const startLng = coords[1];
    const endLat = coords[2];
    const endLng = coords[3];
  
    // start and end points
    const start = coordinateToPosition(startLat, startLng, GLOBE_RADIUS);
    const end = coordinateToPosition(endLat, endLng, GLOBE_RADIUS);
    
    // altitude
    const altitude = clamp(start.distanceTo(end) * .75, CURVE_MIN_ALTITUDE, CURVE_MAX_ALTITUDE);
    
    // 2 control points
    const interpolate = d3.geoInterpolate([startLng, startLat], [endLng, endLat]);
    const midCoord1 = interpolate(0.25);
    const midCoord2 = interpolate(0.75);
    const mid1 = coordinateToPosition(midCoord1[1], midCoord1[0], GLOBE_RADIUS + altitude);
    const mid2 = coordinateToPosition(midCoord2[1], midCoord2[0], GLOBE_RADIUS + altitude);
  
    return {
      start,
      end,
      spline: new THREE.CubicBezierCurve3(start, mid1, mid2, end)
    };
  }

var DAT = DAT || {};

 DAT.Globe = function(container, opts) {
   opts = opts || {};
   
   var colorFn = opts.colorFn || function(x) {
     var c = new THREE.Color();
     c.setHSL( ( 0.6 - ( x * 0.5 ) ), 1.0, 0.5 );
    //  c.setHSL( ( 0.6 - ( x * 0.5 ) ), 1.0, 0.5 );
     return c;
   };
   var imgDir = opts.imgDir || '/img/globe/';
 
   var Shaders = {
     'earth' : {
       uniforms: {
         'texture': { type: 't', value: null }
       },
       vertexShader: [
         'varying vec3 vNormal;',
         'varying vec2 vUv;',
         'void main() {',
           'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
           'vNormal = normalize( normalMatrix * normal );',
           'vUv = uv;',
         '}'
       ].join('\n'),
       fragmentShader: [
         'uniform sampler2D texture;',
         'varying vec3 vNormal;',
         'varying vec2 vUv;',
         'void main() {',
           'vec3 diffuse = texture2D( texture, vUv ).xyz;',
           'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
           'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
           'gl_FragColor = vec4( diffuse + atmosphere, 1.0 );',
         '}'
       ].join('\n')
     },
     'atmosphere' : {
       uniforms: {},
       vertexShader: [
         'varying vec3 vNormal;',
         'void main() {',
           'vNormal = normalize( normalMatrix * normal );',
           'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
         '}'
       ].join('\n'),
       fragmentShader: [
         'varying vec3 vNormal;',
         'void main() {',
           'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
           'gl_FragColor = vec4( 0.3, 0.4, 1.0, 1.0 ) * intensity;',
         '}'
       ].join('\n')
     }
   };
 
   var camera, scene, renderer, w, h;
   var mesh, atmosphere, point;
 
   var overRenderer;
 
   var curZoomSpeed = 0;
   var zoomSpeed = 50;
 
   var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
   var rotation = { x: 0, y: 0 },
       target = { x: Math.PI*3/2, y: Math.PI / 6.0 },
       targetOnDown = { x: 0, y: 0 };
 
   var distance = 100000, distanceTarget = 100000;
   var padding = 40;
   var PI_HALF = Math.PI / 2;
 
   function init() {
 
     container.style.color = '#fff';
     container.style.font = '13px/20px Arial, sans-serif';
 
     var shader, uniforms, material;
     w = container.offsetWidth || window.innerWidth;
     h = container.offsetHeight || window.innerHeight;
 
     camera = new THREE.PerspectiveCamera(30, w / h, 1, 10000);
     camera.position.z = distance;
 
     scene = new THREE.Scene();
 
     var geometry = new THREE.SphereGeometry(GLOBE_RADIUS, 80, 60);
 
     shader = Shaders['earth'];
     uniforms = THREE.UniformsUtils.clone(shader.uniforms);
 
     uniforms['texture'].value = THREE.ImageUtils.loadTexture(imgDir+'world.jpg');
 
     material = new THREE.ShaderMaterial({
           uniforms: uniforms,
           vertexShader: shader.vertexShader,
           fragmentShader: shader.fragmentShader
         });
 
     mesh = new THREE.Mesh(geometry, material);
     mesh.rotation.y = Math.PI;
     scene.add(mesh);
 
     shader = Shaders['atmosphere'];
     uniforms = THREE.UniformsUtils.clone(shader.uniforms);
 
     material = new THREE.ShaderMaterial({
 
           uniforms: uniforms,
           vertexShader: shader.vertexShader,
           fragmentShader: shader.fragmentShader,
           side: THREE.BackSide,
           blending: THREE.AdditiveBlending,
           transparent: true
 
         });
 
     mesh = new THREE.Mesh(geometry, material);
     mesh.scale.set( 1.1, 1.1, 1.1 );
     scene.add(mesh);
 
     geometry = new THREE.BoxGeometry(0.75, 0.75, 1);
     geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0,0,-0.5));
 
     point = new THREE.Mesh(geometry);
 
     renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
     renderer.setSize(w, h);
 
     renderer.domElement.style.position = 'absolute';
 
     container.appendChild(renderer.domElement);
 
     container.addEventListener('mousedown', onMouseDown, false);
     container.addEventListener('touchstart', onMouseDown, false);
 
    //  container.addEventListener('mousewheel', onMouseWheel, false);
 
     document.addEventListener('keydown', onDocumentKeyDown, false);
 
     window.addEventListener('resize', onWindowResize, false);
 
     container.addEventListener('mouseover', function() {
       overRenderer = true;
     }, false);
 
     container.addEventListener('mouseout', function() {
       overRenderer = false;
     }, false);
   }

   function initSpline() {
       /**
        * testing
        */
        // curve = getSplineFromCoords([ 50.807153, 6.833244, 50.807153, 56.833244])
        const curve = new THREE.SplineCurve( [
            new THREE.Vector2( -10, 0 ),
            new THREE.Vector2( -5, 5 ),
            new THREE.Vector2( 0, 0 ),
            new THREE.Vector2( 5, -5 ),
            new THREE.Vector2( 10, 0 )
        ] );

        console.log(curve)
        const points = curve.getPoints( 50 );
        const geometry = new THREE.BufferGeometry().setFromPoints( points );
        
        const material = new THREE.LineBasicMaterial( { color : 0xff0000 } );
        
        // Create the final object to add to the scene
        const splineObject = new THREE.Line( geometry, material )
   }
 
   function addData(data, opts) {
     var lat, lng, size, color, i, step, colorFnWrapper;
 
     opts.animated = opts.animated || false;
     this.is_animated = opts.animated;
     opts.format = opts.format || 'magnitude'; // other option is 'legend'
     if (opts.format === 'magnitude') {
       step = 3;
       colorFnWrapper = function(data, i) { return colorFn(data[i+2]); }
     } else if (opts.format === 'legend') {
       step = 4;
       colorFnWrapper = function(data, i) { return colorFn(data[i+3]); }
     } else {
       throw('error: format not supported: '+opts.format);
     }
 
     if (opts.animated) {
       if (this._baseGeometry === undefined) {
         this._baseGeometry = new THREE.Geometry();
         for (i = 0; i < data.length; i += step) {
           lat = data[i];
           lng = data[i + 1];
 //        size = data[i + 2];
           color = colorFnWrapper(data,i);
           size = 0;
           addPoint(lat, lng, size, color, this._baseGeometry);
         }
       }
       if(this._morphTargetId === undefined) {
         this._morphTargetId = 0;
       } else {
         this._morphTargetId += 1;
       }
       opts.name = opts.name || 'morphTarget'+this._morphTargetId;
     }
     var subgeo = new THREE.Geometry();
     for (i = 0; i < data.length; i += step) {
       lat = data[i];
       lng = data[i + 1];
       color = colorFnWrapper(data,i);
       size = data[i + 2];
       size *= 10;
       addPoint(lat, lng, size, color, subgeo);
     }
     if (opts.animated) {
       this._baseGeometry.morphTargets.push({'name': opts.name, vertices: subgeo.vertices});
     } else {
       this._baseGeometry = subgeo;
     }
 
   };
 
   function createPoints() {
     if (this._baseGeometry !== undefined) {
       if (this.is_animated === false) {
         this.points = new THREE.Mesh(this._baseGeometry, new THREE.MeshBasicMaterial({
               color: 0xffffff,
               vertexColors: THREE.FaceColors,
               morphTargets: false
             }));
       } else {
         if (this._baseGeometry.morphTargets.length < 8) {
           console.log('t l',this._baseGeometry.morphTargets.length);
           var padding = 8-this._baseGeometry.morphTargets.length;
           console.log('padding', padding);
           for(var i=0; i<=padding; i++) {
             console.log('padding',i);
             this._baseGeometry.morphTargets.push({'name': 'morphPadding'+i, vertices: this._baseGeometry.vertices});
           }
         }
         this.points = new THREE.Mesh(this._baseGeometry, new THREE.MeshBasicMaterial({
               color: 0xffffff,
               vertexColors: THREE.FaceColors,
               morphTargets: true
             }));
       }
       scene.add(this.points);
     }
   }
 
   function addPoint(lat, lng, size, color, subgeo) {
 
     var phi = (90 - lat) * Math.PI / 180;
     var theta = (180 - lng) * Math.PI / 180;
 
     point.position.x = 200 * Math.sin(phi) * Math.cos(theta);
     point.position.y = 200 * Math.cos(phi);
     point.position.z = 200 * Math.sin(phi) * Math.sin(theta);
 
     point.lookAt(mesh.position);
 
     point.scale.z = Math.max( size, 0.1 ); // avoid non-invertible matrix
     point.updateMatrix();
 
     for (var i = 0; i < point.geometry.faces.length; i++) {
 
       point.geometry.faces[i].color = color;
 
     }
     if(point.matrixAutoUpdate){
       point.updateMatrix();
     }
     subgeo.merge(point.geometry, point.matrix);
   }

   function parseTouchEvent(event) {
    if(event.touches) {
        event.clientX = event.touches[0].clientX;
        event.clientY = event.touches[0].clientY;
    }
    return event;
   }
 
   function onMouseDown(event) {
     event.preventDefault();
 
     event = parseTouchEvent(event);

     container.addEventListener('mousemove', onMouseMove, false);
     container.addEventListener('mouseup', onMouseUp, false);
     container.addEventListener('mouseout', onMouseOut, false);

     container.addEventListener('touchmove', onMouseMove, false);
     container.addEventListener('touchend', onMouseUp, false);
     container.addEventListener('touchleave', onMouseOut, false);
 
    if(!event.clientX) {
        return;
    }

     mouseOnDown.x = - event.clientX;
     mouseOnDown.y = event.clientY;
 
     targetOnDown.x = target.x;
     targetOnDown.y = target.y;
 
     container.style.cursor = 'move';
   }
 
   function onMouseMove(event) {

    event = parseTouchEvent(event);

     mouse.x = - event.clientX;
     mouse.y = event.clientY;
 
     var zoomDamp = distance/1000;
 
     target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
     target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;
 
     target.y = target.y > PI_HALF ? PI_HALF : target.y;
     target.y = target.y < - PI_HALF ? - PI_HALF : target.y;
   }
 
   function onMouseUp(event) {
     container.removeEventListener('mousemove', onMouseMove, false);
     container.removeEventListener('mouseup', onMouseUp, false);
     container.removeEventListener('mouseout', onMouseOut, false);

     container.removeEventListener('touchmove', onMouseMove, false);
     container.removeEventListener('touchend', onMouseUp, false);
     container.removeEventListener('touchleave', onMouseOut, false);
     container.style.cursor = 'auto';
   }
 
   function onMouseOut(event) {
     container.removeEventListener('mousemove', onMouseMove, false);
     container.removeEventListener('mouseup', onMouseUp, false);
     container.removeEventListener('mouseout', onMouseOut, false);

     container.removeEventListener('touchmove', onMouseMove, false);
     container.removeEventListener('touvhend', onMouseUp, false);
     container.removeEventListener('touchleave', onMouseOut, false);
   }
 
   function onMouseWheel(event) {
     event.preventDefault();
     if (overRenderer) {
       zoom(event.wheelDeltaY * 0.3);
     }
     return false;
   }
 
   function onDocumentKeyDown(event) {
     switch (event.keyCode) {
       case 38:
         zoom(100);
         event.preventDefault();
         break;
       case 40:
         zoom(-100);
         event.preventDefault();
         break;
     }
   }

   function onWindowResize( event ) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    //  const height = Math.max(container.offsetHeight, 500);
    // camera.aspect = container.offsetWidth / height;
    //  camera.updateProjectionMatrix();
    //  renderer.setSize( container.offsetWidth, height);
   }
 
   function zoom(delta) {
    // delta = 0;
     distanceTarget -= delta;
     distanceTarget = distanceTarget > 1000 ? 1000 : distanceTarget;
     distanceTarget = distanceTarget < 350 ? 350 : distanceTarget;
   }
 
   function animate() {
     requestAnimationFrame(animate);
     render();
   }
 
   function render() {
     zoom(curZoomSpeed);
 
     rotation.x += (target.x - rotation.x) * 0.1;
     rotation.y += (target.y - rotation.y) * 0.1;
     distance += (distanceTarget - distance) * 0.3;
 
     camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
     camera.position.y = distance * Math.sin(rotation.y);
     camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);
 
     camera.lookAt(mesh.position);
 
     renderer.render(scene, camera);
   }
 
   init();
   this.animate = animate;
 
 
   this.__defineGetter__('time', function() {
     return this._time || 0;
   });
 
   this.__defineSetter__('time', function(t) {
     var validMorphs = [];
     var morphDict = this.points.morphTargetDictionary;
     for(var k in morphDict) {
       if(k.indexOf('morphPadding') < 0) {
         validMorphs.push(morphDict[k]);
       }
     }
     validMorphs.sort();
     var l = validMorphs.length-1;
     var scaledt = t*l+1;
     var index = Math.floor(scaledt);
     for (i=0;i<validMorphs.length;i++) {
       this.points.morphTargetInfluences[validMorphs[i]] = 0;
     }
     var lastIndex = index - 1;
     var leftover = scaledt - index;
     if (lastIndex >= 0) {
       this.points.morphTargetInfluences[lastIndex] = 1 - leftover;
     }
     this.points.morphTargetInfluences[index] = leftover;
     this._time = t;
   });
 
   this.initSpline = initSpline;
   this.addData = addData;
   this.createPoints = createPoints;
   this.renderer = renderer;
   this.scene = scene;
 
   return this;
 
 };
 