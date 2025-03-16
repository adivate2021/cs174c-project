import { tiny, defs } from "./examples/common.js";
// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } =
  tiny;

const shapes = {
  sphere: new defs.Subdivision_Sphere(5),
};

export const Claw = class Articulated_Human {
  constructor(scale, middle_knuckle_bend) {
    this.scale = scale;
    this.middle_knuckle_bend = middle_knuckle_bend;
    const sphere_shape = shapes.sphere;
    // joint closest to center of the claw
    this.max_upper_knuckle_bend = 0.15;

    this.end_effector_offset = 0.4;
    this.end_effector_node_scale = 0.1;
    // Root position of the claw
    let claw_transform = Mat4.translation(0, 0, 0); // Root at (0, 0, 0)
    const claw_scale = scale * 0.1;
    this.claw_node = new Node(
      "claw",
      sphere_shape,
      Mat4.scale(claw_scale, claw_scale, claw_scale).post_multiply(
        claw_transform
      )
    ); // No shape for root

    const root_location = Mat4.translation(0, 1, 0);
    this.root = new Arc("root", null, this.claw_node, root_location);

    let displacement = 0.05;
    const finger_positions = [
      Mat4.translation(scale * displacement, 0, 0), // East
      Mat4.translation(0, 0, -scale * displacement), // South
      Mat4.translation(-scale * displacement, 0, 0), // West
      Mat4.translation(0, 0, scale * displacement), // North
    ];

    this.fingers = [];
    this.end_effectors = [];

    // #region Finger 1
    let knuckle_transform = Mat4.scale(
      scale * 0.25,
      scale * 0.05,
      scale * 0.05
    );
    knuckle_transform.post_multiply(Mat4.translation(scale * 1.5, 0, 0));
    let upper_finger = new Node(
      `finger${0}_knuckle`,
      sphere_shape,
      knuckle_transform
    );

    let upper_knuckle = new Arc(
      `finger${0}_upper_knuckle`,
      this.claw_node, // Attach to claw root
      upper_finger,
      finger_positions[0] // Offset for each finger (North, East, South, West)
    );
    this.claw_node.children_arcs.push(upper_knuckle);
    upper_knuckle.set_dof(false, false, false, false, false, true); // Enable rotation

    //   Lower finger (middle joint) – reworked to incorporate the offset into the node transform
    // First rotate, then translate, then scale the lower finger
    let lower_finger_transform = Mat4.scale(
      this.scale * 0.2,
      this.scale * 0.05,
      this.scale * 0.05
    );
    lower_finger_transform.pre_multiply(
      Mat4.translation(this.scale * 0.2, 0, 0)
    );
    // lower_finger_transform.pre_multiply(
    //   Mat4.rotation(middle_knuckle_bend, 0, 0, 1)
    // );
    // lower_finger_transform.pre_multiply(finger_rotations[0])
    let lower_finger = new Node(
      `finger${0}_middle`,
      sphere_shape,
      lower_finger_transform
    );

    let middle_knuckle_transform = Mat4.translation(this.scale * 0.55, 0, 0);
    let middle_knuckle = new Arc(
      `finger${0}_middle_knuckle`,
      upper_finger, // Attach to the upper finger
      lower_finger,
      middle_knuckle_transform
    );
    upper_finger.children_arcs.push(middle_knuckle);
    middle_knuckle.set_dof(false, false, false, false, false, true); // Enable rotation

    this.fingers.push({ knuckle: upper_knuckle });

    let fingertip_node_transform = Mat4.scale(0.1, 0.1, 0.1).pre_multiply(
      Mat4.translation(this.end_effector_offset * this.scale, 0, 0)
    );
    // fingertip_node_transform.pre_multiply(
    //   Mat4.rotation(middle_knuckle_bend, 0, 0, 1)
    // );
    let fingertip_node = new Node(
      "fingertip_0",
      sphere_shape,
      fingertip_node_transform
    );

    let fingertip_transform_1 = Mat4.translation(this.scale * 0.1, 0, 0);
    this.fingertip_1 = new Arc(
      "finger0_tip",
      lower_finger,
      fingertip_node,
      fingertip_transform_1
    );
    lower_finger.children_arcs.push(this.fingertip_1);

    let fingertip1_local_pos = vec4(0, 0, 0, 1);
    this.end_effector_1 = new End_Effector(
      "end_1",
      this.fingertip_1,
      fingertip1_local_pos
    );
    this.fingertip_1.end_effector = this.end_effector_1;
    this.end_effectors.push(this.end_effector_1);

    // #endregion

    // #region Finger 2
    let knuckle_transform2 = Mat4.scale(
      this.scale * 0.05,
      this.scale * 0.05,
      this.scale * 0.25
    );
    knuckle_transform2.pre_multiply(Mat4.translation(0, 0, this.scale * -0.3));
    let upper_finger2 = new Node(
      `finger${1}_knuckle`,
      sphere_shape,
      knuckle_transform2
    );

    let upper_knuckle2 = new Arc(
      `finger${1}_upper_knuckle`,
      this.claw_node, // Attach to claw root
      upper_finger2,
      finger_positions[1] // Offset for each finger (North, East, South, West)
    );
    this.claw_node.children_arcs.push(upper_knuckle2);
    upper_knuckle2.set_dof(false, false, false, true, false, false); // Enable rotation

    //   Lower finger (middle joint) – reworked to incorporate the offset into the node transform
    // First rotate, then translate, then scale the lower finger
    let lower_finger_transform2 = Mat4.scale(
      this.scale * 0.05,
      this.scale * 0.05,
      this.scale * -0.2
    );
    lower_finger_transform2.pre_multiply(
      Mat4.translation(0, 0, this.scale * -0.2)
    );
    // lower_finger_transform2.pre_multiply(
    //   Mat4.rotation(middle_knuckle_bend, 1, 0, 0)
    // );

    // lower_finger_transform2.pre_multiply(finger_rotations[0])
    let lower_finger2 = new Node(
      `finger${1}_middle`,
      sphere_shape,
      lower_finger_transform2
    );

    // Use an identity location matrix so that the lower finger's transform is applied in the parent's (rotated) frame.
    let middle_knuckle_transform2 = Mat4.translation(0, 0, this.scale * -0.55);
    let middle_knuckle2 = new Arc(
      `finger${1}_middle_knuckle2`,
      upper_finger2, // Attach to the upper finger
      lower_finger2,
      middle_knuckle_transform2
    );
    upper_finger2.children_arcs.push(middle_knuckle2);
    middle_knuckle2.set_dof(false, false, false, true, false, false); // Enable rotation

    this.fingers.push({ knuckle: upper_knuckle2 });

    let fingertip_node_transform_2 = Mat4.scale(0.1, 0.1, 0.1).pre_multiply(
      Mat4.translation(0, 0, -1 * this.scale * this.end_effector_offset)
    );

    let fingertip_node2 = new Node(
      "fingertip_1",
      sphere_shape,
      fingertip_node_transform_2
    );
    let fingertip_transform_2 = Mat4.translation(0, 0, -1 * this.scale * 0.1);
    this.fingertip_2 = new Arc(
      "finger2_tip",
      lower_finger,
      fingertip_node2,
      fingertip_transform_2
    );
    lower_finger2.children_arcs.push(this.fingertip_2);
    let fingertip2_local_pos = vec4(0, 0, 0, 1);
    this.end_effector_2 = new End_Effector(
      "end_2",
      this.fingertip_2,
      fingertip2_local_pos
    );
    this.fingertip_2.end_effector = this.end_effector_2;
    this.end_effectors.push(this.end_effector_2);
    // #endregion

    // #region Finger 3
    let knuckle_transform_3 = Mat4.scale(
      scale * 0.25,
      scale * 0.05,
      scale * 0.05
    );
    knuckle_transform_3.pre_multiply(Mat4.translation(scale * -0.3, 0, 0));
    let upper_finger_3 = new Node(
      `finger${2}_knuckle`,
      sphere_shape,
      knuckle_transform_3
    );

    let upper_knuckle_3 = new Arc(
      `finger${2}_upper_knuckle`,
      this.claw_node, // Attach to claw root
      upper_finger_3,
      finger_positions[2] // Offset for each finger (North, East, South, West)
    );
    this.claw_node.children_arcs.push(upper_knuckle_3);
    upper_knuckle_3.set_dof(false, false, false, false, false, true); // Enable rotation

    //   Lower finger (middle joint) – reworked to incorporate the offset into the node transform
    // First rotate, then translate, then scale the lower finger
    let lower_finger_transform_3 = Mat4.scale(
      scale * 0.2,
      scale * 0.05,
      scale * 0.05
    );
    lower_finger_transform_3.pre_multiply(Mat4.translation(scale * -0.2, 0, 0));
    // lower_finger_transform_3.pre_multiply(
    //   Mat4.rotation(-middle_knuckle_bend, 0, 0, 1)
    // );

    // lower_finger_transform.pre_multiply(finger_rotations[0])
    let lower_finger_3 = new Node(
      `finger${3}_middle`,
      sphere_shape,
      lower_finger_transform_3
    );

    // Use an identity location matrix so that the lower finger's transform is applied in the parent's (rotated) frame.
    let middle_knuckle_transform_3 = Mat4.translation(scale * -0.55, 0, 0);
    let middle_knuckle_3 = new Arc(
      `finger${2}_middle_knuckle`,
      upper_finger_3, // Attach to the upper finger
      lower_finger_3,
      middle_knuckle_transform_3
    );
    upper_finger_3.children_arcs.push(middle_knuckle_3);
    middle_knuckle_3.set_dof(false, false, false, false, false, true); // Enable rotation

    this.fingers.push({ knuckle: upper_knuckle_3 });

    let fingertip_node_transform_3 = Mat4.scale(0.1, 0.1, 0.1).pre_multiply(
      Mat4.translation(-1 * this.scale * this.end_effector_offset, 0, 0)
    );

    let fingertip_node3 = new Node(
      "fingertip_3",
      sphere_shape,
      fingertip_node_transform_3
    );
    let fingertip_transform_3 = Mat4.translation(-1 * this.scale * 0.1, 0, 0);
    this.fingertip_3 = new Arc(
      "finger3_tip",
      lower_finger_3,
      fingertip_node3,
      fingertip_transform_3
    );
    lower_finger_3.children_arcs.push(this.fingertip_3);
    let fingertip3_local_pos = vec4(0, 0, 0, 1);
    this.end_effector_3 = new End_Effector(
      "end_3",
      this.fingertip_3,
      fingertip3_local_pos
    );
    this.end_effectors.push(this.end_effector_3);
    this.fingertip_3.end_effector = this.end_effector_3;

    // #endregion

    // #region Finger 4
    let knuckle_transform_4 = Mat4.scale(
      scale * 0.05,
      scale * 0.05,
      scale * 0.25
    );
    knuckle_transform_4.pre_multiply(Mat4.translation(0, 0, scale * 0.3));
    let upper_finger_4 = new Node(
      `finger${3}_knuckle`,
      sphere_shape,
      knuckle_transform_4
    );

    let upper_knuckle_4 = new Arc(
      `finger${3}_upper_knuckle`,
      this.claw_node, // Attach to claw root
      upper_finger_4,
      finger_positions[3] // Offset for each finger (North, East, South, West)
    );
    this.claw_node.children_arcs.push(upper_knuckle_4);
    upper_knuckle2.set_dof(false, false, false, true, false, false); // Enable rotation

    //   Lower finger (middle joint) – reworked to incorporate the offset into the node transform
    // First rotate, then translate, then scale the lower finger
    let lower_finger_transform_4 = Mat4.scale(
      scale * 0.05,
      scale * 0.05,
      scale * 0.2
    );
    lower_finger_transform_4.pre_multiply(Mat4.translation(0, 0, scale * 0.2));
    // lower_finger_transform_4.pre_multiply(
    //   Mat4.rotation(-middle_knuckle_bend, 1, 0, 0)
    // );

    // lower_finger_transform2.pre_multiply(finger_rotations[0])
    let lower_finger_4 = new Node(
      `finger${3}_middle`,
      sphere_shape,
      lower_finger_transform_4
    );

    // Use an identity location matrix so that the lower finger's transform is applied in the parent's (rotated) frame.
    let middle_knuckle_transform_4 = Mat4.translation(0, 0, scale * 0.55);
    let middle_knuckle_4 = new Arc(
      `finger${3}_middle_knuckle_4`,
      upper_finger_4, // Attach to the upper finger
      lower_finger_4,
      middle_knuckle_transform_4
    );
    upper_finger_4.children_arcs.push(middle_knuckle_4);
    middle_knuckle_4.set_dof(false, false, false, true, false, false); // Enable rotation

    this.fingers.push({ knuckle: upper_knuckle_4 });
    let fingertip_node_transform_4 = Mat4.scale(0.1, 0.1, 0.1).pre_multiply(
      Mat4.translation(0, 0, 1 * this.scale * this.end_effector_offset)
    );

    let fingertip_node4 = new Node(
      "fingertip_4",
      sphere_shape,
      fingertip_node_transform_4
    );
    let fingertip_transform_4 = Mat4.translation(0, 0, this.scale * 0.1);
    this.fingertip_4 = new Arc(
      "finger4_tip",
      lower_finger_4,
      fingertip_node4,
      fingertip_transform_4
    );
    lower_finger_4.children_arcs.push(this.fingertip_4);
    let fingertip4_local_pos = vec4(0, 0, 0, 1);
    this.end_effector_4 = new End_Effector(
      "end_4",
      this.fingertip_4,
      fingertip4_local_pos
    );
    this.end_effectors.push(this.end_effector_4);
    this.fingertip_4.end_effector = this.end_effector_4;

    // #endregion

    // We have 7 rotational DOF along the right arm chain:
    // r_shoulder (3) + r_elbow (2) + r_wrist (2) = 7
    this.dof = 7;
    // global theta array (one value per DOF, initially all set to 1)

    this.theta = [
      0.1,
      this.middle_knuckle_bend,
      0.1,
      this.middle_knuckle_bend,
      0.1,
      this.middle_knuckle_bend,
      0.1,
      this.middle_knuckle_bend,
    ];
    this.apply_theta();
  }

  // Update each joint’s articulation using the corresponding theta values.
  apply_theta() {
    const joints = this.get_joints_in_order(); // expected order: [r_shoulder, r_elbow, r_wrist]
    let thetaIndex = 0;
    console.log("getting here");
    for (const joint of joints) {
      joint.update_articulation(this.theta[thetaIndex], thetaIndex);
      thetaIndex += 1;
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
  get_end_effector_positions() {
    this.matrix_stack = [];
    this._rec_update(this.root, Mat4.identity());
    return this.end_effectors.map((v) => v.global_position);
  }
  // Return the joints as a BFS traversal from the root
  get_joints_in_order() {
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

  update(theta) {
    this.theta = theta;
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
  _rec_update(arc, parent_matrix) {
    if (arc != null) {
      arc.joint_transform = parent_matrix.times(arc.location_matrix);
      parent_matrix.post_multiply(
        arc.location_matrix.times(arc.articulation_matrix)
      );
      this.matrix_stack.push(parent_matrix.copy());

      const node = arc.child_node;
      parent_matrix.post_multiply(node.transform_matrix);
      if (arc.end_effector) {
        arc.end_effector.global_position = parent_matrix.times(
          arc.end_effector.local_position
        );
      }

      parent_matrix = this.matrix_stack.pop();
      for (const child_arc of arc.child_node.children_arcs) {
        this.matrix_stack.push(parent_matrix.copy());
        this._rec_update(child_arc, parent_matrix);
        parent_matrix = this.matrix_stack.pop();
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
  update_articulation(theta, idx) {
    const axes_of_rotation = [
      [0, 0, 1],
      [0, 0, 1],
      [1, 0, 0],
      [1, 0, 0],
      [0, 0, -1],
      [0, 0, -1],
      [-1, 0, 0],
      [-1, 0, 0],
    ];
    console.log("getting here");
    // this.articulation_matrix = Mat4.identity();
    this.articulation_matrix.pre_multiply(
      Mat4.rotation(
        theta,
        axes_of_rotation[idx][0],
        axes_of_rotation[idx][1],
        axes_of_rotation[idx][2]
      )
    );
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
