// three-claw-scene.js - Main scene file for Three.js version
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ChainSim, BallPhysics, BoundingBoxCollider } from './three-physics.js';
import { HermiteCurve, HermitePath } from './three-hermite.js';
import { CatmullRomPath, catmullRomTangents } from './three-catmull-rom.js';
import { Matrix4, Quaternion, Euler } from 'three';

// Constants for the inverse kinematics
const IK_ITERATIONS = 10;
const IK_TOLERANCE = 0.01;
const IK_DAMPING = 0.5;

export class ClawScene {
    constructor() {
        // Claw movement properties - initialize before methods that might use them
        this.isClawMoving = false;
        this.claw_position = new THREE.Vector3(0, 6, 0);
        this.claw_target = new THREE.Vector3(0, 6, 0);
        this.claw_movement_t = 0;
        this.claw_movement_speed = 0.01;
        
        // Clock for animation timing
        this.clock = new THREE.Clock();
        this.clock.start();
        
        // Initialize scene and components
        this.initScene();
        this.initLights();
        this.initGround();
        this.initHermiteCurves();
        this.initCameraControls();
        this.initClawMachine();
        this.initToys();
        this.initInverseKinematics();
        this.initSimulation();
        
        // Initialize physics
        this.ballPhysics = new BallPhysics();
        
        // Store reference to the claw machine position
        this.clawMachinePosition = new THREE.Vector3(0, 0, 0);
        
        console.log("ClawScene initialized");
    }
    
    initScene() {
        // Create a scene and set a light blue background
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Light blue / sky blue
        
        // Create a camera
        this.camera = new THREE.PerspectiveCamera(
            50, 
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        // Set initial camera position
        this.camera.position.set(0, 10, 20);
        
        // Create a WebGL renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add renderer to the document
        document.body.appendChild(this.renderer.domElement);
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        // Add directional light (sun-like)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        this.scene.add(directionalLight);
        
        // Add grid for reference
        const grid = new THREE.GridHelper(50, 50, 0x808080, 0x808080);
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        this.scene.add(grid);
        
        // Store reference to the claw position
        this.claw_position = new THREE.Vector3(0, 5, 0);
        
        // Create an array to hold toys (birds)
        this.toys = [];
        
        // Initialize basic physics simulation parameters
        this.gravity = new THREE.Vector3(0, -9.8, 0); // Earth gravity
        this.isGravityEnabled = true;
        this.lastTime = performance.now() / 1000; // Convert to seconds
    }
    
    initLights() {
        // Add ambient light
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(this.ambientLight);
        
        // Add directional light (sun-like)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.directionalLight.position.set(5, 10, 7.5);
        this.directionalLight.castShadow = true;
        
        // Configure shadow properties
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 50;
        this.directionalLight.shadow.camera.left = -10;
        this.directionalLight.shadow.camera.right = 10;
        this.directionalLight.shadow.camera.top = 10;
        this.directionalLight.shadow.camera.bottom = -10;
        
        this.scene.add(this.directionalLight);
        
        // Add a point light
        this.pointLight = new THREE.PointLight(0x00ffff, 1, 100);
        this.pointLight.position.set(-5, 5, -5);
        this.scene.add(this.pointLight);
    }
    
    initGround() {
        // Create ground plane
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x999999,
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = Math.PI / 2;
        this.ground.position.y = 0;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        
        // Create grid helper
        this.gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x888888);
        this.scene.add(this.gridHelper);
        
        // Create axis helper (x=red, y=green, z=blue)
        this.axesHelper = new THREE.AxesHelper(5);
        this.scene.add(this.axesHelper);
    }
    
    initHermiteCurves() {
        // This method will just initialize the path variables but won't create paths
        // The actual path creation will be handled by updateHermitePathToMatchRoof
        
        // Initialize variables for later use - but don't create actual paths yet
        this.clawOperationHeight = 8; // Default height for claw operation
        
        // We won't create actual path points here anymore
        // This prevents duplicate paths from appearing at the origin
        
        console.log("Initialized hermite curve variables (path will be created at claw machine position)");
    }
    
    initSimulation() {
        // Create chain simulation
        this.chainSim = new ChainSim(this.scene);
        
        // Position the chain to start from the claw position
        this.updateClawPosition(this.claw_position);
    }
    
    updateClawPosition(position) {
        // Add null check for position
        if (!position) {
            console.warn('updateClawPosition called with undefined position');
            return;
        }
        
        // Update the claw position
        if (this.claw_position) {
            this.claw_position.copy(position);
        } else {
            console.warn('claw_position is undefined');
            this.claw_position = position.clone();
        }
        
        // Apply inverse kinematics to move the claw parts
        if (this.ikEnabled && this.ikJoints.length > 0) {
            this.solveIK(position);
        }
        
        // Update chain base position
        if (this.chainSim && this.chainSim.chainSim && 
            this.chainSim.chainSim.particles && 
            this.chainSim.chainSim.particles.length > 0) {
            
            this.chainSim.chainSim.particles[0].pos.copy(position);
            this.chainSim.chainSim.particles[0].updateMesh();
            
            // Update all springs
            for (const spring of this.chainSim.chainSim.springs) {
                spring.updateLine();
            }
        }
    }
    
    initCameraControls() {
        try {
            // Create orbit controls
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.25;
            this.controls.screenSpacePanning = false;
            this.controls.maxPolarAngle = Math.PI / 2;
        } catch (error) {
            console.error("Error initializing controls:", error);
        }
    }
    
    initClawMachine() {
        console.log("Initializing claw machine...");
        
        // Machine properties
        this.machineHeight = 10;
        
        // Initialize the bounding box properties but don't create the actual box yet
        // The actual box will be created in updateMachineBounds with the correct position
        this.machineBoundsInitialized = false;
    }
    
    initToys() {
        console.log("Initializing toys with direct positioning");
        
        // Initialize empty toys array
        this.toys = [];
        
        // Create the balls directly using absolute positions
        // These positions are placed in the left-back quadrant of the machine
        // based on the known position of the machine at (-13.05, 1.6, 22.8)
        this.createDirectBalls();
    }
    
    // Direct method to create balls at specific positions
    createDirectBalls(enablePhysics = true) {
        // Clear any existing toys to avoid duplicates
        if (this.toys && this.toys.length > 0) {
            this.toys.forEach(toy => {
                if (toy && this.scene.children.includes(toy)) {
                    this.scene.remove(toy);
                }
            });
            this.toys = [];
        }
        
        // Create a barrier to prevent balls from rolling into the glass hole
        this.createLargeBarrier();
        
        // Use a verified stable position as our reference point - adjusted to be safely within bounds
        const stableX = -14.4;   // Moved right to avoid left boundary (-14.95)
        const stableY = 2.9;     // Just above the floor level
        const stableZ = 21.5;    // Moved forward to avoid back boundary (20.9)
        
        // Create a tight 3x3 grid with consistent spacing, ensuring all positions are within bounds
        const ballAbsolutePositions = [
            [stableX,       stableY, stableZ],          // Row 1, Col 1
            [stableX,       stableY, stableZ + 0.7],    // Row 1, Col 2
            [stableX,       stableY, stableZ + 1.4],    // Row 1, Col 3
            [stableX + 0.7, stableY, stableZ],          // Row 2, Col 1
            [stableX + 0.7, stableY, stableZ + 0.7],    // Row 2, Col 2
            [stableX + 0.7, stableY, stableZ + 1.4],    // Row 2, Col 3
            [stableX + 1.4, stableY, stableZ],          // Row 3, Col 1
            [stableX + 1.4, stableY, stableZ + 0.7]     // Row 3, Col 2
        ];
        
        // Vibrant colors for the balls
        const ballColors = [
            0xFF0000, // Bright red
            0x00FF00, // Bright green
            0x0000FF, // Bright blue
            0xFFFF00, // Bright yellow
            0xFF00FF, // Bright magenta
            0x00FFFF, // Cyan
            0xFF8000, // Orange
            0x8000FF  // Purple
        ];
        
        // Ball names
        const ballNames = [
            "RedBall",
            "GreenBall", 
            "BlueBall",
            "YellowBall",
            "MagentaBall",
            "CyanBall",
            "OrangeBall",
            "PurpleBall"
        ];
        
        // Create each ball with a shiny material
        for (let i = 0; i < ballAbsolutePositions.length; i++) {
            const position = ballAbsolutePositions[i];
            
            const ball = this.createBall(
                position,
                ballColors[i],
                ballNames[i],
                0.35 + (i * 0.03),  // Slightly different sizes
                true  // This is an absolute position
            );
            
            // Double check the ball was created and is in the scene
            if (ball) {
                // Set initial physics state (immobile or with random velocity)
                if (enablePhysics) {
                    // Enable physics with random initial velocities
                    ball.userData.isImmobile = false;
                    ball.userData.velocity.set(
                        (Math.random() - 0.5) * 2.0,  // Random X velocity
                        Math.random() * 0.5,          // Small upward Y velocity
                        (Math.random() - 0.5) * 2.0   // Random Z velocity
                    );
                } else {
                    // Make balls immobile by default - they'll only move when grabbed
                    ball.userData.velocity.set(0, 0, 0);
                    ball.userData.isImmobile = true; // Flag to mark as immobile
                }
            }
        }
        
        return this.toys.length;
    }
    
    // Create a larger barrier wall to separate the glass hole area
    createLargeBarrier() {
        // Glass hole is around (-12, 3, 24)
        // Create a large barrier wall between the glass hole and the rest of the machine
        const barrierGeometry = new THREE.BoxGeometry(3.0, 1.0, 0.2);
        const barrierMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x555555,
            transparent: true,
            opacity: 0.0, // Set opacity to 0 to make it invisible
            visible: false // Additionally set visible to false for better performance
        });
        
        const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
        
        // Position the barrier as a large wall in front of the glass hole
        barrier.position.set(-13.5, 3.0, 23.0); // Positioned on the floor, creating a wall
        barrier.rotation.y = Math.PI / 6; // Angled to better block access to the glass hole
        
        // Add physics properties
        barrier.userData.isStatic = true; // Static object, won't move
        barrier.userData.isBarrier = true; // Mark as barrier for collision detection
        
        // Add to scene
        this.scene.add(barrier);
        this.barrier = barrier;
        
        // The barrier is now invisible but will still handle collisions
    }
    
    // Method to update the machine bounds to match the claw machine
    updateMachineBounds(clawPosition) {
        console.log("Updating machine bounds at position:", clawPosition);
        
        // Save reference to the claw machine position
        this.clawMachinePosition = clawPosition.clone();
        
        // Create bounds around the provided claw machine position
        const boundsSize = 1.9; // Size of the bounding box (half-width)
        const boundsHeight = 5.0;  // Height of the bounding box
        
        // The floor of the claw machine is visually at Y = 2.1 (clawPosition.y + 0.5)
        const floorY = clawPosition.y + 1.25;
        
        // Remove any existing box helpers to prevent duplicates
        if (this.boxHelper) {
            this.scene.remove(this.boxHelper);
            this.boxHelper = null;
        }
        
        // Create a bounding box centered at the claw position
        if (!this.machineBoundsCollider) {
            // Create machine bounds collider
            this.machineBoundsCollider = new BoundingBoxCollider(
                new THREE.Vector3(
                    clawPosition.x - boundsSize,
                    floorY, // Set Y to match the visual floor
                    clawPosition.z - boundsSize
                ),
                new THREE.Vector3(
                    clawPosition.x + boundsSize,
                    floorY + boundsHeight, // Height from the floor
                    clawPosition.z + boundsSize
                )
            );
            this.scene.add(this.machineBoundsCollider.helper);
        } else {
            // Update existing bounds
            this.machineBoundsCollider.setFromMinMax(
                new THREE.Vector3(
                    clawPosition.x - boundsSize,
                    floorY, // Set Y to match the visual floor
                    clawPosition.z - boundsSize
                ),
                new THREE.Vector3(
                    clawPosition.x + boundsSize,
                    floorY + boundsHeight, // Height from the floor
                    clawPosition.z + boundsSize
                )
            );
            
            // Make sure the helper is updated
            this.machineBoundsCollider.updateHelper();
        }
        
        // Get a reference to the Box3 for convenience
        this.machineBounds = this.machineBoundsCollider.box;
        
        console.log(`Created machine bounds at position: (${clawPosition.x}, ${clawPosition.y}, ${clawPosition.z})`);
        console.log(`Bounds size: ${boundsSize*2} x ${boundsHeight} x ${boundsSize*2}`);
        console.log(`Floor level set to Y = ${floorY}`);
        
        // Mark as initialized to prevent duplicates
        this.machineBoundsInitialized = true;
        
        // Create a glass hole bounding box (smaller box for the prize retrieval hole)
        this.createGlassHoleBounds(clawPosition);
        
        // Reposition the birds/balls within bounds
        this.repositionBirdsInBounds();
        
        // Add a visual marker at the claw position for debugging
        if (!this.positionMarker) {
            this.positionMarker = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
            );
            this.scene.add(this.positionMarker);
        }
        this.positionMarker.position.copy(clawPosition);
    }
    
    // Create a bounding box for the glass hole in the claw machine
    createGlassHoleBounds(clawPosition) {
        console.log("Creating glass hole bounds at position:", clawPosition);
        
        // Size of the glass hole - small square opening
        const holeWidth = 1.35;   // Width of the hole
        const holeHeight = 0.9;  // Height of the hole
        const holeDepth = 1.35;   // Depth of the hole
        const zOffset = 1.2;
        const xOffset = 1.15;
        
        // Position the hole at the front of the machine (positive Z)
        const holeY = clawPosition.y + 1.3; // Slightly above the base
        
        // Creating a direct THREE.Box3 for debugging first
        const glassBox = new THREE.Box3(
            new THREE.Vector3(
                clawPosition.x + xOffset - holeWidth/2,
                holeY,
                clawPosition.z + zOffset - holeDepth/2
            ),
            new THREE.Vector3(
                clawPosition.x + xOffset + holeWidth/2,
                holeY + holeHeight,
                clawPosition.z + zOffset + holeDepth/2
            )
        );
        
        // Create a direct box helper to ensure visibility
        if (this.glassBoxHelper) {
            this.scene.remove(this.glassBoxHelper);
        }
        
        this.glassBoxHelper = new THREE.Box3Helper(glassBox, 0x00FFFF);
        this.scene.add(this.glassBoxHelper);
        
        // Create visible walls for the glass hole (except top)
        this.createGlassHoleWalls(glassBox);
        
        // Store the box for collision detection
        this.glassHoleBounds = glassBox;
        
        // Initialize or reset the array to track balls in the glass hole
        this.ballsInGlassHole = [];
        
        // Add a text display for number of balls in glass hole
        this.updateGlassHoleText();
        
        console.log(`Glass hole box created at: 
            Min: (${glassBox.min.x.toFixed(2)}, ${glassBox.min.y.toFixed(2)}, ${glassBox.min.z.toFixed(2)})
            Max: (${glassBox.max.x.toFixed(2)}, ${glassBox.max.y.toFixed(2)}, ${glassBox.max.z.toFixed(2)})`);
    }
    
    // Create visible walls for the glass hole (except top)
    createGlassHoleWalls(glassBox) {
        // Remove existing walls if any
        if (this.glassHoleWalls) {
            this.glassHoleWalls.forEach(wall => {
                this.scene.remove(wall);
            });
        }
        
        this.glassHoleWalls = [];
        
        // Calculate dimensions
        const width = glassBox.max.x - glassBox.min.x;
        const height = glassBox.max.y - glassBox.min.y;
        const depth = glassBox.max.z - glassBox.min.z;
        
        // Create semi-transparent material for walls
        const wallMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FFFF,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        // Left wall (X-min)
        const leftWall = new THREE.Mesh(
            new THREE.PlaneGeometry(depth, height),
            wallMaterial
        );
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(
            glassBox.min.x,
            glassBox.min.y + height / 2,
            glassBox.min.z + depth / 2
        );
        this.scene.add(leftWall);
        this.glassHoleWalls.push(leftWall);
        
        // Right wall (X-max)
        const rightWall = new THREE.Mesh(
            new THREE.PlaneGeometry(depth, height),
            wallMaterial
        );
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.position.set(
            glassBox.max.x,
            glassBox.min.y + height / 2,
            glassBox.min.z + depth / 2
        );
        this.scene.add(rightWall);
        this.glassHoleWalls.push(rightWall);
        
        // Bottom wall (Y-min)
        const bottomWall = new THREE.Mesh(
            new THREE.PlaneGeometry(width, depth),
            wallMaterial
        );
        bottomWall.rotation.x = -Math.PI / 2;
        bottomWall.position.set(
            glassBox.min.x + width / 2,
            glassBox.min.y,
            glassBox.min.z + depth / 2
        );
        this.scene.add(bottomWall);
        this.glassHoleWalls.push(bottomWall);
        
        // Front wall (Z-max)
        const frontWall = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            wallMaterial
        );
        frontWall.rotation.y = Math.PI;
        frontWall.position.set(
            glassBox.min.x + width / 2,
            glassBox.min.y + height / 2,
            glassBox.max.z
        );
        this.scene.add(frontWall);
        this.glassHoleWalls.push(frontWall);
        
        // Back wall (Z-min)
        const backWall = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            wallMaterial
        );
        backWall.position.set(
            glassBox.min.x + width / 2,
            glassBox.min.y + height / 2,
            glassBox.min.z
        );
        this.scene.add(backWall);
        this.glassHoleWalls.push(backWall);
        
        // NO TOP WALL - balls can enter from the top
    }
    
    // Update the text display showing how many balls are collected
    updateGlassHoleText() {
        // Initialize tracking array if needed
        if (!this.ballsInGlassHole) {
            this.ballsInGlassHole = [];
        }
        
        // Initialize collected count if needed
        if (!this.collectedBallsCount) {
            this.collectedBallsCount = 0;
        }
        
        // Only show the collected balls count as requested
        const text = `Balls: ${this.collectedBallsCount}`;
        console.log(text);
        
        // Create or update the canvas texture for the text
        if (!this.ballCountCanvas) {
            // Create a canvas for the text texture
            this.ballCountCanvas = document.createElement('canvas');
            this.ballCountCanvas.width = 512;
            this.ballCountCanvas.height = 128;
            
            // Create a texture from the canvas
            this.ballCountTexture = new THREE.CanvasTexture(this.ballCountCanvas);
            
            // Create a material using the texture
            this.ballCountMaterial = new THREE.MeshBasicMaterial({
                map: this.ballCountTexture,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide
            });
            
            // Create a plane to display the text
            this.ballCountPlane = new THREE.Mesh(
                new THREE.PlaneGeometry(2, 0.5),
                this.ballCountMaterial
            );
            
            // Add to the scene
            this.scene.add(this.ballCountPlane);
        }
        
        // Update the text on the canvas
        const ctx = this.ballCountCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.ballCountCanvas.width, this.ballCountCanvas.height);
        
        // Set stylish text properties
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.ballCountCanvas.width, this.ballCountCanvas.height);
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Create a gradient for text
        const gradient = ctx.createLinearGradient(0, 0, this.ballCountCanvas.width, 0);
        gradient.addColorStop(0, '#00FFFF');  // Cyan
        gradient.addColorStop(0.5, '#FFFFFF'); // White
        gradient.addColorStop(1, '#00FFFF');  // Cyan
        ctx.fillStyle = gradient;
        
        // Draw the text
        ctx.fillText(text, this.ballCountCanvas.width/2, this.ballCountCanvas.height/2);
        
        // Update the texture
        this.ballCountTexture.needsUpdate = true;
        
        // Position the text above the glass hole
        if (this.glassHoleBounds && this.ballCountPlane) {
            // Get the center of the glass hole
            const center = new THREE.Vector3();
            this.glassHoleBounds.getCenter(center);
            
            // Position slightly above the glass hole
            this.ballCountPlane.position.set(
                center.x,
                center.y + 1.5, // Above the glass hole
                center.z
            );
            
            // Face the camera
            this.ballCountPlane.lookAt(this.camera.position);
        }
    }
    
    // Check if a ball is inside the glass hole and update the tracking array
    checkBallInGlassHole(ball) {
        // Skip if no glass hole bounds or the ball doesn't have a bounding sphere
        if (!this.glassHoleBounds || !ball.userData.boundingSphere) {
            return false;
        }
        
        // If the ball is still immobile, it's in the safe area - don't check for glass hole
        if (ball.userData.isImmobile && !ball.userData.isGrabbed) {
            return false;
        }

        // Skip checking if the ball is already in the list of balls in glass hole
        if (this.ballsInGlassHole.includes(ball)) {
            // Check if we should remove the ball if it's deeply inside and touching the bottom
            const distanceFromBottom = ball.position.y - (this.glassHoleBounds.min.y + ball.userData.radius);
            
            // Only remove if ball is settled and fully contained
            if (distanceFromBottom < 0.15 && 
                ball.position.x > this.glassHoleBounds.min.x + ball.userData.radius &&
                ball.position.x < this.glassHoleBounds.max.x - ball.userData.radius &&
                ball.position.z > this.glassHoleBounds.min.z + ball.userData.radius &&
                ball.position.z < this.glassHoleBounds.max.z - ball.userData.radius) {
                
                // Get the ball's velocity magnitude
                const velocityMagnitude = ball.userData.velocity.length();
                
                // Only remove if the ball is almost stopped (very low velocity)
                if (velocityMagnitude < 0.1) {
                    console.log(`Ball ${ball.name} is fully contained and touching bottom - removing it`);
                    this.removeBall(ball);
                    return true;
                }
            }
            return true;
        }

        // Check if the ball's bounding sphere intersects with the glass hole box
        const isInGlassHole = ball.userData.boundingSphere.intersectsBox(this.glassHoleBounds);
        
        if (isInGlassHole) {
            console.log(`Ball ${ball.name} entered the glass hole. Total balls inside: ${this.ballsInGlassHole.length}`);
            this.ballsInGlassHole.push(ball);
            this.updateGlassHoleText();
            return true;
        }
        
        return false;
    }
    
    // Remove a ball from the scene and tracking arrays
    removeBall(ball) {
        if (!ball) return;
        
        console.log(`Removing ball ${ball.name} that touched the bottom of the glass hole`);
        
        // Remove from scene
        this.scene.remove(ball);
        
        // Remove from ballsInGlassHole array if present
        this.ballsInGlassHole = this.ballsInGlassHole.filter(b => b !== ball);
        
        // Remove from toys array
        this.toys = this.toys.filter(b => b !== ball);
        
        // Store the ball in removedBalls array for potential respawn
        if (!this.removedBalls) this.removedBalls = [];
        this.removedBalls.push({
            color: ball.material.color.getHex(),
            name: ball.name,
            radius: ball.userData.radius || 0.4
        });
        
        // Increment total balls collected counter
        if (!this.collectedBallsCount) this.collectedBallsCount = 0;
        this.collectedBallsCount++;
        
        // Update the display text to show total collected
        this.updateGlassHoleText();
        
        // Create a small visual effect to indicate removal
        this.createRemovalEffect(ball.position.clone());
    }
    
    // Create a visual effect when a ball is removed
    createRemovalEffect(position) {
        // Create a small particle effect at the position where the ball was removed
        const particles = new THREE.Group();
        
        // Create 8 small spheres that will expand outward
        for (let i = 0; i < 8; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0x00FFFF, transparent: true, opacity: 0.7 })
            );
            
            // Random direction for particle
            const angle = Math.random() * Math.PI * 2;
            const elevation = Math.random() * Math.PI - Math.PI/2;
            const direction = new THREE.Vector3(
                Math.cos(angle) * Math.cos(elevation),
                Math.sin(elevation),
                Math.sin(angle) * Math.cos(elevation)
            );
            
            // Set initial position
            particle.position.copy(position);
            
            // Store velocity for animation
            particle.userData.velocity = direction.multiplyScalar(0.1);
            particle.userData.lifetime = 1.0; // 1 second lifetime
            
            particles.add(particle);
        }
        
        this.scene.add(particles);
        
        // Store the particles group for animation
        if (!this.removalEffects) this.removalEffects = [];
        this.removalEffects.push({
            group: particles,
            createdAt: Date.now()
        });
    }
    
    // Update removal effects in the animation loop
    updateRemovalEffects(dt) {
        if (!this.removalEffects || this.removalEffects.length === 0) return;
        
        const now = Date.now();
        const effectsToRemove = [];
        
        for (const effect of this.removalEffects) {
            const age = (now - effect.createdAt) / 1000; // Age in seconds
            
            if (age > 1.0) { // Remove effects older than 1 second
                effectsToRemove.push(effect);
                continue;
            }
            
            // Update each particle in the effect
            effect.group.children.forEach(particle => {
                // Move particle
                particle.position.addScaledVector(particle.userData.velocity, dt);
                
                // Fade out
                particle.material.opacity = 0.7 * (1 - age);
                
                // Expand slightly
                particle.scale.multiplyScalar(1.01);
            });
        }
        
        // Remove old effects
        for (const effect of effectsToRemove) {
            this.scene.remove(effect.group);
            this.removalEffects = this.removalEffects.filter(e => e !== effect);
        }
    }
    
    // Method to reposition birds within the bounding box
    repositionBirdsInBounds() {
        if (!this.toys || !this.machineBounds) {
            return;
        }
        
        // Use the same safe reference point for consistency across methods
        const stableX = -14.4;   // Moved right to avoid left boundary (-14.95)
        const stableY = 2.9;     // Just above the floor level
        const stableZ = 21.5;    // Moved forward to avoid back boundary (20.9)
        
        // Create the same grid of positions used in other methods
        const positions = [
            [stableX,       stableY, stableZ],          // Row 1, Col 1
            [stableX,       stableY, stableZ + 0.7],    // Row 1, Col 2
            [stableX,       stableY, stableZ + 1.4],    // Row 1, Col 3
            [stableX + 0.7, stableY, stableZ],          // Row 2, Col 1
            [stableX + 0.7, stableY, stableZ + 0.7],    // Row 2, Col 2
            [stableX + 0.7, stableY, stableZ + 1.4],    // Row 2, Col 3
            [stableX + 1.4, stableY, stableZ],          // Row 3, Col 1
            [stableX + 1.4, stableY, stableZ + 0.7]     // Row 3, Col 2
        ];
        
        // Keep track of how many balls we've repositioned
        let count = 0;
        
        this.toys.forEach((toy) => {
            if (toy.userData && toy.userData.isBall) {
                if (count < positions.length) {
                    // Get the next position from our predefined grid
                    const position = positions[count];
                    
                    // Set the position
                    toy.position.set(position[0], position[1], position[2]);
                    
                    // Reset velocity
                    toy.userData.velocity.set(0, 0, 0);
                    
                    // Update bounding sphere
                    toy.userData.boundingSphere.center.copy(toy.position);
                } else {
                    // For any additional balls beyond our grid, use a random position
                    this.resetBallPosition(toy);
                }
                count++;
            }
        });
    }
    
    // Create an individual ball with specific position, color, and name
    createBall(position, color, name, size = 0.4, isAbsolutePosition = false) {
        console.log(`==== CREATING BALL: ${name} ====`);
        console.log(`Position input: ${JSON.stringify(position)}, isAbsolutePosition: ${isAbsolutePosition}`);
        
        // Create a shiny ball
        const ballGeometry = new THREE.SphereGeometry(size, 32, 32);
        console.log(`Created ball geometry with size: ${size}`);
        
        const ballMaterial = new THREE.MeshPhongMaterial({ 
            color: color,
            specular: 0xFFFFFF,
            shininess: 100,
            emissive: new THREE.Color(color).multiplyScalar(0.2)
        });
        console.log(`Created ball material with color: 0x${color.toString(16).padStart(6, '0')}`);
        
        const ball = new THREE.Mesh(ballGeometry, ballMaterial);
        
        // Check if position is an array or Vector3
        let x, y, z;
        if (Array.isArray(position)) {
            [x, y, z] = position;
        } else if (position instanceof THREE.Vector3) {
            x = position.x;
            y = position.y;
            z = position.z;
            isAbsolutePosition = true; // If passing a Vector3, assume it's already an absolute position
        } else {
            console.error("Invalid position format for createBall:", position);
            return null;
        }
        
        // Set the ball position
        if (this.clawMachinePosition && !isAbsolutePosition) {
            // If we have a clawMachinePosition and the position is relative, add the offset
            ball.position.set(
                this.clawMachinePosition.x + x,
                this.clawMachinePosition.y + y,
                this.clawMachinePosition.z + z
            );
            console.log(`Set relative position: (${ball.position.x.toFixed(2)}, ${ball.position.y.toFixed(2)}, ${ball.position.z.toFixed(2)})`);
        } else {
            // Use the position directly (either absolute or we don't have a clawMachinePosition)
            ball.position.set(x, y, z);
            console.log(`Set absolute position: (${ball.position.x.toFixed(2)}, ${ball.position.y.toFixed(2)}, ${ball.position.z.toFixed(2)})`);
        }
        
        ball.name = name;
        console.log(`Set ball name: ${name}`);
        
        // Add a bounding sphere for collision detection
        ball.userData.boundingSphere = new THREE.Sphere(
            ball.position.clone(),
            size * 1.05  // Slightly larger than the visual radius
        );
        console.log(`Created bounding sphere at: (${ball.userData.boundingSphere.center.x.toFixed(2)}, ${ball.userData.boundingSphere.center.y.toFixed(2)}, ${ball.userData.boundingSphere.center.z.toFixed(2)}) with radius: ${ball.userData.boundingSphere.radius.toFixed(2)}`);
        
        // Add physics properties
        ball.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,  // Small random initial velocity
            0,
            (Math.random() - 0.5) * 0.1
        );
        ball.userData.mass = 0.8 + Math.random() * 0.4;  // Slightly different masses
        ball.userData.radius = size;  // Store the radius for physics
        ball.userData.isBall = true;  // Flag to identify as a ball
        console.log(`Added physics properties: mass=${ball.userData.mass.toFixed(2)}, radius=${ball.userData.radius.toFixed(2)}, isBall=true`);
        
        // Add physical properties for rendering
        ball.castShadow = true;
        ball.receiveShadow = true;
        
        // Ensure the ball is visible
        ball.visible = true;
        ball.material.visible = true;
        ball.material.needsUpdate = true;
        
        // Add to scene and toys array
        this.scene.add(ball);
        console.log(`Added ball to scene. Scene children count: ${this.scene.children.length}`);
        
        // Print array indexes to validate
        const ballIndex = this.scene.children.findIndex(obj => obj === ball);
        console.log(`Ball index in scene children: ${ballIndex}`);
        
        this.toys.push(ball);
        console.log(`Added ball to toys array. Toys count: ${this.toys.length}`);
        
        // Print all toys for validation
        console.log("Current toys in scene:");
        this.toys.forEach((toy, index) => {
            console.log(`  ${index}: ${toy.name} at (${toy.position.x.toFixed(2)}, ${toy.position.y.toFixed(2)}, ${toy.position.z.toFixed(2)}), visible: ${toy.visible}`);
        });
        
        console.log(`Created ${name} at (${ball.position.x.toFixed(2)}, ${ball.position.y.toFixed(2)}, ${ball.position.z.toFixed(2)})`);
        console.log(`==== BALL CREATION COMPLETE ====`);
        
        return ball;
    }
    
    // Main update loop
    update() {
        // Get time since last frame
        const time = this.clock.getElapsedTime();
        const deltaTime = this.clock.getDelta();
        
        // Apply animation mixer update for skeletal animations
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        
        // Update claw position along the Hermite path if animation is active
        if (this.isClawMoving) {
            // Update path parameter based on time
            this.pathT = Math.min(this.pathT + deltaTime * 0.1, 1.0);
            if (this.pathT >= 1.0) {
                this.isClawMoving = false;
            }
            
            // Move along the path
            const position = this.clawPath.getPointAt(this.pathT);
            this.updateClawPosition(position);
            
            // Update IK if we have a target
            const targetPos = this.clawMechanism.position.clone().add(new THREE.Vector3(0, -2, 0));
            this.solveIK(targetPos);
        }
        
        // Update toy physics
        this.updateToyPhysics(deltaTime, time);
        
        // Check for balls in the glass hole
        if (this.toys && this.toys.length > 0 && this.glassHoleBounds) {
            for (const toy of this.toys) {
                if (toy && toy.userData && toy.userData.isBall) {
                    this.checkBallInGlassHole(toy);
                }
            }
        }
        
        // Update particle effects for ball removal
        this.updateRemovalEffects(deltaTime);
        
        // Update glass hole text
        this.updateGlassHoleText();
        
        // Render the scene
        this.render();
    }
    
    updateToyPhysics(dt, time) {
        // Skip if no toys or physics engine
        if (!this.toys || !this.ballPhysics) {
            console.warn("Physics update skipped: no toys or physics engine");
            return;
        }
        
        // Log the first physics update for debugging
        if (!this.hasLoggedFirstPhysics) {
            console.log(`==== FIRST PHYSICS UPDATE ====`);
            console.log(`Toys count: ${this.toys.length}`);
            console.log(`Physics engine: ${this.ballPhysics ? 'Available' : 'Missing'}`);
            console.log(`Delta time: ${dt.toFixed(4)}s`);
            this.hasLoggedFirstPhysics = true;
        }
        
        const clawMachinePos = this.clawMachinePosition;
        
        // Avoid extremely small or very large delta times - can cause physics instability
        const safeDt = Math.min(Math.max(dt, 0.0016), 0.032); // Clamp between 1.6ms and 32ms
        
        // Store glass hole box for fast access
        const glassBox = this.glassHoleBounds;
        
        // Log physics status every 10 seconds
        if (Math.floor(time) % 10 === 0 && Math.floor(time) !== this.lastPhysicsLog) {
            this.lastPhysicsLog = Math.floor(time);
            console.log(`==== PHYSICS STATUS at ${time.toFixed(1)}s ====`);
            console.log(`Active toys: ${this.toys.length}`);
            
            // Check positions of all toys
            this.toys.forEach((toy, index) => {
                if (toy && toy.userData && toy.userData.velocity) {
                    console.log(`Toy ${index}: ${toy.name} at (${toy.position.x.toFixed(1)}, ${toy.position.y.toFixed(1)}, ${toy.position.z.toFixed(1)})`);
                    console.log(`  Velocity: (${toy.userData.velocity.x.toFixed(2)}, ${toy.userData.velocity.y.toFixed(2)}, ${toy.userData.velocity.z.toFixed(2)})`);
                    console.log(`  Visible: ${toy.visible}, In scene: ${this.scene.children.includes(toy)}, Immobile: ${toy.userData.isImmobile || false}`);
                }
            });
            
            console.log(`==== END PHYSICS STATUS ====`);
        }
        
        // First pass - handle ball-to-ball collisions
        for (let i = 0; i < this.toys.length; i++) {
            for (let j = i + 1; j < this.toys.length; j++) {
                if (this.toys[i] && this.toys[j]) {
                    // Check if both toys have needed properties for collision
                    if (!this.toys[i].userData || !this.toys[j].userData || 
                        !this.toys[i].userData.boundingSphere || !this.toys[j].userData.boundingSphere ||
                        !this.toys[i].userData.velocity || !this.toys[j].userData.velocity) {
                        continue;
                    }
                    
                    // Apply the collision handling
                    this.ballPhysics.handleBallCollision(this.toys[i], this.toys[j]);
                }
            }
        }
        
        // Second pass - update positions and handle box collisions
        for (const toy of this.toys) {
            // Skip items without physics properties
            if (!toy || !toy.userData || !toy.userData.velocity) {
                continue;
            }
            
            // Skip processing if the toy is not visible or not in the scene
            if (!toy.visible || !this.scene.children.includes(toy)) {
                continue;
            }
            
            // If the ball is marked as immobile and not being grabbed by the claw, skip physics
            if (toy.userData.isImmobile && !toy.userData.isGrabbed) {
                // Reset velocity to zero to be safe
                toy.userData.velocity.set(0, 0, 0);
                continue;
            }
            
            // Store a reference to the boxes the ball is in contact with for continuous collision detection
            toy._lastCollider = {
                box: this.machineBounds,
                glassBox: glassBox
            };
            
            // Apply basic physics (gravity, position update, damping)
            this.ballPhysics.updateBallPhysics(toy, safeDt);
            
            // Handle collisions with the main machine bounds - return value indicates if collision happened
            let hasMainCollision = false;
            if (this.machineBounds) {
                hasMainCollision = this.ballPhysics.handleBoxCollision(toy, this.machineBounds);
            }
            
            // Handle collision with the barrier if it exists
            if (this.barrier) {
                this.handleBarrierCollision(toy);
            }
            
            // Get the ball's bounding sphere
            const sphere = toy.userData.boundingSphere;
            if (!sphere) continue;
            
            // Always check for glass hole collisions - don't skip based on main collision
            // This provides stronger guarantee against phasing through walls
            if (glassBox) {
                this.ballPhysics.handleGlassHoleCollision(toy, glassBox);
                
                // Also check if it's in the glass hole for tracking purposes
                this.checkBallInGlassHole(toy);
            }
            
            // Safety check - if ball somehow got extremely far away (50 units is huge)
            // This should only happen if there's a bug in the collision detection
            const distanceFromCenter = toy.position.distanceTo(clawMachinePos);
            if (distanceFromCenter > 50) {
                // Place it back in the machine with zero velocity to avoid further issues
                this.resetBallPosition(toy);
                toy.userData.velocity.set(0, 0, 0);
            }
            
            // If ball falls below the floor, reset it
            if (toy.position.y < 2.5) { // Floor is around y=2.85
                this.resetBallPosition(toy);
            }
            
            // Apply velocity limiting to extremely fast balls for stability
            const velocity = toy.userData.velocity;
            const speedSquared = velocity.lengthSq();
            if (speedSquared > 100) { // 10^2 = max speed of 10 units/s
                velocity.multiplyScalar(10 / Math.sqrt(speedSquared));
            }
            
            // Apply additional damping to balls inside the glass hole to help them settle
            if (glassBox && this.ballsInGlassHole.includes(toy)) {
                // If the ball is in the glass hole and close to the bottom, apply extra damping
                const distanceFromBottom = toy.position.y - (glassBox.min.y + sphere.radius);
                if (distanceFromBottom < 0.2) {
                    // Apply strong damping to help balls come to rest at the bottom
                    toy.userData.velocity.multiplyScalar(0.85);
                    
                    // Apply extra friction to horizontal velocity components
                    toy.userData.velocity.x *= 0.7;
                    toy.userData.velocity.z *= 0.7;
                }
            }
        }
    }
    
    // Reset a ball's position to be inside the machine
    resetBallPosition(ball) {
        // Use a verified stable position as our reference point - adjusted to be safely within bounds
        const stableX = -14.4;   // Moved right to avoid left boundary (-14.95)
        const stableY = 2.9;     // Just above the floor level
        const stableZ = 21.5;    // Moved forward to avoid back boundary (20.9)
        
        // Create a tight 3x3 grid with consistent spacing, ensuring all positions are within bounds
        const resetPositions = [
            [stableX,       stableY, stableZ],          // Row 1, Col 1
            [stableX,       stableY, stableZ + 0.7],    // Row 1, Col 2
            [stableX,       stableY, stableZ + 1.4],    // Row 1, Col 3
            [stableX + 0.7, stableY, stableZ],          // Row 2, Col 1
            [stableX + 0.7, stableY, stableZ + 0.7],    // Row 2, Col 2
            [stableX + 0.7, stableY, stableZ + 1.4],    // Row 2, Col 3
            [stableX + 1.4, stableY, stableZ],          // Row 3, Col 1
            [stableX + 1.4, stableY, stableZ + 0.7]     // Row 3, Col 2
        ];
        
        // Get the index based on the ball's name or default to a random position
        let index = -1;
        if (ball.name === "RedBall") index = 0;
        else if (ball.name === "GreenBall") index = 1;
        else if (ball.name === "BlueBall") index = 2;
        else if (ball.name === "YellowBall") index = 3;
        else if (ball.name === "MagentaBall") index = 4;
        else if (ball.name === "CyanBall") index = 5;
        else if (ball.name === "OrangeBall") index = 6;
        else if (ball.name === "PurpleBall") index = 7;
        else index = Math.floor(Math.random() * resetPositions.length);
        
        // Use the indexed position or random if something went wrong
        const position = resetPositions[index];
        
        // Add a very small random offset to prevent perfect stacking
        const offsetX = (Math.random() - 0.5) * 0.05; // Very small offset
        const offsetY = Math.random() * 0.05;         // Very small offset
        const offsetZ = (Math.random() - 0.5) * 0.05; // Very small offset
        
        const x = position[0] + offsetX;
        const y = position[1] + offsetY;
        const z = position[2] + offsetZ;
        
        // Set the new position
        ball.position.set(x, y, z);
        
        // Reset velocity to ZERO
        ball.userData.velocity.set(0, 0, 0);
        
        // Update bounding sphere
        if (ball.userData.boundingSphere) {
            ball.userData.boundingSphere.center.copy(ball.position);
        }
        
        return ball.position.clone();
    }
    
    render() {
        // Before rendering, ensure all balls are visible
        if (this.toys && this.toys.length > 0 && this.renderCount % 60 === 0) { // Check every ~1 second (assuming 60fps)
            let fixedCount = 0;
            this.toys.forEach(toy => {
                if (toy && !toy.visible) {
                    console.warn(`Found invisible ball: ${toy.name} - Making it visible`);
                    toy.visible = true;
                    toy.material.visible = true;
                    toy.material.needsUpdate = true;
                    fixedCount++;
                }
            });
            
            if (fixedCount > 0) {
                console.log(`Fixed visibility for ${fixedCount} balls`);
            }
        }
        
        // Increment render counter
        this.renderCount = (this.renderCount || 0) + 1;
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    resetSimulation() {
        this.chainSim.reset();
        
        // Reset claw position
        this.clawPath.currentCurveIndex = 0;
        this.clawPath.currentParameter = 0;
        const pathPosition = this.clawPath.getCurrentPoint();
        this.updateClawPosition(pathPosition);
    }
    
    toggleGravity() {
        if (this.ballPhysics) {
            const gravityEnabled = this.ballPhysics.toggleGravity();
            console.log(`Gravity ${gravityEnabled ? 'enabled' : 'disabled'}`);
        }
    }
    
    // Toggle claw movement
    moveClaw() {
        this.isClawMoving = !this.isClawMoving;
        console.log(`Claw movement ${this.isClawMoving ? 'started' : 'stopped'}`);
        
        // Reset parameters when starting movement
        if (this.isClawMoving && this.clawPath) {
            // Make sure the claw path is initialized
            if (this.clawPath.curves.length === 0) {
                console.warn("Claw path has no curves. Initializing path...");
                this.initHermiteCurves();
            }
            
            // Initialize speed if not already set
            if (!this.claw_movement_speed) {
                this.claw_movement_speed = 0.01;
            }
        }
    }
    
    // Calculate distance between two points
    distance(v1, v2) {
        return v1.distanceTo(v2);
    }
    
    // Add a new method to initialize the inverse kinematics chain
    initInverseKinematics() {
        // Joints will be initialized when the model is loaded
        this.ikJoints = [];
        this.ikTarget = new THREE.Object3D();
        this.ikEnabled = true;
        
        // Add the target to the scene for visualization (optional)
        const targetGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const targetMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        const targetMesh = new THREE.Mesh(targetGeometry, targetMaterial);
        this.ikTarget.add(targetMesh);
        this.scene.add(this.ikTarget);
        
        // Initial target position matches the claw position
        this.ikTarget.position.copy(this.claw_position);
    }
    
    // Method to find and setup joints from the loaded model
    setupIkJointsFromModel() {
        if (!this.clawMechanism) {
            console.warn("Cannot setup IK, claw mechanism not found");
            return;
        }
        
        // Find all potential joint objects
        const cylinder = this.findObjectByName(this.clawMechanism, "cylinder");
        const cylinder001 = this.findObjectByName(this.clawMechanism, "cylinder.001");
        const cube005 = this.findObjectByName(this.clawMechanism, "cube.005");
        const cube006 = this.findObjectByName(this.clawMechanism, "cube.006");
        const cube007 = this.findObjectByName(this.clawMechanism, "cube.007");
        
        // Clear existing joints
        this.ikJoints = [];
        
        // Add joints in hierarchical order (base to end-effector)
        if (cylinder) {
            cylinder.userData.ikJoint = {
                axis: new THREE.Vector3(0, 1, 0),
                min: -Math.PI/2,
                max: Math.PI/2
            };
            this.ikJoints.push(cylinder);
        }
        
        if (cylinder001) {
            cylinder001.userData.ikJoint = {
                axis: new THREE.Vector3(1, 0, 0),
                min: -Math.PI/4,
                max: Math.PI/2
            };
            this.ikJoints.push(cylinder001);
        }
        
        if (cube005) {
            cube005.userData.ikJoint = {
                axis: new THREE.Vector3(0, 0, 1),
                min: -Math.PI/4,
                max: Math.PI/4
            };
            this.ikJoints.push(cube005);
        }
        
        if (cube006) {
            cube006.userData.ikJoint = {
                axis: new THREE.Vector3(1, 0, 0),
                min: 0,
                max: Math.PI/2
            };
            this.ikJoints.push(cube006);
        }
        
        if (cube007) {
            // The end effector doesn't rotate, it's the target
            this.ikEndEffector = cube007;
        }
        
        console.log(`Initialized IK chain with ${this.ikJoints.length} joints`);
    }
    
    // Helper to find objects by name
    findObjectByName(root, name) {
        let result = null;
        
        // Check if the root object itself matches
        if (root.name && root.name.toLowerCase().includes(name.toLowerCase())) {
            return root;
        }
        
        // Recursively search children
        if (root.children) {
            root.children.forEach(child => {
                if (!result) {
                    result = this.findObjectByName(child, name);
                }
            });
        }
        
        return result;
    }
    
    // Solve the inverse kinematics using the Jacobian Transpose method
    solveIK(targetPosition) {
        if (!this.ikEnabled || this.ikJoints.length === 0 || !this.ikEndEffector) {
            return false;
        }
        
        // Update the visual target
        this.ikTarget.position.copy(targetPosition);
        
        // Get the current end effector position in world space
        const endEffectorPosition = new THREE.Vector3();
        this.ikEndEffector.getWorldPosition(endEffectorPosition);
        
        // Calculate the error vector
        const error = new THREE.Vector3().subVectors(targetPosition, endEffectorPosition);
        
        // If we're already close enough, no need to solve
        if (error.length() < IK_TOLERANCE) {
            return true;
        }
        
        // Iterate to find a solution
        for (let iteration = 0; iteration < IK_ITERATIONS; iteration++) {
            // For each joint, calculate how its rotation affects the end effector
            for (let i = this.ikJoints.length - 1; i >= 0; i--) {
                const joint = this.ikJoints[i];
                const jointData = joint.userData.ikJoint;
                
                if (!jointData || !jointData.axis) continue;
                
                // Get joint position in world space
                const jointPosition = new THREE.Vector3();
                joint.getWorldPosition(jointPosition);
                
                // Calculate the joint axis in world space
                const jointAxis = jointData.axis.clone();
                joint.getWorldQuaternion(new THREE.Quaternion()).normalize();
                jointAxis.applyQuaternion(joint.getWorldQuaternion(new THREE.Quaternion()));
                
                // Calculate the lever arm (from joint to end effector)
                const leverArm = new THREE.Vector3().subVectors(endEffectorPosition, jointPosition);
                
                // Calculate the cross product to find the direction of influence
                const cross = new THREE.Vector3().crossVectors(jointAxis, leverArm);
                
                // Calculate how much to rotate this joint (dot product with error)
                let rotationAmount = cross.dot(error) * IK_DAMPING;
                
                // Apply joint limits
                const currentAngle = joint.rotation[this.getRotationComponent(jointData.axis)];
                const newAngle = currentAngle + rotationAmount;
                
                if (newAngle < jointData.min) {
                    rotationAmount = jointData.min - currentAngle;
                } else if (newAngle > jointData.max) {
                    rotationAmount = jointData.max - currentAngle;
                }
                
                // Apply the rotation
                if (Math.abs(rotationAmount) > 0.001) {
                    // Create a rotation quaternion around the joint axis
                    const rotationQuat = new THREE.Quaternion();
                    rotationQuat.setFromAxisAngle(jointData.axis, rotationAmount);
                    
                    // Apply the rotation to the joint
                    joint.quaternion.premultiply(rotationQuat);
                    joint.updateMatrixWorld(true);
                    
                    // Update the end effector position after this joint's rotation
                    this.ikEndEffector.getWorldPosition(endEffectorPosition);
                    
                    // Recalculate the error
                    error.subVectors(targetPosition, endEffectorPosition);
                    
                    // If we're close enough, we can stop
                    if (error.length() < IK_TOLERANCE) {
                        return true;
                    }
                }
            }
        }
        
        // Return true if we got close enough, false otherwise
        return error.length() < IK_TOLERANCE * 10;
    }
    
    // Helper to determine which rotation component to use based on axis
    getRotationComponent(axis) {
        if (Math.abs(axis.x) > 0.9) return 'x';
        if (Math.abs(axis.y) > 0.9) return 'y';
        if (Math.abs(axis.z) > 0.9) return 'z';
        return 'y'; // Default
    }
    
    // Helper method to check if a toy is in contact with any surface
    isInContactWithSurface(toy) {
        const radius = toy.userData.radius || 0.4;
        const epsilon = 0.01; // Small threshold for contact detection
        
        // Check if near floor
        if (Math.abs(toy.position.y - radius - this.machineBounds.min.y) < epsilon) {
            return true;
        }
        
        // Check if near walls
        if (Math.abs(toy.position.x - radius - this.machineBounds.min.x) < epsilon ||
            Math.abs(toy.position.x + radius - this.machineBounds.max.x) < epsilon) {
            return true;
        }
        
        if (Math.abs(toy.position.z - radius - this.machineBounds.min.z) < epsilon ||
            Math.abs(toy.position.z + radius - this.machineBounds.max.z) < epsilon) {
            return true;
        }
        
        return false;
    }
    
    // Randomize all balls to new positions within the claw machine
    randomizeBalls() {
        console.log("==== RANDOMIZING BALL POSITIONS ====");
        
        // Find all balls in the scene
        let ballCount = 0;
        let visibleCount = 0;
        
        console.log(`Total toys in array: ${this.toys ? this.toys.length : 0}`);
        
        // If no toys are found, recreate them
        if (!this.toys || this.toys.length === 0) {
            console.warn("No toys found, recreating balls");
            this.createDirectBalls();
            return;
        }
        
        this.toys.forEach((object, index) => {
            if (object && object.userData && object.userData.isBall) {
                console.log(`Randomizing ${object.name} - Current position: (${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)}), Visible: ${object.visible}`);
                
                // Ensure the ball is visible
                if (!object.visible) {
                    console.warn(`Ball ${object.name} was invisible - making it visible`);
                    object.visible = true;
                    object.material.visible = true;
                    object.material.needsUpdate = true;
                }
                
                // Check if the ball is in the scene
                if (!this.scene.children.includes(object)) {
                    console.warn(`Ball ${object.name} was not in the scene - adding it back`);
                    this.scene.add(object);
                }
                
                // Reset the ball position
                this.resetBallPosition(object);
                
                // Enable physics for this ball - make it mobile
                object.userData.isImmobile = false;
                
                // Give it a small random velocity to make balls interact
                object.userData.velocity.set(
                    (Math.random() - 0.5) * 2.0,  // Random X velocity
                    Math.random() * 0.5,          // Small upward Y velocity
                    (Math.random() - 0.5) * 2.0   // Random Z velocity
                );
                
                ballCount++;
                
                if (object.visible) {
                    visibleCount++;
                }
            }
        });
        
        if (ballCount === 0) {
            console.warn("No balls found to randomize, recreating all balls");
            this.createDirectBalls();
        } else {
            console.log(`Randomized ${ballCount} balls, ${visibleCount} are visible`);
        }
        
        console.log("==== RANDOMIZATION COMPLETE ====");
    }
    
    // Get a random position inside the machine bounds but away from the glass hole
    getRandomPositionInMachine() {
        if (!this.machineBounds) {
            console.error("Machine bounds not available for positioning");
            return [0, 2, 0]; // Fallback position above the machine
        }

        const center = new THREE.Vector3();
        this.machineBounds.getCenter(center);
        
        const size = new THREE.Vector3();
        this.machineBounds.getSize(size);

        // Random position within the bounds, staying away from edges
        const padding = 0.4; // Stay away from edges
        const x = center.x + (Math.random() * 2 - 1) * (size.x / 2 - padding);
        
        // Keep the Y position safely above the bottom by at least 0.5 units
        // and below the top by at least padding
        const minY = this.machineBounds.min.y + 0.5;
        const maxY = this.machineBounds.max.y - padding;
        const y = minY + Math.random() * (maxY - minY);
        
        const z = center.z + (Math.random() * 2 - 1) * (size.z / 2 - padding);
        
        return [x, y, z];
    }
    
    // Method to initialize the Hermite curves for the claw path
    initHermiteCurves() {
        // Create a proper HermitePath object (instead of our custom implementation)
        this.clawPath = new HermitePath();
        
        // Define control points for a circular path
        const center = new THREE.Vector3(0, 6, 0);
        const radius = 3.0;
        const numPoints = 8;
        const points = [];
        
        // Create points in a circle
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const x = center.x + radius * Math.cos(angle);
            const z = center.z + radius * Math.sin(angle);
            points.push(new THREE.Vector3(x, center.y, z));
        }
        
        // Calculate tangents and create curves
        for (let i = 0; i < numPoints; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % numPoints];
            
            // Calculate tangents (simple but effective)
            const tangent1 = new THREE.Vector3(
                -Math.sin(i / numPoints * Math.PI * 2),
                0,
                Math.cos(i / numPoints * Math.PI * 2)
            ).multiplyScalar(radius);
            
            const tangent2 = new THREE.Vector3(
                -Math.sin((i + 1) / numPoints * Math.PI * 2),
                0,
                Math.cos((i + 1) / numPoints * Math.PI * 2)
            ).multiplyScalar(radius);
            
            // Add curve to the path using the proper addCurve method
            this.clawPath.addCurve(p1, p2, tangent1, tangent2);
        }
        
        // Add path visualization to the scene
        if (this.clawPath.pathGroup) {
            this.scene.add(this.clawPath.pathGroup);
        }
        
        console.log(`Created claw path with ${this.clawPath.curves.length} curves`);
    }
    
    // Handle collision with barrier
    handleBarrierCollision(ball) {
        if (!this.barrier || !ball.userData.boundingSphere) return;
        
        const barrier = this.barrier;
        const sphere = ball.userData.boundingSphere;
        const radius = sphere.radius;
        
        // Create a bounding box for the barrier
        if (!barrier.userData.boundingBox) {
            // Create the bounding box once and cache it
            const box = new THREE.Box3().setFromObject(barrier);
            barrier.userData.boundingBox = box;
        }
        
        const barrierBox = barrier.userData.boundingBox;
        
        // Check if the ball's bounding sphere intersects with the barrier's bounding box
        if (sphere.intersectsBox(barrierBox)) {
            console.log(`Ball ${ball.name} collided with barrier`);
            
            // Calculate the penetration depth
            // For simplicity, we'll just push the ball back in the direction opposite to the barrier's normal
            const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(barrier.quaternion);
            
            // Reflect the velocity component along the normal
            const velocityAlongNormal = ball.userData.velocity.dot(normal);
            
            if (velocityAlongNormal < 0) {
                // Ball is moving toward the barrier
                // Reflect the velocity with some energy loss (coefficient of restitution = 0.8)
                ball.userData.velocity.addScaledVector(normal, -1.8 * velocityAlongNormal);
                
                // Apply a small push away from the barrier to prevent sticking
                ball.position.addScaledVector(normal, 0.05);
                
                // Update the bounding sphere to match the new position
                sphere.center.copy(ball.position);
            }
        }
    }
    
    // This method needs to be called when a ball is grabbed by the claw
    enableBallPhysics(ball) {
        if (ball && ball.userData) {
            console.log(`Enabling physics for ${ball.name} - ball is now mobile`);
            ball.userData.isImmobile = false;
            ball.userData.isGrabbed = true;
        }
    }
    
    // This method would be called when a ball is released from the claw
    releaseBall(ball) {
        if (ball && ball.userData) {
            console.log(`Released ${ball.name} - ball will follow normal physics`);
            ball.userData.isGrabbed = false;
            // Don't reset isImmobile - let it follow physics until it comes to rest or is reset
        }
    }
    
    enablePhysicsForAllBalls() {
        if (!this.toys || this.toys.length === 0) {
            console.warn("No toys found to enable physics for");
            return 0;
        }
        
        let enabledCount = 0;
        
        this.toys.forEach((toy) => {
            if (toy && toy.userData && toy.userData.isBall) {
                // Enable physics for this ball
                toy.userData.isImmobile = false;
                
                // Give it a small random velocity to make balls interact
                toy.userData.velocity.set(
                    (Math.random() - 0.5) * 2.0,  // Random X velocity
                    Math.random() * 0.5,          // Small upward Y velocity
                    (Math.random() - 0.5) * 2.0   // Random Z velocity
                );
                
                enabledCount++;
            }
        });
        
        console.log(`Enabled physics for ${enabledCount} balls`);
        return enabledCount;
    }
} 