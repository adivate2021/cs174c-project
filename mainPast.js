// import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// import { OBB } from 'three/examples/jsm/Addons.js';

// //Game Properties
// let currentLevel;
// let scene, camera, renderer, controls, directionalLight;
// let clock;
// let blendingFactor = 0.1;
// let obstacles;
// let player;
// let isGameActive = false;
// let levelScore = 0;
// let collectScore = 0;
// let ignoreInitial = 0;
// document.getElementById("levelScore").textContent = levelScore;
// document.getElementById("collectScore").textContent = collectScore;
// localStorage.setItem('levelScore', levelScore);
// localStorage.setItem('collectScore', collectScore);
// window.addEventListener('load', () => {
//     const savedLevelScore = localStorage.getItem('levelScore');
//     const savedCollectScore = localStorage.getItem('collectScore');

//     if (savedLevelScore) {
//         levelScore = parseInt(savedLevelScore);
//         document.getElementById("levelScore").textContent = levelScore;
//     }

//     if (savedCollectScore) {
//         collectScore = parseInt(savedCollectScore);

//         console.log("Setting collect score to:", collectScore);
//         document.getElementById("collectScore").textContent = collectScore;
//     }
// });

// //Player properties
// const speed = 0.1;
// let moveLeft = false;
// let moveRight = false;
// let moveUp = false;
// let moveDown = false;
// let obstructed = false;

// // Camera properties
// const cSpeed = 0.5;
// let cLeft = false;
// let cRight = false;
// let cUp = false;
// let cDown = false;
// let c_x = -10;
// let c_y = 20;
// let c_z = -20;
// let switchperspective=false;
// let perspectivesangles = [
//     {index : 0, x: -3, y: 3, z: -20},
//     {index: 1, x: 3, y: 3,z: -20},
//     {index : 2, x: -3, y: -3, z: -20},
//     {index : 3, x:  3, y: -3, z: -20},
// ] 
// let currentangles = perspectivesangles[0];


// // TRANSFORMATIONS

// const translation = 1;
// const oscillating_translation = 2;
// const scaling = 3;
// const rotationX = 4;
// const rotationY = 5;
// const rotationZ = 6;

// function translationMatrix(tx, ty, tz) {
//     return new THREE.Matrix4().set(
//         1, 0, 0, tx,
//         0, 1, 0, ty,
//         0, 0, 1, tz,
//         0, 0, 0, 1
//     );
// }

// function rotationMatrixX(theta) { 
//     return new THREE.Matrix4().set(
//         1, 0, 0, 0,
//         0, Math.cos(theta), -Math.sin(theta), 0,
//         0, Math.sin(theta), Math.cos(theta), 0,
//         0, 0, 0, 1
//     );
// }

// function rotationMatrixY(theta) {
//     return new THREE.Matrix4().set(
//         Math.cos(theta), 0, Math.sin(theta), 0,
//         0, 1, 0, 0,
//         -Math.sin(theta), 0, Math.cos(theta), 0,
//         0, 0, 0, 1
//     );
// }
// function rotationMatrixZ(theta) {
//     return new THREE.Matrix4().set(
//     Math.cos(theta), -Math.sin(theta), 0, 0,
//     Math.sin(theta), Math.cos(theta), 0, 0,
//     0, 0, 1, 0,
//     0, 0, 0, 1
//     );
// }

// function scalingMatrix(x,y,z) {
//     return new THREE.Matrix4().set(
//     x, 0, 0, 0,
//     0, y, 0, 0,
//     0, 0, z, 0,
//     0, 0, 0, 1
//     );
// }

// function oscillation(period, time, speed, adjust){
//     return Math.abs(speed * (time % period) - period*speed/2) + adjust;
// }

// function init() {
//     showHomeScreen();
//     renderer = new THREE.WebGLRenderer();

//     renderer.shadowMap.enabled =true;
//     //renderer.shadowMap.type=THREE.PCFShadowMap;    
//     renderer.setPixelRatio(window.devicePixelRatio);
//     renderer.setSize(window.innerWidth, window.innerHeight);

//     scene = new THREE.Scene();
//     // document.getElementById('level1').addEventListener('click', () => loadLevel(1));
//     // document.getElementById('level2').addEventListener('click', () => loadLevel(2));
//     // document.getElementById('level3').addEventListener('click', () => loadLevel(3));
//     // document.getElementById('level4').addEventListener('click', () => loadLevel(4));

// }

// function showHomeScreen() {
//     document.getElementById('homeScreen').style.display = 'flex';
//     document.getElementById('loseScreen').style.display = 'none';
//     document.getElementById('winScreen').style.display = 'none';
//     document.getElementById('winScreen6').style.display = 'none';

//     document.getElementById('collectScoreBoard').style.display = 'none';
//     document.getElementById('levelContainer').style.display = 'none';

//     document.getElementById('startButton').addEventListener('click', () => loadLevel(1));
//     document.getElementById('showLevels').addEventListener('click', () => cheatLevels());
//     document.getElementById('level1').addEventListener('click', () => loadLevel(1));
//     document.getElementById('level2').addEventListener('click', () => loadLevel(2));
//     document.getElementById('level3').addEventListener('click', () => loadLevel(3));
//     document.getElementById('level4').addEventListener('click', () => loadLevel(4));
//     document.getElementById('level5').addEventListener('click', () => loadLevel(5));
//     document.getElementById('level6').addEventListener('click', () => loadLevel(6));
// }
  
// function cheatLevels() {
//     document.getElementById('levelContainer').style.display = '';
//     document.getElementById('showLevels').style.display = 'none';
// }

// function showWinScreen() {
//     document.getElementById('winScreen').style.display = '';
//     score = currentLevel;
// }

// function showWinScreen6() {
//     document.getElementById('winScreen6').style.display = '';
//     document.getElementById('collectScoreBoard').style.display = 'none';
//     document.getElementById('HomeWin6').addEventListener('click', () => reloadFunct());
// }
  
// function showLoseScreen() {
//     document.getElementById('collectScoreBoard').style.display = 'none';
//     document.getElementById('loseScreen').style.display = '';
//     document.getElementById('restartButton').addEventListener('click', () => reloadFunct());
//     removeEventListeners();
// }

// function reloadFunct() {
//     location.reload();
//     showHomeScreen();
// }

// function removeEventListeners(){

//     document.getElementById('level1').removeEventListener('click', () => loadLevel(1));
//     document.getElementById('level2').removeEventListener('click', () => loadLevel(2));
//     document.getElementById('level3').removeEventListener('click', () => loadLevel(3));
//     document.getElementById('level4').removeEventListener('click', () => loadLevel(4));
//     document.getElementById('level5').removeEventListener('click', () => loadLevel(5));
//     document.getElementById('level6').removeEventListener('click', () => loadLevel(6));
// }
// function clearScene() {
//     // Remove all objects from the scene
//     scene.traverse((object) => {
//         if (object instanceof THREE.Mesh) {
//             object.geometry.dispose();
//             object.material.dispose();
//         }
//         scene.remove(object);
//     });
// }

// function loadLevel(level) {
//     clearScene();
//     document.getElementById('homeScreen').style.display = 'none';
//     document.getElementById('winScreen').style.display = 'none';
//     document.getElementById('loseScreen').style.display = 'none';
//     document.getElementById('levelContainer').style.display = 'none';

//     document.getElementById("collectScore").textContent = collectScore;
    
//     if (level == 6) {
//         document.getElementById('collectScoreBoard').style.display = '';
//     }
//     else { 
//         document.getElementById('collectScoreBoard').style.display = 'none';
//     }
    
//     document.body.appendChild(renderer.domElement);

//     currentLevel = level;
//     isGameActive = true;

//     //const scenebackgroundtexture = new THREE.TextureLoader().load('assets/text.png');
//     const loader = new THREE.CubeTextureLoader();
//     const texture = loader.load(['assets/finalspacestuff.png','assets/finalspacestuff.png','assets/finalspacestuff.png','assets/finalspacestuff.png','assets/finalspacestuff.png','assets/finalspacestuff.png']);
//     scene.background = texture;

//     camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
//     camera.position.set(-10,10,-20)

//     controls = new OrbitControls(camera, renderer.domElement);
//     controls.target.set(0, 0, 0);

//     //const light = new THREE.AmbientLight(0x404040); // Ambient light
//     //scene.add(light);
//     directionalLight = new THREE.DirectionalLight(0xffffff, 5);
//     directionalLight.position.set(0,0,-1);
//     //directionalLight.position.set(5, 10, -5).normalize();
//     directionalLight.castShadow =true;
//     directionalLight.shadow.mapSize.width =1024;
//     directionalLight.shadow.mapSize.height =1024;
//     directionalLight.shadow.camera.left = -32;
//     directionalLight.shadow.camera.right = 32;
//     directionalLight.shadow.camera.top = 32;
//     directionalLight.shadow.camera.bottom = -32;
//     directionalLight.shadow.camera.near =0.5;
//     directionalLight.shadow.camera.far =100;
//     directionalLight.shadow.bias =0.005;


//     scene.add(directionalLight);
//     // const balllight = new THREE.Light(0xffffff,5);
//     // balllight.position.set(0,0,75);
//     // scene.add(balllight);

//     clock = new THREE.Clock();

//     switch (level) {
//         case 1:
//             import('./level1.js').then(level1 => {
//                 const { player: newPlayer, obstacles: newObstacles } = level1.setUpLevel(scene)
//                 player = newPlayer;
//                 obstacles = newObstacles;
//             });

//             break;
//         case 2:
//             import('./level2.js').then(level2 => {
//                 const { player: newPlayer, obstacles: newObstacles } = level2.setUpLevel(scene)
//                 player = newPlayer;
//                 obstacles = newObstacles;
//             });
//             break;
//         //case 3:
//         //     import('./levels/level3.js').then(level3 => level3.setupLevel(scene, camera));
//         //     break;
//         case 4:
//             // import('./level4.js').then(level4 => {
//             //     const { player: newPlayer, obstacles: newObstacles } = level4.setUpLevel(scene)
//             //     player = newPlayer;
//             //     obstacles = newObstacles;
//             // });
//             break;
//         case 6:
//             import('./level6.js').then(level6 => {
//                 const { player: newPlayer, obstacles: newObstacles } = level6.setUpLevel(scene)
//                 player = newPlayer;
//                 obstacles = newObstacles;
//             });
//             break;
//     }
//     animate();
// }


// function animate() {
//     if (!isGameActive)
//         return;
    
//     controls.update();
//     requestAnimationFrame(animate);
//     let game_time = clock.getElapsedTime();
   

//         if (currentLevel != 4 || currentLevel != 6) {
//             if (moveLeft) {
//                 if (player.position.x < 15)
//                     player.position.x += speed;
//             }
//             if (moveRight) {
//                 if (player.position.x > -15)
//                     player.position.x -= speed;
//             }
//             if (moveUp) {
//                 if (player.position.y < 15)
//                     player.position.y += speed;
//             }
//             if (moveDown) {
//                 if (player.position.y > -15)
//                     player.position.y -= speed;
//             }
//         }
//         else if (currentLevel == 6) {
//             if (moveLeft) {
//                 if (player.position.x < 30)
//                     player.position.x += 0.15;
//             }
//             if (moveRight) {
//                 if (player.position.x > -30)
//                     player.position.x -= 0.15;
//             }
//             if (moveUp) {
//                 if (player.position.y < 30)
//                     player.position.y += 0.15;
//             }
//             if (moveDown) {
//                 if (player.position.y > -30)
//                     player.position.y -= 0.15;
//             }
//         }
//         else{
//             if (moveLeft) {
//                 player.rotation.z += speed;
//             }
//             if (moveRight) {
//                 player.rotation.z -= speed;
//             }
//         }
//     //}


//     let player_bounding;
//     //if (currentLevel != 4){

//         player_bounding = player.geometry.boundingSphere.clone();
//         player_bounding.center.applyMatrix4(player.matrixWorld);
//     // }
//     // else{
//     //     player.userData.obb = new OBB();
//     //     player_bounding = player.userData.obb.clone();
//     //     player_bounding.applyMatrix4(player.matrixWorld);
//     // }

//     obstacles.forEach(function (obs,index){
//         let currentdepth = new THREE.Vector4();
//         currentdepth.setFromMatrixPosition(obs.mesh.matrixWorld);
//         //console.log('currentdepth',currentdepth.z);
       

//         if (currentdepth.z >=45) {
//             obs.mesh.visible =false;
//         }

//         if(currentdepth.z <45 && currentdepth.z >=-12) {
//             obs.mesh.castShadow=true;
//             obs.mesh.visible=true;
//             obs.mesh.receiveShadow =true;
//         }

//         if (currentdepth.z < -12) {
//             obs.mesh.visible =false;
//         }
        
//         let model_transform = new THREE.Matrix4();
        
//         obs.tranformations.forEach(function (t, index){

//             let matrix;
//             switch(t.tr_type) {
//                 case translation:
//                     matrix = translationMatrix(t.speedX * game_time,t.speedY*game_time, t.speedZ*game_time);
//                     break;
//                 case oscillating_translation:
//                     matrix = translationMatrix(oscillation(t.period, game_time, t.speedX, t.speedX ? t.adjust : 0), oscillation(t.period, game_time, t.speedY, t.speedY ? t.adjust : 0), oscillation(t.period, game_time, t.speedZ, t.speedZ ? t.adjust : 0));

//                     break;
//                 case rotationX:
//                     matrix = rotationMatrixX(t.speed * game_time);
//                     break;
//                 case rotationY: 
//                     matrix = rotationMatrixY(t.speed * game_time);
//                     break;
//                 case rotationZ: 
//                     matrix = rotationMatrixZ(t.speed * game_time);
//                     break;
//                 case scaling:
//                     matrix = scalingMatrix(oscillation(t.period, game_time, t.speed, t.adjust), oscillation(t.period, game_time, t.speed, t.adjust), 1);
//                     break;
//             }

//             model_transform.multiply(matrix);
//         });
    

//              //constant speed of obstacles moving towards player
//             const obs_incoming = translationMatrix(obs.x,obs.y, obs.z - game_time * 5);
//             model_transform.multiply(obs_incoming);
//             if (obs.type == 'box') {
//                 obs.mesh.matrix.copy(model_transform);
//                 obs.mesh.userData.obb.copy( obs.mesh.geometry.userData.obb );
//                 obs.mesh.userData.obb.applyMatrix4( model_transform );
//             }
//             else{
//                 obs.mesh.matrix.copy(model_transform);
//                 obs.mesh.userData.boundingSphere.center.setFromMatrixPosition(obs.mesh.matrixWorld);
//             }

//             if (checkCollision(obs, player_bounding)){
//                 if ((currentLevel == 6) && (ignoreInitial <= obstacles.length)) {
//                     ignoreInitial++;
//                 }
//                 else if (currentLevel == 6 && obs.collect == true) {
//                     if (obs.type == 'box') {
//                          showWinScreen6();
//                     }
//                     if (obs.collected == false) {
//                         collectScore++;
//                         console.log("Score:", collectScore, "obj", obs);
//                         document.getElementById("collectScoreGame").textContent = collectScore;
//                         localStorage.setItem('collectScore', collectScore);
//                         obs.collected = true;
//                         obs.mesh.visible = false;
//                     }
//                 }
//             else {
//                 scene.background = null;
//                 // for(var i = scene.children.length - 1; i >= 0; i--) { 
//                 //     obj = scene.children[i];
//                 //     scene.remove(obj); 
//                 // }
//                 // while (scene.children.length > 0){
//                 //     scene.remove(scene.children[0]);
//                 // }
//                 // if (renderer && renderer.domElement && document.body.contains(renderer.domElement)) {
//                 //     document.body.removeChild(renderer.domElement);
//                 //  }

//                 while (scene.children.length > 0) {
//                     console.log(scene.children.length)
//                     const object = scene.children[0];
//                     scene.remove(object);
//                     if (object instanceof THREE.Mesh) {
//                         object.geometry.dispose();
                    
//                         object.material.dispose();
    
//                         object.texture.dispose();
//                     } 
//                 }

//                 if (document.body.contains(renderer.domElement)) {
//                     document.body.removeChild(renderer.domElement);
//                 }
                
//                 isGameActive = false;
//                 document.getElementById("level").textContent = levelScore;
//                 showLoseScreen();
//                 return; 
//             }
//         }
        
//     });

//     // let cameraTransform = new THREE.Matrix4();
//     // cameraTransform.copy(player.matrix);

//     // if (!switchperspective) {
//     //     if (cLeft) {
//     //         if (c_x < 30)
//     //             c_x += cSpeed;
//     //     }
//     //     if (cRight) {
//     //         if (c_x > -60)
//     //             c_x -= cSpeed;
//     //     }
//     //     if (cUp) {
//     //         if (c_z < 60)
//     //             c_z += cSpeed;
//     //     }
//     //     if (cDown) {
//     //         if (c_z > -60)
//     //             c_z -= cSpeed;
//     //     }
    
//     //     let offset = translationMatrix(c_x, c_y, c_z);
//     //     cameraTransform.multiply(offset);
//     //     let cameraPosition = new THREE.Vector3();
//     //     cameraPosition.setFromMatrixPosition(cameraTransform);
//     //     camera.position.lerp(cameraPosition, blendingFactor);
//     //     let ballPosition = new THREE.Vector3();
//     //     ballPosition.setFromMatrixPosition(player.matrix);
//     //     camera.lookAt(ballPosition);
//     // }
//     // else {
//     //     if (cLeft) {
//     //         if (currentangles.index == 0 || currentangles.index == 2) {
//     //             currentangles=perspectivesangles[currentangles.index+1 %4];
//     //         }
//     //     }
//     //     if (cRight) {
//     //         if (currentangles.index == 1 || currentangles.index == 3) {
//     //             currentangles=perspectivesangles[currentangles.index-1 %4];
//     //         }
//     //     }
//     //     if (cUp) {
//     //         if (currentangles.index == 2 || currentangles.index == 3) {
//     //             currentangles=perspectivesangles[currentangles.index-2 %4];
//     //         }
//     //     }
//     //     if (cDown) {
//     //         if (currentangles.index == 0 || currentangles.index == 1) {
//     //             currentangles=perspectivesangles[currentangles.index+2 %4];
//     //         } 
//     //     }

//     //     let offset = translationMatrix(currentangles.x, currentangles.y, currentangles.z);
//     //     cameraTransform.multiply(offset);
//     //     let cameraPosition = new THREE.Vector3();
//     //     cameraPosition.setFromMatrixPosition(cameraTransform);
//     //     camera.position.lerp(cameraPosition, blendingFactor);
//     //     let ballPosition = new THREE.Vector3();
//     //     ballPosition.setFromMatrixPosition(player.matrix);
//     //     camera.lookAt(ballPosition.x,ballPosition.y,ballPosition.z+20);
    
//     //}

//     //directional light movement
//     directionalLight.position.x=camera.position.x;
//     directionalLight.position.y=camera.position.y;
//     directionalLight.position.z=camera.position.z;

//     directionalLight.rotationX=camera.rotationX;
//     directionalLight.rotationY=camera.rotationY;
//     directionalLight.rotationZ=camera.rotationZ;


//     renderer.render(scene, camera);

//     // const ball_translation = translationMatrix(0, 0, animation_time * 3);
//     // const ball_rotationY = rotationMatrixY(rotation_angleY);
//     // const ball_rotationX = rotationMatrixX(rotation_angleX);
//     // const center = new THREE.Vector3(0,0,0);
//     // const distance = new THREE.Vector3().subVectors(center, ball_mesh.position);
//     // const adjust = translationMatrix(distance.x, distance.y, distance.z)

//     // let model_transform = new THREE.Matrix4();
//     // model_transform.multiplyMatrices(ball_translation, model_transform);
//     // model_transform.multiplyMatrices(adjust, model_transform);
//     // model_transform.multiplyMatrices(ball_rotationX, model_transform);
//     // model_transform.multiplyMatrices(ball_rotationY, model_transform);
//     // model_transform.multiplyMatrices(adjust, model_transform);
    
//     // ball_mesh.matrix.copy(model_transform);
//     // ball_mesh.matrixAutoUpdate = false;
    
//     // TODO: 2.b&2.c Update uniform values
//     // cube1_uniforms.animation_time.value = animation_time;
//     // cube2_uniforms.animation_time.value = animation_time;


// }

// init();

// // HELPER FUNCTIONS

// function checkCollision(obs, player_bounding) {
//     // Check if the box intersects with the sphere's bounding sphere
//     //console.log("Box bounding:", obs_bounding);
//     //console.log("Ball bounding:", player_bounding);

//     // if (currentLevel != 4)
//     if (obs.type == 'box')
//         if (obs.mesh.userData.obb.intersectsSphere(player_bounding)) {
//             //console.log("The box and sphere are colliding!");
//             return true;
//         }
//         else{
//             //console.log("The box and sphere are not colliding!");
//             return false;
//         }
//     else {
//         if (obs.mesh.userData.boundingSphere.intersectsSphere(player_bounding)) {
//             return true;
//         }
//         else {
//             return false;
//         } 
//     }
        
//     // {
//     //     if (obs_bounding.intersects(player_bounding)) {
//     //         console.log("The box and sphere are colliding!");
//     //         return true;
//     //     }
//     //     else{
//     //         return false;
//     //     }else
//     // }
// }

// window.addEventListener('keydown', onKeyPress);
// function onKeyPress(event) {
//     switch (event.key) {
//         case 'a':
//             moveLeft = true;
//             break;
//         case 's':
//             moveDown = true;
//             break;
//         case 'd':
//             moveRight = true;
//             break;
//         case 'w': 
//             moveUp = true;
//             break;
//         case 'ArrowLeft':
//             cLeft = true;
//             break;
//         case 'ArrowDown':
//             cDown = true;
//             break;
//         case 'ArrowRight':
//             cRight = true;
//             break;
//         case 'ArrowUp': 
//             cUp = true;
//             break;
//      }
// }

// window.addEventListener('keyup', onKeyRelease);
// function onKeyRelease(event) {
//     switch (event.key) {
//         case 'a':
//             moveLeft = false;
//             break;
//         case 's':
//             moveDown = false;
//             break;
//         case 'd':
//             moveRight = false;
//             break;
//         case 'w': 
//             moveUp = false;
//             break;
//         case 'ArrowLeft':
//             cLeft = false;
//         case 'ArrowDown':
//             cDown = false;
//             break;
//         case 'ArrowRight':
//             cRight = false;
//             break;
//         case 'ArrowUp': 
//             cUp = false;
//             break;
//         case 'p':
//             switchperspective=!switchperspective;
//     }
// }

// window.addEventListener('resize', () => {
//     renderer.setSize(window.innerWidth, window.innerHeight);
//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();
// });


