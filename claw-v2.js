import * as THREE from "three";

export class EndEffector {
  constructor(name, parent, localPosition) {
    this.name = name;
    this.parent = parent; // a THREE.Group (or mesh) holding the tip geometry
    this.localPosition = localPosition; // THREE.Vector3
    this.globalPosition = new THREE.Vector3();
  }
}

export class ClawCustom extends THREE.Group {
  constructor(scale, middleKnuckleBend) {
    super();
    this.scaleValue = scale;
    this.upperKnuckleBend = middleKnuckleBend; // Currently not used for rotations
    this.lowerKnuckleBend = Math.PI/4;
    this.endEffectorOffset = 0.4;
    this.endEffectors = [];

    // Create the base of the claw (the root)
    const baseMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshNormalMaterial()
    );
    // Scale down the base
	let baseScale = this.scaleValue * .2
    // Create a group to serve as the claw node and add the base mesh
    this.clawNode = new THREE.Group();
    this.clawNode.add(baseMesh);
    this.clawNode.scale.set(baseScale, baseScale, baseScale);
    this.add(this.clawNode);

    // // Define finger offset positions (for a 4-finger layout: east, south, west, north)
    // const fingerPositions = [
    //   new THREE.Vector3(scale * 0.05, 0, 0), // Finger 1: East
    //   new THREE.Vector3(0, 0, -scale * 0.05), // Finger 2: South
    //   new THREE.Vector3(-scale * 0.05, 0, 0), // Finger 3: West
    //   new THREE.Vector3(0, 0, scale * 0.05), // Finger 4: North
    // ];
    // const lowerFingerPositions = [
    //   new THREE.Vector3(scale * 0.25, 0, 0), // Finger 1: East
    //   new THREE.Vector3(0, 0, -scale * 0.25), // Finger 2: South
    //   new THREE.Vector3(-scale * 0.25, 0, 0), // Finger 3: West
    //   new THREE.Vector3(0, 0, scale * 0.25), // Finger 4: North
    // ];
      const upperFingerLength = .5 * this.scaleValue;
      const lowerFingerLength = 0.8 * this.scaleValue
      const fingerThickness = 0.1 * this.scaleValue
      const upperFingerGeometry = new THREE.BoxGeometry(upperFingerLength, fingerThickness, fingerThickness);
      const lowerFingerGeometry = new THREE.BoxGeometry(lowerFingerLength, fingerThickness, fingerThickness);
      const fingerMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

      // Define the angles (in radians) for each of the 4 fingers around the sphere.
      const fingerAngles = [0, Math.PI/2, Math.PI, -Math.PI/2];

      // Create 4 fingers.
      fingerAngles.forEach((angle, index) => {
				// Create a group for the finger that pivots around the sphere's center.
				const fingerGroup = new THREE.Group();
				// Add the group as a child of the sphere so it pivots about the sphere's center.
				
				// Rotate the entire finger group so the finger points outward.
				fingerGroup.rotation.z = -this.upperKnuckleBend;
				fingerGroup.rotation.y = angle;
				
				// Create the upper finger.
				// To ensure the pivot is at the left end, we shift the geometry.
				const upperFinger = new THREE.Mesh(
					upperFingerGeometry,
					fingerMaterial
				);
				
				//translate by the radius of the root ball + half length of the box
				// all translations need to be scaled by scale * 0.1 now
				upperFinger.geometry.translate(
					(1 + upperFingerLength/2),
					0,
					0
				);
				fingerGroup.add(upperFinger);
				this.clawNode.add(fingerGroup);
		  
				// Create a pivot for the lower finger at the tip of the upper finger.
				const lowerFingerPivot = new THREE.Group();
				lowerFingerPivot.position.set(
				  this.scaleValue * 0.1 + upperFingerLength,
				  fingerThickness / 2,
				  0
				);
				upperFinger.add(lowerFingerPivot);
		  
				// Create the lower finger.
				const lowerFinger = new THREE.Mesh(
				  lowerFingerGeometry,
				  fingerMaterial
				);
				lowerFinger.geometry.translate(
				  this.scaleValue * 0.1 * (lowerFingerLength * 1/scale * 1.25),
				  -this.scaleValue * 0.1 * (fingerThickness * 1/scale * 1.25),
				  0
				);
				lowerFingerPivot.add(lowerFinger);
		  
				// Optionally, set an initial rotation for the lower finger (e.g., a 30° bend).
				lowerFingerPivot.rotation.z = -1 * this.upperKnuckleBend; // adjust as needed
		  
				// Optional: add an axes helper to visualize the finger's local axes.
				const axesHelper = new THREE.AxesHelper(2);
				fingerGroup.add(axesHelper);
				// const axesHelper1 = new THREE.AxesHelper(2)
				// upperFinger.add(axesHelper1)
				// const axesHelper2 = new THREE.AxesHelper(5);
				// lowerFinger.add(axesHelper2);
				// const axesHelper3 = new THREE.AxesHelper(2);
				// lowerFingerPivot.add(axesHelper3);
			  });
  }
  rotate(theta) {
    this.upperKnuckleBend += theta
  }
  // Method to update the global positions of all end effectors
  getEndEffectorPositions() {
    this.updateMatrixWorld(true);
    return this.endEffectors.map((eff) => {
      eff.globalPosition.setFromMatrixPosition(eff.parent.matrixWorld);
      return eff.globalPosition.clone();
    });
  }
}
