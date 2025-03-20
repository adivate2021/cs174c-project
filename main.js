// main.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ClawScene } from "./claw.js";
import { HermitePath } from "./three-hermite.js";

// Make THREE and OrbitControls available globally for other modules
window.THREE = THREE;
window.OrbitControls = OrbitControls;

// Global reference to the scene instance
let clawSceneInstance = null;

// Check Three.js availability and report details
function checkThree() {
  // console.log("Checking Three.js availability...");

  if (typeof THREE === "undefined") {
    console.error("THREE is not defined! Make sure Three.js is loaded.");
    return false;
  }

  // console.log("THREE is defined:", THREE.REVISION);

  if (typeof OrbitControls === "undefined") {
    // console.log("OrbitControls is not defined!");
    return false;
  }

  // console.log("OrbitControls is defined");
  return true;
}

// Wait for the page to load
document.addEventListener("DOMContentLoaded", () => {
  // console.log("DOM content loaded, attempting to initialize...");

  // With ES modules, Three.js should already be loaded
  // console.log("Three.js loaded as module, initializing...");
  init();
});

function init() {
  // console.log("Initializing...");

  if (!checkThree()) {
    console.error("Three.js check failed!");
    return;
  }

  try {
    // Create the claw scene instance
    clawSceneInstance = new ClawScene();

    // console.log("ClawScene instance created");

    // Add window resize handler
    window.addEventListener("resize", () => {
      clawSceneInstance.onWindowResize();
    });

    // Load the claw machine model
    loadClawMachineModel(clawSceneInstance);

    //
    // const customClaw = new ClawCustom(3, 0.15);
    // customClaw.rotate(1)
    // // Set its position so that it is visible in the scene.
    // customClaw.position.set(-13, 5, 15);
    // // Add the custom claw to the scene.
    // clawSceneInstance.scene.add(customClaw);
    // console.log("Custom claw added to scene");

    //

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
  const controlsContainer = document.createElement("div");
  controlsContainer.style.position = "absolute";
  controlsContainer.style.top = "20px";
  controlsContainer.style.right = "20px";
  controlsContainer.style.display = "flex";
  controlsContainer.style.flexDirection = "column";
  controlsContainer.style.gap = "10px";
  document.body.appendChild(controlsContainer);

  // Shared button styles
  const buttonStyle = {
    padding: "10px 20px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
    transition: "background-color 0.3s",
  };

  // controlsContainer.appendChild(lowerRaiseButton);
  document.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      scene.lowerRaise();
    }
  });
}

function loadClawMachineModel(scene) {
  // console.log("Loading claw machine model...");

  const loader = new GLTFLoader();

  // Load the Claw-Island-2 model
  loader.load(
    "./Claw-Island-2/scene.gltf",
    function (gltf) {
      // console.log("Model loaded successfully!");

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
        }
      });

      // Grid to visualize the ground plane
      // const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x888888);
      // gridHelper.position.y = 0.01; // Slightly above ground
      // //scene.scene.add(gridHelper);

      // Set up the claw machine parts based on the provided coordinates
      setupClawMachine(scene, gltf.scene, {
        x: -13.05,
        y: 1.6,
        z: 22.8,
      });
    },
    function (xhr) {
      // console.log(
      //   "Model loading: " + (xhr.loaded / xhr.total) * 100 + "% loaded"
      // );
      if (xhr.loaded / xhr.total === 1) {
        scene.moveClaw();
      }
    },
    function (error) {
      console.error("Error loading model:", error);
    }
  );
}

// Function to set up the claw machine parts at the specified position
function setupClawMachine(scene, modelRoot, clawPosition) {
  // console.log(`Setting up claw machine at position:`, clawPosition);

  // Ensure clawPosition is a Vector3
  const clawPos = new THREE.Vector3(
    clawPosition.x || 0,
    clawPosition.y || 0,
    clawPosition.z || 0
  );

  // console.log(`Converted to Vector3:`, clawPos);

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
  let interiorPart = null;
  let roofPart = null;

  // Find parts that might be the claw machine interior/roof
  modelRoot.traverse((child) => {
    if (child.isMesh) {
      // Check if this might be the interior
      if (
        child.name.toLowerCase().includes("interior") ||
        child.name.toLowerCase().includes("inside")
      ) {
        interiorPart = child;
        // console.log(`Found potential interior part: ${child.name}`);
      }

      // Check if this might be the roof
      if (
        child.name.toLowerCase().includes("roof") ||
        child.name.toLowerCase().includes("top") ||
        child.name.toLowerCase().includes("ceiling")
      ) {
        roofPart = child;
        // console.log(`Found potential roof part: ${child.name}`);
      }
    }
  });

  // Update the hermite path to match the roof
  updateHermitePathToMatchRoof(scene, roofPart, clawPos);

  // Handle balls and bounding box
  try {
    // console.log("Updating machine bounds at position:", clawPos);
    scene.updateMachineBounds(clawPos);
  } catch (error) {
    // console.error("Error setting up claw machine bounds:", error);
  }
}

// Update the hermite path to align with the roof of the claw machine
function updateHermitePathToMatchRoof(scene, roofPart, clawPosition) {
  // console.log("Updating hermite path to match roof at position:", clawPosition);

  // Check if we need to create a path
  if (!scene.clawPath) {
    // console.log("Creating new HermitePath for claw");
    scene.clawPath = new HermitePath();
  }

  // Calculate the roof height - a bit below the top of the claw machine
  const roofHeight = clawPosition.y + 6.5; 
  // console.log(`Setting path at height ${roofHeight}`);

  // Create points for a path around the inside perimeter
  const pathWidth = 2.0; 
  const pathDepth = 2.0; 

  // Create points for the path centered at the claw position
  // Create a distinctly M-shaped path at the specified height
  const points = [
    new THREE.Vector3(
      clawPosition.x - pathWidth / 2,
      roofHeight,
      clawPosition.z + pathDepth / 2
    ),
    new THREE.Vector3(
      clawPosition.x - pathWidth / 4,
      roofHeight,
      clawPosition.z - pathDepth / 4
    ),
    new THREE.Vector3(
      clawPosition.x,
      roofHeight,
      clawPosition.z + pathDepth / 2
    ),
    new THREE.Vector3(
      clawPosition.x + pathWidth / 4,
      roofHeight,
      clawPosition.z - pathDepth / 4
    ),
    new THREE.Vector3(
      clawPosition.x + pathWidth / 2,
      roofHeight,
      clawPosition.z + pathDepth / 2
    ),
    new THREE.Vector3(
      clawPosition.x + pathWidth / 4,
      roofHeight,
      clawPosition.z + pathDepth / 3
    ),
    new THREE.Vector3(clawPosition.x, roofHeight, clawPosition.z),
    new THREE.Vector3(
      clawPosition.x - pathWidth / 4,
      roofHeight,
      clawPosition.z + pathDepth / 3
    ),
  ];

  // Calculate tangents using approximations for the hermite path
  const tangents = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length];
    const next = points[(i + 1) % points.length];
    const tangent = new THREE.Vector3()
      .subVectors(next, prev)
      .multiplyScalar(0.5);
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
    scene.clawPath.getPointAt = function (t) {
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
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
  scene.clawPathLine = new THREE.Line(lineGeometry, lineMaterial);
  scene.scene.add(scene.clawPathLine);

  // Position the claw mechanism at the start of the path
  if (scene.clawMechanism) {
    const pathPos = scene.clawPath.getPointAt(0);
    scene.clawMechanism.position.copy(pathPos);
    // console.log("Positioned claw mechanism at start of path:", pathPos);
  }

  // Ensure the bounding box is properly positioned at the claw location
  if (scene.clawScene) {
    scene.clawScene.updateMachineBounds(clawPosition);
    // console.log("Repositioned balls within updated bounds");
  }
}

