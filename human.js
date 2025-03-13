import { tiny, defs } from "./examples/common.js";
// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } =
  tiny;

const shapes = {
  sphere: new defs.Subdivision_Sphere(5),
};

export const Articulated_Human = class Articulated_Human {
  constructor() {
    const sphere_shape = shapes.sphere;

    // Root position of the claw
    let claw_transform = Mat4.translation(0, 0, 0); // Root at (0, 0, 0)
    const claw_scale = 0.1;
    this.claw_node = new Node(
      "claw",
      sphere_shape,
      claw_transform.times(Mat4.scale(claw_scale, claw_scale, claw_scale))
    ); // No shape for root

    const root_location = Mat4.translation(0, 1, 0);
    this.root = new Arc("root", null, this.claw_node, root_location);

    let displacement = 0.1;
    const finger_positions = [
      Mat4.translation(0, 0, displacement), // North
      Mat4.translation(displacement, 0, 0), // East
      Mat4.translation(0, 0, -displacement), // South
      Mat4.translation(-1 * displacement, 0, 0), // West
    ];
    const finger_rotations = [
      Mat4.rotation((-1 * Math.PI) / 2, 0, 1, 0),
      Mat4.rotation(0, 0, 1, 0),
      Mat4.rotation(Math.PI / 2, 0, 1, 0),
      Mat4.rotation(Math.PI, 0, 1, 0),
    ];

    this.fingers = [];

    for (let i = 0; i < finger_positions.length; i++) {
      // Upper finger (base joint / knuckle)
      let knuckle_transform = Mat4.scale(0.3, 0.05, 0.05);
      knuckle_transform.pre_multiply(Mat4.translation(0.3, 0, 0));
      knuckle_transform.pre_multiply(finger_rotations[i]);
      let upper_finger = new Node(
        `finger${i}_knuckle`,
        sphere_shape,
        knuckle_transform
      );

      let upper_knuckle = new Arc(
        `finger${i}_upper_knuckle`,
        this.claw_node, // Attach to claw root
        upper_finger,
        finger_positions[i] // Offset for each finger (North, East, South, West)
      );
      this.claw_node.children_arcs.push(upper_knuckle);
      upper_knuckle.set_dof(false, false, false, false, false, true); // Enable rotation

      //   Lower finger (middle joint) – reworked to incorporate the offset into the node transform
      let lower_offset = Mat4.translation(0, 0, 0); // Adjusted offset if needed
      // First rotate, then translate, then scale the lower finger
      let middle_transform = finger_rotations[i].times(
        Mat4.scale(0.2, 0.05, 0.05)
      );

      let lower_finger = new Node(
        `finger${i}_middle`,
        sphere_shape,
        Mat4.scale(0.2, 0.05, 0.05) // Combined transform: offset is now in the node's transform
      );

      // Use an identity location matrix so that the lower finger's transform is applied in the parent's (rotated) frame.
      let middle_knuckle_transform = Mat4.translation(0.3, 0, 0);
      let middle_knuckle = new Arc(
        `finger${i}_middle_knuckle`,
        upper_finger, // Attach to the upper finger
        lower_finger,
        middle_knuckle_transform
      );
      upper_finger.children_arcs.push(middle_knuckle);
      middle_knuckle.set_dof(false, false, false, false, false, true); // Enable rotation

      this.fingers.push({ knuckle: upper_knuckle });
    }

    // We have 7 rotational DOF along the right arm chain:
    // r_shoulder (3) + r_elbow (2) + r_wrist (2) = 7
    this.dof = 7;
    // global theta array (one value per DOF, initially all set to 1)

    let base_knuckle_rotation = 0.3;
    let middle_knuckle_rotation = 0.3;
    let first = [base_knuckle_rotation, middle_knuckle_rotation];
    let second = [base_knuckle_rotation, middle_knuckle_rotation];
    let third = [base_knuckle_rotation, middle_knuckle_rotation];
    let fourth = [base_knuckle_rotation, middle_knuckle_rotation];
    this.theta = [...first, ...second, ...third, ...fourth];
    this.apply_theta();
  }

  // Update each joint’s articulation using the corresponding theta values.
  apply_theta() {
    const joints = this.get_joints_in_order(); // expected order: [r_shoulder, r_elbow, r_wrist]
    let thetaIndex = 0;
    for (const joint of joints) {
      // Count number of rotational DOFs for this joint.
      let numRot =
        (joint.dof.Rx ? 1 : 0) +
        (joint.dof.Ry ? 1 : 0) +
        (joint.dof.Rz ? 1 : 0);
      if (numRot > 0) {
        let theta_slice = this.theta.slice(thetaIndex, thetaIndex + numRot);
        joint.update_articulation(theta_slice);
        thetaIndex += numRot;
      }
      if (thetaIndex >= this.theta.length) break;
    }
  }

  // Cross product of 3D vectors.
  cross_product(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  // Return the joints along the right arm chain in order from base to tip.
  get_joints_in_order() {
    // We skip the root since it has no rotational DOF for IK.
    let temp = [];
    for (let knuckle of this.claw_node.children_arcs) {
      temp.push(knuckle);
      if (knuckle.child_node.children_arcs.length > 0) {
        temp.push(knuckle.child_node.children_arcs[0]);
      }
    }
    return temp;
  }

  // Compute the Jacobian matrix for the end-effector.

  // Recursively update global joint transforms and end-effector positions.
  _rec_update(arc, parent_matrix) {
    arc.joint_transform = parent_matrix.times(arc.location_matrix);

    let child_global_matrix = arc.joint_transform
      .times(arc.articulation_matrix)
      .times(arc.child_node.transform_matrix);

    if (arc.end_effector) {
      let p = child_global_matrix.times(arc.end_effector.local_position);
      arc.end_effector.global_position = vec4(
        p[0] / p[3],
        p[1] / p[3],
        p[2] / p[3],
        1
      );
    }

    for (const child_arc of arc.child_node.children_arcs) {
      this._rec_update(child_arc, child_global_matrix);
    }
  }

  draw(webgl_manager, uniforms, material) {
    this.matrix_stack = [];
    this._rec_draw(
      this.root,
      Mat4.identity(),
      webgl_manager,
      uniforms,
      material
    );
  }

  update(point_along_spline, theta = null) {
    if (theta === null) {
      let current = this.get_end_effector_position();
      let difference = [
        point_along_spline[0] - current[0],
        point_along_spline[1] - current[1],
        point_along_spline[2] - current[2],
      ];
      let dx = [difference[0], difference[1], difference[2]];
      let J = this.calculate_Jacobian();
      let dtheta = this.calculate_delta_theta(J, dx);
      let k = 0.02;

      this.theta = this.theta.map((v, i) => v + k * dtheta[i][0]);
    } else {
      let current = this.get_end_effector_position();
      this.theta = theta;
    }
    this.apply_theta();
  }

  _rec_draw(arc, matrix, webgl_manager, uniforms, material) {
    if (arc !== null) {
      const L = arc.location_matrix;
      const A = arc.articulation_matrix;
      matrix.post_multiply(L.times(A));
      this.matrix_stack.push(matrix.copy());

      const node = arc.child_node;
      const T = node.transform_matrix;
      matrix.post_multiply(T);
      node.shape.draw(webgl_manager, uniforms, matrix, material);

      matrix = this.matrix_stack.pop();
      for (const next_arc of node.children_arcs) {
        this.matrix_stack.push(matrix.copy());
        this._rec_draw(next_arc, matrix, webgl_manager, uniforms, material);
        matrix = this.matrix_stack.pop();
      }
    }
  }

  debug(arc = null, id = null) {
    const J = this.calculate_Jacobian();
    let dx = [[0], [-0.02], [0]];
    if (id === 2) dx = [[-0.02], [0], [0]];
    const dtheta = this.calculate_delta_theta(J, dx);

    // Update the global theta values (using a simple step update).
    this.theta = this.theta.map((v, i) => v + dtheta[i][0]);
    this.apply_theta();
  }
};

class Node {
  constructor(name, shape, transform) {
    this.name = name;
    this.shape = shape;
    this.transform_matrix = transform;
    this.children_arcs = [];
  }
}

class Arc {
  constructor(name, parent, child, location) {
    this.name = name;
    this.parent_node = parent;
    this.child_node = child;
    this.location_matrix = location;
    this.articulation_matrix = Mat4.identity();
    this.end_effector = null;
    this.dof = {
      x: false,
      y: false,
      z: false,
      Rx: false,
      Ry: false,
      Rz: false,
    };
  }

  // Set the DOFs for this joint.
  set_dof(x, y, z, rx, ry, rz) {
    this.dof.x = x;
    this.dof.y = y;
    this.dof.z = z;
    this.dof.Rx = rx;
    this.dof.Ry = ry;
    this.dof.Rz = rz;
  }

  // Update the articulation matrix using the given angles.
  // theta_array should contain one value per active rotational DOF (in the order: Rx, then Ry, then Rz).
  update_articulation(theta_array) {
    this.articulation_matrix = Mat4.identity();
    let index = 0;
    if (this.dof.Rx) {
      this.articulation_matrix.pre_multiply(
        Mat4.rotation(theta_array[index], 1, 0, 0)
      );
      index += 1;
    }
    if (this.dof.Ry) {
      this.articulation_matrix.pre_multiply(
        Mat4.rotation(theta_array[index], 0, 1, 0)
      );
      index += 1;
    }
    if (this.dof.Rz) {
      this.articulation_matrix.pre_multiply(
        Mat4.rotation(theta_array[index], 0, 0, 1)
      );
    }
  }

  // (Optional) Return the local axes from the articulation matrix.
  // Not used in the Jacobian since we compute axes from the parent's global transform.
  get_joint_axes() {
    const rotation_matrix = this.articulation_matrix.submatrix(0, 0, 3, 3);
    const axes = [];
    axes.push(rotation_matrix[0]);
    axes.push(rotation_matrix[1]);
    axes.push(rotation_matrix[2]);
    return axes;
  }
}

// You are free to modify or add additional classes.
class End_Effector {
  constructor(name, parent, local_position) {
    this.name = name;
    this.parent = parent;
    this.local_position = local_position;
    this.global_position = null;
  }
}
