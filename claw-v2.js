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
    this.middleKnuckleBend = middleKnuckleBend; // Currently not used for rotations
    this.endEffectorOffset = 0.4;
    this.endEffectors = [];

    // Create the base of the claw (the root)
    const baseMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 16),
      new THREE.MeshNormalMaterial()
    );
    // Scale down the base
    baseMesh.scale.set(scale * 0.1, scale * 0.1, scale * 0.1);
    // Create a group to serve as the claw node and add the base mesh
    this.clawNode = new THREE.Group();
    this.clawNode.add(baseMesh);
    this.add(this.clawNode);

    // Define finger offset positions (for a 4-finger layout: east, south, west, north)
    const fingerPositions = [
      new THREE.Vector3(scale * 0.05, 0, 0), // Finger 1: East
      new THREE.Vector3(0, 0, -scale * 0.05), // Finger 2: South
      new THREE.Vector3(-scale * 0.05, 0, 0), // Finger 3: West
      new THREE.Vector3(0, 0, scale * 0.05), // Finger 4: North
    ];
    const lowerFingerPositions = [
      new THREE.Vector3(scale * 0.25, 0, 0), // Finger 1: East
      new THREE.Vector3(0, 0, -scale * 0.25), // Finger 2: South
      new THREE.Vector3(-scale * 0.25, 0, 0), // Finger 3: West
      new THREE.Vector3(0, 0, scale * 0.25), // Finger 4: North
    ];

    // Build each finger (0 to 3)
    for (let i = 0; i < 4; i++) {
      // -----------------------
      // Create a pivot for the upper finger so it attaches at the proper offset.
      const fingerPivot = new THREE.Group();
      fingerPivot.name = `fingerPivot${i}`;
      fingerPivot.position.copy(fingerPositions[i]);

      // -----------------------
      // Upper Finger Group
      const upperFingerGroup = new THREE.Group();
      // For simplicity we set different translations/scales based on finger index.
      // Adjust these values to suit your design.
      if (i === 0) {
        // Finger 1: East
        upperFingerGroup.position.set(scale * 0.3, 0, 0);
        upperFingerGroup.scale.set(scale * 0.25, scale * 0.05, scale * 0.05);
      } else if (i === 1) {
        // Finger 2: South
        upperFingerGroup.position.set(0, 0, -scale * 0.3);
        upperFingerGroup.scale.set(scale * 0.05, scale * 0.05, scale * 0.25);
      } else if (i === 2) {
        // Finger 3: West
        upperFingerGroup.position.set(-scale * 0.3, 0, 0);
        upperFingerGroup.scale.set(scale * 0.25, scale * 0.05, scale * 0.05);
      } else if (i === 3) {
        // Finger 4: North
        upperFingerGroup.position.set(0, 0, scale * 0.3);
        upperFingerGroup.scale.set(scale * 0.05, scale * 0.05, scale * 0.25);
      }
      upperFingerGroup.name = `upperFingerGroup${i}`;
      // Add a debug mesh for visualization (upper finger)
      const upperFingerMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 16),
        new THREE.MeshNormalMaterial()
      );
      upperFingerGroup.add(upperFingerMesh);

      // Attach the upper finger group to the pivot
      fingerPivot.add(upperFingerGroup);
      // Attach the pivot to the claw node
      this.clawNode.add(fingerPivot);
      // Create an intermediate pivot at the desired attachment point
      const lowerFingerPivot = new THREE.Group();
      lowerFingerPivot.position.set(
        lowerFingerPositions[i].x,
        lowerFingerPositions[i].y,
        lowerFingerPositions[i].z
      ); // relative to upperFingerGroup
      lowerFingerPivot.name = `lowerFingerPivot${i}`;
      upperFingerGroup.add(lowerFingerPivot);

      // Now add the lower finger to the pivot:
      //   scale *= 5;
      const lowerFingerGroup = new THREE.Group();
      let lower_finger_offset = 0.2;
      if (i === 0 || i === 2) {
        // For east and west fingers, translate along X.
        lowerFingerGroup.position.set(
          i == 2 ? -scale * lower_finger_offset : scale * lower_finger_offset,
          //   0,
          0,
          0
        );
        lowerFingerGroup.scale.set(scale * 0.2, scale * 0.2, scale * 0.2);
      } else {
        // For south and north fingers, translate along Z.
        lowerFingerGroup.position.set(
          0,
          0,
          //   0
          i === 1 ? -scale * lower_finger_offset : scale * lower_finger_offset
        );
        lowerFingerGroup.scale.set(scale * 0.2, scale * 0.2, scale * 0.2);
      }
      lowerFingerGroup.name = `lowerFingerGroup${i}`;
      const lowerFingerMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 16),
        new THREE.MeshNormalMaterial()
      );
      lowerFingerPivot.matrixAutoUpdate = true;
      lowerFingerGroup.matrixAutoUpdate = true;
      lowerFingerMesh.matrixAutoUpdate = true;

      //   lowerFingerMesh.geometry.translate(-0.5, 0, 0);
      lowerFingerGroup.add(lowerFingerMesh);
      lowerFingerPivot.add(lowerFingerGroup);

      //   lowerFingerPivot.rotation.x = Math.PI / 2;
      const axesHelper = new THREE.AxesHelper(5);
      lowerFingerPivot.add(axesHelper);
      //   lowerFingerPivot.rotation.z = Math.PI / 4;
      lowerFingerPivot.updateMatrixWorld(true);

      console.log("Lower finger pivot:", lowerFingerPivot);

      // -----------------------
      // Lower Finger Group (child of the upper finger)

      // Add a debug mesh for visualization (lower finger)

      // Attach the lower finger group to the upper finger group
      //   upperFingerGroup.add(lowerFingerGroup);

      // -----------------------
      // Fingertip Node (child of the lower finger)
      //   const fingertipGroup = new THREE.Group();
      //   if (i === 0 || i === 2) {
      //     fingertipGroup.position.set(this.endEffectorOffset * scale, 0, 0);
      //   } else {
      //     fingertipGroup.position.set(
      //       0,
      //       0,
      //       i === 1
      //         ? -this.endEffectorOffset * scale
      //         : this.endEffectorOffset * scale
      //     );
      //   }
      //   fingertipGroup.scale.set(1, 0.1, 0.1);

      // Add a debug circle to help visualize the fingertip node
      const debugGeo = new THREE.CircleGeometry(0.15, 32);
      const debugMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const debugCircle = new THREE.Mesh(debugGeo, debugMat);
      // Rotate so the circle faces upward (adjust as needed)
      debugCircle.rotation.z = -Math.PI / 2;
      //   fingertipGroup.add(debugCircle);

      // Attach the fingertip group to the lower finger group
      //   lowerFingerGroup.add(fingertipGroup);

      // -----------------------
      // Create and store the end effector (using the fingertip group as its parent)
      //   const endEffector = new EndEffector(
      //     `end_${i + 1}`,
      //     fingertipGroup,
      //     new THREE.Vector3(0, 0, 0)
      //   );
      //   this.endEffectors.push(endEffector);
    }
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
