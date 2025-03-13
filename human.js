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
    const middle_knuckle_bend = 1.1
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

		let displacement = 0.05;
		const finger_positions = [
      Mat4.translation(displacement, 0, 0), // East
			Mat4.translation(0, 0, -1 *displacement), // South
			Mat4.translation(-1 * displacement, 0, 0), // West
			Mat4.translation(0, 0, displacement), // North
		];

		this.fingers = [];

		// #region Finger 1
		let knuckle_transform = Mat4.scale(0.25, 0.05, 0.05);
		knuckle_transform.pre_multiply(Mat4.translation(0.3, 0, 0));
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
    let lower_finger_transform = Mat4.scale(0.2, 0.05, 0.05)
    lower_finger_transform.pre_multiply(Mat4.translation(0.2, 0, 0))
    lower_finger_transform.pre_multiply(Mat4.rotation(middle_knuckle_bend, 0, 0, 1))
    // lower_finger_transform.pre_multiply(finger_rotations[0])
		let lower_finger = new Node(
			`finger${0}_middle`,
			sphere_shape,
      lower_finger_transform
		);

		// Use an identity location matrix so that the lower finger's transform is applied in the parent's (rotated) frame.
		let middle_knuckle_transform = Mat4.translation(0.55, 0, 0);
		let middle_knuckle = new Arc(
			`finger${0}_middle_knuckle`,
			upper_finger, // Attach to the upper finger
			lower_finger,
			middle_knuckle_transform
		);
		upper_finger.children_arcs.push(middle_knuckle);
		middle_knuckle.set_dof(false, false, false, false, false, true); // Enable rotation

		this.fingers.push({ knuckle: upper_knuckle });

    // #endregion


    // #region Finger 2
		let knuckle_transform2 = Mat4.scale(0.05, 0.05, 0.25);
		knuckle_transform2.pre_multiply(Mat4.translation(0, 0, -0.3));
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
    let lower_finger_transform2 = Mat4.scale(0.05, 0.05, -0.2)
    lower_finger_transform2.pre_multiply(Mat4.translation(0, 0, -0.2))
    lower_finger_transform2.pre_multiply(Mat4.rotation(middle_knuckle_bend, 1, 0, 0))

    // lower_finger_transform2.pre_multiply(finger_rotations[0])
		let lower_finger2 = new Node(
			`finger${1}_middle`,
			sphere_shape,
      lower_finger_transform2
		);

		// Use an identity location matrix so that the lower finger's transform is applied in the parent's (rotated) frame.
		let middle_knuckle_transform2 = Mat4.translation(0, 0, -0.55);
		let middle_knuckle2 = new Arc(
			`finger${1}_middle_knuckle2`,
			upper_finger2, // Attach to the upper finger
			lower_finger2,
			middle_knuckle_transform2
		);
		upper_finger2.children_arcs.push(middle_knuckle2);
		middle_knuckle2.set_dof(false, false, false, true, false, false); // Enable rotation

		this.fingers.push({ knuckle: upper_knuckle2 });

    // #endregion

    // #region Finger 3
		let knuckle_transform_3 = Mat4.scale(0.25, 0.05, 0.05);
		knuckle_transform_3.pre_multiply(Mat4.translation(-0.3, 0, 0));
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
    let lower_finger_transform_3 = Mat4.scale(0.2, 0.05, 0.05)
    lower_finger_transform_3.pre_multiply(Mat4.translation(-0.2, 0, 0))
    lower_finger_transform_3.pre_multiply(Mat4.rotation(-middle_knuckle_bend, 0, 0, 1))

    // lower_finger_transform.pre_multiply(finger_rotations[0])
		let lower_finger_3 = new Node(
			`finger${3}_middle`,
			sphere_shape,
      lower_finger_transform_3
		);

		// Use an identity location matrix so that the lower finger's transform is applied in the parent's (rotated) frame.
		let middle_knuckle_transform_3 = Mat4.translation(-0.55, 0, 0);
		let middle_knuckle_3 = new Arc(
			`finger${2}_middle_knuckle`,
			upper_finger_3, // Attach to the upper finger
			lower_finger_3,
			middle_knuckle_transform_3
		);
		upper_finger_3.children_arcs.push(middle_knuckle_3);
		middle_knuckle_3.set_dof(false, false, false, false, false, true); // Enable rotation

		this.fingers.push({ knuckle: upper_knuckle_3 });

    // #endregion


    // #region Finger 4
		let knuckle_transform_4 = Mat4.scale(0.05, 0.05, 0.25);
		knuckle_transform_4.pre_multiply(Mat4.translation(0, 0, 0.3));
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
    let lower_finger_transform_4 = Mat4.scale(0.05, 0.05, 0.2)
    lower_finger_transform_4.pre_multiply(Mat4.translation(0, 0, 0.2))
    lower_finger_transform_4.pre_multiply(Mat4.rotation(-middle_knuckle_bend, 1, 0, 0))

    // lower_finger_transform2.pre_multiply(finger_rotations[0])
		let lower_finger_4 = new Node(
			`finger${3}_middle`,
			sphere_shape,
      lower_finger_transform_4
		);

		// Use an identity location matrix so that the lower finger's transform is applied in the parent's (rotated) frame.
		let middle_knuckle_transform_4 = Mat4.translation(0, 0, 0.55);
		let middle_knuckle_4 = new Arc(
			`finger${3}_middle_knuckle_4`,
			upper_finger_4, // Attach to the upper finger
			lower_finger_4,
			middle_knuckle_transform_4
		);
		upper_finger_4.children_arcs.push(middle_knuckle_4);
		middle_knuckle_4.set_dof(false, false, false, true, false, false); // Enable rotation

		this.fingers.push({ knuckle: upper_knuckle_4 });

    // #endregion




		// We have 7 rotational DOF along the right arm chain:
		// r_shoulder (3) + r_elbow (2) + r_wrist (2) = 7
		this.dof = 7;
		// global theta array (one value per DOF, initially all set to 1)

		this.theta = 0;
		this.apply_theta();
	}

	// Update each joint’s articulation using the corresponding theta values.
	apply_theta() {
		const joints = this.get_joints_in_order(); // expected order: [r_shoulder, r_elbow, r_wrist]
		let thetaIndex = 0;
    console.log("getting here")
		for (const joint of joints) {
				joint.update_articulation(this.theta, thetaIndex);
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

	// Return the joints along the right arm chain in order from base to tip.
	get_joints_in_order() {
		// We skip the root since it has no rotational DOF for IK.
		let temp = [];
		for (let knuckle of this.claw_node.children_arcs) {
			temp.push(knuckle);
			// if (knuckle.child_node.children_arcs.length > 0) {
			// 	temp.push(knuckle.child_node.children_arcs[0]);
			// }
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

	update(theta) {
		this.theta = theta
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
				this._rec_draw(
					next_arc,
					matrix,
					webgl_manager,
					uniforms,
					material
				);
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
	update_articulation(theta, idx) {
    const axes_of_rotation = [
      [0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0]
    ]
    console.log("getting here")
		// this.articulation_matrix = Mat4.identity();
    this.articulation_matrix.pre_multiply(
      Mat4.rotation(theta, axes_of_rotation[idx][0], axes_of_rotation[idx][1], axes_of_rotation[idx][2])
    )
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
