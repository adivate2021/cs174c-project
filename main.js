// main.js - Entry point for Three.js version of the CS174C Project
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ClawScene } from './claw.js';
import { HermitePath } from './three-hermite.js';
import { catmullRomTangents } from './three-catmull-rom.js';

// Make THREE and OrbitControls available globally for other modules
window.THREE = THREE;
window.OrbitControls = OrbitControls;

// Global reference to the scene instance
let clawSceneInstance = null;

// Check Three.js availability and report details
function checkThree() {
    console.log("Checking Three.js availability...");
    
    if (typeof THREE === 'undefined') {
        console.error("THREE is not defined! Make sure Three.js is loaded.");
        return false;
    }
    
    console.log("THREE is defined:", THREE.REVISION);
    
    if (typeof OrbitControls === 'undefined') {
        console.log("OrbitControls is not defined!");
        return false;
    }
    
    console.log("OrbitControls is defined");
    return true;
}

// Wait for the page to load
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded, attempting to initialize...");
    
    // Since we're using ES modules, Three.js should already be loaded
    console.log('Three.js loaded as module, initializing...');
    init();
});

function init() {
    console.log("Initializing...");
    
    if (!checkThree()) {
        console.error("Three.js check failed!");
        return;
    }
    
    try {
        // Create the claw scene instance
        clawSceneInstance = new ClawScene();
        
        console.log("ClawScene instance created");
        
        // Add window resize handler
        window.addEventListener('resize', () => {
            clawSceneInstance.onWindowResize();
        });
        
        // Load the claw machine model
        loadClawMachineModel(clawSceneInstance);
        
        // Setup controls
        createControls(clawSceneInstance);
        
        // Start animation loop
        function animate() {
            requestAnimationFrame(animate);
            
            // Update the scene
            clawSceneInstance.update();
            
            // Render the scene
            clawSceneInstance.render();
        }
        
        animate();
        
    } catch (error) {
        console.error("Error in init: ", error);
    }
}

function createControls(scene) {
    // Create controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.style.position = 'absolute';
    controlsContainer.style.top = '20px';
    controlsContainer.style.right = '20px';
    controlsContainer.style.display = 'flex';
    controlsContainer.style.flexDirection = 'column';
    controlsContainer.style.gap = '10px';
    document.body.appendChild(controlsContainer);
    
    // Shared button styles
    const buttonStyle = {
        padding: '10px 20px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        transition: 'background-color 0.3s'
    };
    
    // Create Reset button
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset Simulation';
    Object.assign(resetButton.style, buttonStyle);
    resetButton.addEventListener('click', () => {
        scene.resetSimulation();
        console.log('Simulation reset');
    });
    resetButton.addEventListener('mouseover', () => {
        resetButton.style.backgroundColor = '#45a049';
    });
    resetButton.addEventListener('mouseout', () => {
        resetButton.style.backgroundColor = '#4CAF50';
    });
    controlsContainer.appendChild(resetButton);
    
    // Create Toggle Gravity button
    const gravityButton = document.createElement('button');
    gravityButton.textContent = 'Toggle Gravity';
    gravityButton.style.backgroundColor = '#2196F3';
    Object.assign(gravityButton.style, buttonStyle, { backgroundColor: '#2196F3' });
    gravityButton.addEventListener('click', () => {
        scene.toggleGravity();
        console.log('Gravity toggled');
    });
    gravityButton.addEventListener('mouseover', () => {
        gravityButton.style.backgroundColor = '#0b7dda';
    });
    gravityButton.addEventListener('mouseout', () => {
        gravityButton.style.backgroundColor = '#2196F3';
    });
    controlsContainer.appendChild(gravityButton);
    
    // Create Move Claw button
    const clawButton = document.createElement('button');
    clawButton.textContent = 'Move Claw';
    clawButton.style.backgroundColor = '#ff9800';
    Object.assign(clawButton.style, buttonStyle, { backgroundColor: '#ff9800' });
    clawButton.addEventListener('click', () => {
        scene.moveClaw();
        console.log('Claw movement toggled');
    });
    clawButton.addEventListener('mouseover', () => {
        clawButton.style.backgroundColor = '#e68a00';
    });
    clawButton.addEventListener('mouseout', () => {
        clawButton.style.backgroundColor = '#ff9800';
    });
    controlsContainer.appendChild(clawButton);
    
    // Create Randomize Balls button
    const randomizeButton = document.createElement('button');
    randomizeButton.textContent = 'Randomize Balls';
    randomizeButton.style.backgroundColor = '#9c27b0';
    Object.assign(randomizeButton.style, buttonStyle, { backgroundColor: '#9c27b0' });
    randomizeButton.addEventListener('click', () => {
        scene.randomizeBalls();
        console.log('Balls randomized');
    });
    randomizeButton.addEventListener('mouseover', () => {
        randomizeButton.style.backgroundColor = '#7B1FA2';
    });
    randomizeButton.addEventListener('mouseout', () => {
        randomizeButton.style.backgroundColor = '#9c27b0';
    });
    controlsContainer.appendChild(randomizeButton);
    
    // Create Enable Ball Physics button
    const physicsButton = document.createElement('button');
    physicsButton.textContent = 'Enable Ball Physics';
    physicsButton.style.backgroundColor = '#E91E63';
    Object.assign(physicsButton.style, buttonStyle, { backgroundColor: '#E91E63' });
    physicsButton.addEventListener('click', () => {
        scene.enablePhysicsForAllBalls();
        console.log('Ball physics enabled - balls will now interact with each other');
    });
    physicsButton.addEventListener('mouseover', () => {
        physicsButton.style.backgroundColor = '#C2185B';
    });
    physicsButton.addEventListener('mouseout', () => {
        physicsButton.style.backgroundColor = '#E91E63';
    });
    controlsContainer.appendChild(physicsButton);
}

function loadClawMachineModel(scene) {
    console.log("Loading claw machine model...");
    
    const loader = new GLTFLoader();
    
    // Load the Claw-Island-2 model
    loader.load(
        './Claw-Island-2/scene.gltf',
        function (gltf) {
            console.log("Model loaded successfully!");
            
            // Add the model to the scene
            const combinedModel = gltf.scene;
            scene.scene.add(combinedModel);
            
            // Scale and position the model
            combinedModel.scale.set(1, 1, 1);
            combinedModel.position.set(0, 0, 0);
            
            // Apply shadows to all meshes
            combinedModel.traverse((object) => {
                if (object.isMesh) {
                    object.castShadow = true;
                    object.receiveShadow = true;
                    
                    // Debug all mesh names to help find the bird model
                    console.log(`Found mesh: ${object.name}`);
                }
            });
            
            // Add a grid helper to visualize the ground plane
            const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x888888);
            gridHelper.position.y = 0.01; // Slightly above ground
            scene.scene.add(gridHelper);
            
            // Set up the claw machine parts based on the provided coordinates
            setupClawMachine(scene, gltf.scene, {
                x: -13.05,
                y: 1.6,
                z: 22.8
            });
        },
        function (xhr) {
            console.log('Model loading: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('Error loading model:', error);
        }
    );
}

// Function to set up the claw machine parts at the specified position
function setupClawMachine(scene, modelRoot, clawPosition) {
    console.log(`Setting up claw machine at position:`, clawPosition);
    
    // Ensure clawPosition is a Vector3
    const clawPos = new THREE.Vector3(
        clawPosition.x || 0,
        clawPosition.y || 0,
        clawPosition.z || 0
    );
    
    console.log(`Converted to Vector3:`, clawPos);
    
    // Create a reference point for the claw machine
    scene.clawMachinePosition = clawPos.clone();
    
    // Add a marker sphere at the claw machine position for debugging
    const posMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true })
    );
    posMarker.position.copy(scene.clawMachinePosition);
    scene.scene.add(posMarker);
    
    // Initialize the claw machine group (for organization)
    scene.clawMachineGroup = new THREE.Group();
    scene.clawMachineGroup.position.copy(scene.clawMachinePosition);
    scene.scene.add(scene.clawMachineGroup);
    
    // Initialize the claw mechanism
    scene.clawMechanism = new THREE.Group();
    scene.clawMechanism.position.copy(scene.clawMachinePosition);
    // Move it up by the height of the claw machine
    scene.clawMechanism.position.y += 4; // Estimated height
    scene.scene.add(scene.clawMechanism);
    
    // Store the model for reference
    scene.clawMachineModel = modelRoot;
    
    // Track potential parts
    const birdMeshes = [];
    let interiorPart = null;
    let roofPart = null;
    
    // Find parts that might be the claw machine interior/roof
    modelRoot.traverse((child) => {
        if (child.isMesh) {
            // Check if this might be a bird model
            if (child.name.toLowerCase().includes('bird') || 
                child.name.toLowerCase().includes('animal') ||
                child.name.includes('Sketchfab_model.002')) {
                birdMeshes.push(child);
                console.log(`Found potential bird model: ${child.name}`);
            }
            
            // Check if this might be the interior
            if (child.name.toLowerCase().includes('interior') || 
                child.name.toLowerCase().includes('inside')) {
                interiorPart = child;
                console.log(`Found potential interior part: ${child.name}`);
            }
            
            // Check if this might be the roof
            if (child.name.toLowerCase().includes('roof') || 
                child.name.toLowerCase().includes('top') ||
                child.name.toLowerCase().includes('ceiling')) {
                roofPart = child;
                console.log(`Found potential roof part: ${child.name}`);
            }
        }
    });
    
    // Update the hermite path to match the roof
    updateHermitePathToMatchRoof(scene, roofPart, clawPos);
    
    // Handle balls and bounding box - directly call methods on the scene
    try {
        console.log("Updating machine bounds at position:", clawPos);
        scene.updateMachineBounds(clawPos);
        
        // Replace birds with found bird models
        if (birdMeshes.length > 0) {
            findAndReplaceBirds(scene, modelRoot, birdMeshes);
        }
    } catch (error) {
        console.error("Error setting up claw machine bounds:", error);
    }
}

// Helper function to find bird models in the claw machine and replace placeholders
function findAndReplaceBirds(scene, modelRoot, birdMeshes = []) {
    console.log("Finding and replacing birds...");
    
    // Try to find any bird or animal-like models
    let birdModel = null;
    
    // Log all mesh names to debug
    modelRoot.traverse((object) => {
        if (object.isMesh) {
            console.log(`Checking mesh for bird model: ${object.name}`);
        }
    });
    
    // Look for potential bird models with common names
    const birdNames = ['bird', 'animal', 'creature', 'toy', 'prize', 'sketchfab'];
    
    modelRoot.traverse((object) => {
        if (object.isMesh) {
            // Check if the object name contains any bird-like keywords
            const lowerName = object.name.toLowerCase();
            if (birdNames.some(name => lowerName.includes(name))) {
                console.log(`Found potential bird model: ${object.name}`);
                birdModel = object.parent || object; // Get the parent group if available
            }
        }
    });
    
    // If we didn't find a specific bird model, try to use any of the provided bird meshes
    if (!birdModel && birdMeshes.length > 0) {
        console.log("Using provided bird meshes instead");
        birdModel = birdMeshes[0].parent || birdMeshes[0];
    }
    
    // If we still don't have a bird model, try to create one from a simple shape
    if (!birdModel) {
        console.log("Creating simple bird model from geometries");
        birdModel = createSimpleBirdModel();
    }
    
    // If we found a bird model, use it to replace the balls
    if (birdModel) {
        console.log("Bird model found, replacing balls with birds");
        replaceBallsWithBirdModels(scene, birdModel);
    } else {
        console.log("No bird model found, keeping the balls");
    }
}

// Create a simple bird model from basic geometries
function createSimpleBirdModel() {
    // Create a group to hold the bird parts
    const birdGroup = new THREE.Group();
    
    // Create the body (sphere)
    const bodyGeometry = new THREE.SphereGeometry(0.5, 12, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x3399FF,
        shininess: 30,
        specular: 0x111111
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    birdGroup.add(body);
    
    // Create the head (smaller sphere)
    const headGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const headMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x3355FF,
        shininess: 30,
        specular: 0x111111
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0.5, 0.2, 0);
    birdGroup.add(head);
    
    // Create the beak (cone)
    const beakGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
    const beakMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFF00 });
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(0.8, 0.2, 0);
    beak.rotation.z = -Math.PI / 2;
    birdGroup.add(beak);
    
    // Create wings (flattened boxes)
    const wingGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.6);
    const wingMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2288DD,
        shininess: 10
    });
    
    // Left wing
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(0, 0.1, -0.5);
    leftWing.rotation.y = Math.PI / 6;
    birdGroup.add(leftWing);
    
    // Right wing
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0, 0.1, 0.5);
    rightWing.rotation.y = -Math.PI / 6;
    birdGroup.add(rightWing);
    
    // Create eyes (small white spheres with black pupils)
    const eyeGeometry = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(0.7, 0.3, -0.15);
    birdGroup.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.7, 0.3, 0.15);
    birdGroup.add(rightEye);
    
    // Pupils
    const pupilGeometry = new THREE.SphereGeometry(0.02, 8, 8);
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    // Left pupil
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(0.76, 0.3, -0.15);
    birdGroup.add(leftPupil);
    
    // Right pupil
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0.76, 0.3, 0.15);
    birdGroup.add(rightPupil);
    
    // Name the model for reference
    birdGroup.name = "SimpleBird";
    
    return birdGroup;
}

// Replace balls with bird models
function replaceBallsWithBirdModels(scene, birdModel) {
    if (!scene.clawScene || !scene.clawScene.toys || !birdModel) {
        console.log("No toys found to replace or no bird model available");
        return;
    }
    
    // Get a reference to the toys/balls
    const toys = scene.clawScene.toys;
    
    // Create new array to hold the birds
    const birds = [];
    
    // Create a bird model for each ball
    for (let i = 0; i < toys.length; i++) {
        const toy = toys[i];
        
        // Skip if not a ball
        if (!toy.userData.isBall) continue;
        
        // Get the ball's position and properties
        const position = toy.position.clone();
        const color = toy.material ? toy.material.color.getHex() : 0xFFFFFF;
        const name = toy.name || `Bird${i}`;
        const radius = toy.userData.radius || 0.4;
        const mass = toy.userData.mass || 1.0;
        
        // Clone the bird model
        const bird = birdModel.clone();
        
        // Scale the bird based on the ball's radius
        const scale = radius * 5; // Adjust this multiplier to get appropriate bird size
        bird.scale.set(scale, scale, scale);
        
        // Position the bird at the ball's position
        bird.position.copy(position);
        
        // Set the bird's name
        bird.name = name;
        
        // Add physics properties
        bird.userData.velocity = toy.userData.velocity ? toy.userData.velocity.clone() : new THREE.Vector3(0, 0, 0);
        bird.userData.mass = mass;
        bird.userData.radius = radius;
        bird.userData.isBird = true; // Flag to identify as a bird
        
        // Add a bounding sphere for collision detection
        bird.userData.boundingSphere = new THREE.Sphere(
            bird.position.clone(),
            radius * 1.2 // Slightly larger than the visual radius
        );
        
        // Apply random rotation to make birds look different
        bird.rotation.y = Math.random() * Math.PI * 2;
        
        // Add to scene and birds array
        scene.scene.add(bird);
        birds.push(bird);
        
        // Remove the original ball
        scene.scene.remove(toy);
        
        console.log(`Replaced ${toy.name} with bird model at (${position.x}, ${position.y}, ${position.z})`);
    }
    
    // Update the toys array to contain the birds
    scene.clawScene.toys = birds;
    
    console.log(`Replaced ${birds.length} balls with bird models`);
}

// Helper function to update the hermite path to align with the roof of the claw machine
function updateHermitePathToMatchRoof(scene, roofPart, clawPosition) {
    console.log("Updating hermite path to match roof at position:", clawPosition);
    
    // Check if we need to create a path
    if (!scene.clawPath) {
        console.log("Creating new HermitePath for claw");
        scene.clawPath = new HermitePath();
    }
    
    // Calculate the roof height - a bit below the top of the claw machine
    const roofHeight = clawPosition.y + 4.0; // Approximately 4 units above the base
    console.log(`Setting path at height ${roofHeight}`);
    
    // Create points for a path around the inside perimeter
    const pathWidth = 2.0;  // Width of the path area (X)
    const pathDepth = 2.0;  // Depth of the path area (Z)
    
    // Create points for the path centered at the claw position
    // Create a distinctly M-shaped path at the specified height
    const points = [
        new THREE.Vector3(clawPosition.x - pathWidth/2, roofHeight, clawPosition.z + pathDepth/2),
        new THREE.Vector3(clawPosition.x - pathWidth/4, roofHeight, clawPosition.z - pathDepth/4),
        new THREE.Vector3(clawPosition.x, roofHeight, clawPosition.z + pathDepth/2),
        new THREE.Vector3(clawPosition.x + pathWidth/4, roofHeight, clawPosition.z - pathDepth/4),
        new THREE.Vector3(clawPosition.x + pathWidth/2, roofHeight, clawPosition.z + pathDepth/2),
        new THREE.Vector3(clawPosition.x + pathWidth/4, roofHeight, clawPosition.z + pathDepth/3),
        new THREE.Vector3(clawPosition.x, roofHeight, clawPosition.z),
        new THREE.Vector3(clawPosition.x - pathWidth/4, roofHeight, clawPosition.z + pathDepth/3),
    ];
    
    // Calculate tangents using approximations for the hermite path
    const tangents = [];
    for (let i = 0; i < points.length; i++) {
        const prev = points[(i - 1 + points.length) % points.length];
        const next = points[(i + 1) % points.length];
        const tangent = new THREE.Vector3().subVectors(next, prev).multiplyScalar(0.5);
        tangents.push(tangent);
    }
    
    // Reset the path
    scene.clawPath.curves = [];
    
    // Add new curves based on our points and tangents
    for (let i = 0; i < points.length; i++) {
        const nextIdx = (i + 1) % points.length;
        scene.clawPath.addCurve(
            points[i], 
            points[nextIdx],
            tangents[i].clone(),
            tangents[nextIdx].clone()
        );
    }
    
    // Ensure the path has a getPointAt method for parametric traversal
    if (!scene.clawPath.getPointAt) {
        scene.clawPath.getPointAt = function(t) {
            // Ensure t is in the range [0, 1]
            t = Math.max(0, Math.min(1, t));
            
            // Calculate which curve to use
            const curveCount = this.curves.length;
            const curveIdx = Math.min(Math.floor(t * curveCount), curveCount - 1);
            const curveT = (t * curveCount) % 1;
            
            // Get the point on the specific curve
            const curve = this.curves[curveIdx];
            return curve.getPoint(curveT);
        };
    }
    
    // Create our own visual line since createVisualLine is undefined
    if (scene.clawPathLine) {
        scene.scene.remove(scene.clawPathLine);
    }
    
    // Create a line geometry by sampling points along the path
    const lineGeometry = new THREE.BufferGeometry();
    const linePoints = [];
    const numSamples = 100;
    
    // Sample points along the path
    for (let i = 0; i <= numSamples; i++) {
        const t = i / numSamples;
        const point = scene.clawPath.getPointAt(t);
        linePoints.push(point);
    }
    
    // Set the points on the line geometry
    lineGeometry.setFromPoints(linePoints);
    
    // Create a line material and mesh
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFF0000 });
    scene.clawPathLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.scene.add(scene.clawPathLine);
    
    // Position the claw mechanism at the start of the path
    if (scene.clawMechanism) {
        const pathPos = scene.clawPath.getPointAt(0);
        scene.clawMechanism.position.copy(pathPos);
        console.log("Positioned claw mechanism at start of path:", pathPos);
    }
    
    // Ensure the bounding box is properly positioned at the claw location
    if (scene.clawScene) {
        scene.clawScene.updateMachineBounds(clawPosition);
        console.log("Repositioned balls within updated bounds");
    }
}

// Position the claw machine on top of the ferris wheel
function positionClawMachineOnFerrisWheel(scene) {
    if (!scene.clawMachineGroup) {
        console.warn('Cannot position claw machine - missing required components');
        return;
    }
    
    // Get the bounding box of the claw machine
    const clawBBox = new THREE.Box3().setFromObject(scene.clawMachineGroup);
    const clawSize = new THREE.Vector3();
    clawBBox.getSize(clawSize);
    
    // Get the height of the ferris wheel if available
    const ferrisHeight = scene.ferrisWheelTop || 0;
    
    // Position the claw machine on top of the ferris wheel with offset (x=5, z=3)
    scene.clawMachineGroup.position.set(
        5,              // X offset as requested
        ferrisHeight,   // Y on top of ferris wheel
        3               // Z offset as requested
    );
    
    console.log(`Positioned claw machine at (5, ${ferrisHeight}, 3)`);
    
    // Update the claw mechanism position
    if (scene.clawMechanism) {
        // Get reference to the roof for height calculation
        let roofY = 0;
        let roofFound = false;
        
        // Try to find the roof in the model
        if (scene.clawMachineModel) {
            scene.clawMachineModel.traverse((obj) => {
                if (!roofFound && obj.isMesh && 
                    (obj.name.toLowerCase().includes('roof') || 
                     obj.name.toLowerCase().includes('ceiling') ||
                     obj.name.toLowerCase().includes('top'))) {
                    
                    // Get the bottom of the roof in world coordinates
                    const roofBox = new THREE.Box3().setFromObject(obj);
                    roofY = roofBox.min.y;
                    roofFound = true;
                    console.log(`Found roof bottom at y=${roofY}`);
                }
            });
        }
        
        // If we didn't find a roof, estimate it
        if (!roofFound) {
            // Update the base height for the claw mechanism based on machine height
            const clawOperationHeight = scene.machineHeight - 4 || 8;
            roofY = ferrisHeight + clawOperationHeight;
            console.log(`Using estimated roof height at y=${roofY}`);
        }
        
        // Update claw mechanism position
        scene.clawMechanism.position.set(
            5,         // Match the X offset
            roofY - 1, // Just below the roof
            3          // Match the Z offset
        );
    }
    
    // Update the machine boundaries for the physics to match the new position
    if (scene.machineBounds) {
        // Calculate the displacement from the original position
        const offsetX = 5;
        const offsetY = ferrisHeight;
        const offsetZ = 3;
        
        // Create a new box with displaced coordinates
        const newMin = new THREE.Vector3(
            scene.machineBounds.min.x + offsetX,
            scene.machineBounds.min.y + offsetY,
            scene.machineBounds.min.z + offsetZ
        );
        
        const newMax = new THREE.Vector3(
            scene.machineBounds.max.x + offsetX,
            scene.machineBounds.max.y + offsetY,
            scene.machineBounds.max.z + offsetZ
        );
        
        // Update the bounds
        scene.machineBounds.set(newMin, newMax);
        
        // Update the box helper
        if (scene.boxHelper) {
            scene.boxHelper.updateMatrixWorld(true);
        }
        
        console.log(`Updated machine bounds to match new position`);
    }
    
    // Update the hermite path to align with the new position
    // This is now handled separately in updateHermitePathToMatchRoof
    // which will be called after the machine is positioned
    
    console.log('Claw machine positioned on top of ferris wheel with offset (5, y, 3)');
    
    // Finally, update path to match the new roof position
    let roofPart = null;
    if (scene.clawMachineModel) {
        scene.clawMachineModel.traverse((obj) => {
            if (!roofPart && obj.isMesh && 
                (obj.name.toLowerCase().includes('roof') || 
                 obj.name.toLowerCase().includes('ceiling') ||
                 obj.name.toLowerCase().includes('top'))) {
                roofPart = obj;
            }
        });
    }
    
    // Update the path with the positioned roof
    updateHermitePathToMatchRoof(scene, roofPart, scene.clawMachinePosition);
}