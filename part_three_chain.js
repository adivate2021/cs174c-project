import { tiny, defs } from "./examples/common.js";

import { Part_one_hermite_base, Part_one_hermite } from "./part_one_hermite.js";
import {
  Particle,
  Spring,
  Simulation,
  Part_two_spring_base,
  Part_two_spring,
} from "./part_two_spring.js";
import { Articulated_Human } from "./human.js";
// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } =
  tiny;

class Chain_Sim {
  constructor() {
    this.chainSim = new Simulation();
    for (let i = 0; i < 3; i++) {
      this.chainSim.particles.push(new Particle());
      this.chainSim.particles[i].mass = 1;
      this.chainSim.particles[i].pos = vec3(0, 5 - 0.5 * i, 0);
      this.chainSim.particles[i].vel = vec3(0, 0, 0);
      this.chainSim.particles[i].valid = true;
    }
    for (let i = 0; i < 2; i++) {
      this.chainSim.springs.push(new Spring());
      this.chainSim.springs[i].particle_1 = this.chainSim.particles[i];
      this.chainSim.springs[i].particle_2 = this.chainSim.particles[i + 1];
      this.chainSim.springs[i].ks = 500;
      this.chainSim.springs[i].kd = 10;
      this.chainSim.springs[i].rest_length = 0.5;
      this.chainSim.springs[i].valid = true;
    }
    this.chainSim.particles.push(new Particle());
    this.chainSim.particles[3].mass = 1;
    this.chainSim.particles[3].pos = vec3(1.5, 3, 0);
    this.chainSim.particles[3].vel = vec3(0, 0, 0);
    this.chainSim.particles[3].valid = true;
    this.chainSim.springs.push(new Spring());
    this.chainSim.springs[2].particle_1 = this.chainSim.particles[2];
    this.chainSim.springs[2].particle_2 = this.chainSim.particles[3];
    this.chainSim.springs[2].ks = 5000;
    this.chainSim.springs[2].kd = 10;
    this.chainSim.springs[2].rest_length = 2.5;
    this.chainSim.springs[2].valid = true;
    this.chainSim.particles.push(new Particle());
    this.chainSim.particles[4].mass = 1;
    this.chainSim.particles[4].pos = vec3(-0.75, 3, 1.3);
    this.chainSim.particles[4].vel = vec3(0, 0, 0);
    this.chainSim.particles[4].valid = true;
    this.chainSim.springs.push(new Spring());
    this.chainSim.springs[3].particle_1 = this.chainSim.particles[2];
    this.chainSim.springs[3].particle_2 = this.chainSim.particles[4];
    this.chainSim.springs[3].ks = 5000;
    this.chainSim.springs[3].kd = 10;
    this.chainSim.springs[3].rest_length = 2.5;
    this.chainSim.springs[3].valid = true;
    this.chainSim.particles.push(new Particle());
    this.chainSim.particles[5].mass = 1;
    this.chainSim.particles[5].pos = vec3(-0.75, 3, -1.3);
    this.chainSim.particles[5].vel = vec3(0, 0, 0);
    this.chainSim.particles[5].valid = true;
    this.chainSim.springs.push(new Spring());
    this.chainSim.springs[4].particle_1 = this.chainSim.particles[2];
    this.chainSim.springs[4].particle_2 = this.chainSim.particles[5];
    this.chainSim.springs[4].ks = 5000;
    this.chainSim.springs[4].kd = 10;
    this.chainSim.springs[4].rest_length = 2.5;
    this.chainSim.springs[4].valid = true;

    this.chainSim.g_acc = vec3(0, -9.8, 0);
    this.chainSim.ground_ks = 5000;
    this.chainSim.ground_kd = 10;
    this.chainSim.particles[0].ext_force = vec3(0, 0, 0);
    this.chainSim.particles[0].acc = vec3(0, 0, 0);
    this.chainSim.particles[0].vel = vec3(0, 0, 0);
  }
}
class Curve_Shape extends Shape {
  // curve_function: (t) => vec3
  constructor(curve_function, sample_count, curve_color = color(1, 0, 0, 1)) {
    super("position", "normal");

    this.material = {
      shader: new defs.Phong_Shader(),
      ambient: 1.0,
      color: curve_color,
    };
    this.sample_count = sample_count;

    if (curve_function && this.sample_count) {
      for (let i = 0; i < this.sample_count + 1; i++) {
        let t = i / this.sample_count;
        this.arrays.position.push(curve_function(t));
        this.arrays.normal.push(vec3(0, 0, 0)); // have to add normal to make Phong shader work.
      }
    }
  }

  draw(webgl_manager, uniforms) {
    // call super with "LINE_STRIP" mode
    super.draw(
      webgl_manager,
      uniforms,
      Mat4.identity(),
      this.material,
      "LINE_STRIP"
    );
  }

  update(webgl_manager, uniforms, curve_function) {
    if (curve_function && this.sample_count) {
      // for (let i = 0; i < this.sample_count + 1; i++) {
      //   let t = 1.0 * i / this.sample_count;
      //   this.arrays.position[i] = curve_function(t);
      let step_size = 1 / this.sample_count;
      for (let t = 0; t < 1; t += step_size) {
        let i = t * this.sample_count;
        this.arrays.position[i] = curve_function(t);
      }
    }
    // this.arrays.position.forEach((v, i) => v = curve_function(i / this.sample_count));
    this.copy_onto_graphics_card(webgl_manager.context);
    // Note: vertex count is not changed.
    // not tested if possible to change the vertex count.
  }
}

export const Part_three_chain_base =
  (defs.Part_three_chain_base = class Part_three_chain_base extends Component {
    // **My_Demo_Base** is a Scene that can be added to any display canvas.
    // This particular scene is broken up into two pieces for easier understanding.
    // The piece here is the base class, which sets up the machinery to draw a simple
    // scene demonstrating a few concepts.  A subclass of it, Part_one_hermite,
    // exposes only the display() method, which actually places and draws the shapes,
    // isolating that code so it can be experimented with on its own.
    init() {
      console.log("init");

      // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
      this.hover = this.swarm = false;
      // At the beginning of our program, load one of each of these shape
      // definitions onto the GPU.  NOTE:  Only do this ONCE per shape it
      // would be redundant to tell it again.  You should just re-use the
      // one called "box" more than once in display() to draw multiple cubes.
      // Don't define more than one blueprint for the same thing here.
      this.shapes = {
        box: new defs.Cube(),
        ball: new defs.Subdivision_Sphere(4),
        axis: new defs.Axis_Arrows(),
      };

      // *** Materials: ***  A "material" used on individual shapes specifies all fields
      // that a Shader queries to light/color it properly.  Here we use a Phong shader.
      // We can now tweak the scalar coefficients from the Phong lighting formulas.
      // Expected values can be found listed in Phong_Shader::update_GPU().
      const phong = new defs.Phong_Shader();
      const tex_phong = new defs.Textured_Phong();
      this.materials = {};
      this.materials.plastic = {
        shader: phong,
        ambient: 0.2,
        diffusivity: 1,
        specularity: 0.5,
        color: color(0.9, 0.5, 0.9, 1),
      };
      this.materials.metal = {
        shader: phong,
        ambient: 0.2,
        diffusivity: 1,
        specularity: 1,
        color: color(0.9, 0.5, 0.9, 1),
      };
      this.materials.rgb = {
        shader: tex_phong,
        ambient: 0.5,
        texture: new Texture("assets/rgb.jpg"),
      };

      this.ball_location = vec3(1, 1, 1);
      this.ball_radius = 0.25;

      this.chainSimulation = new Chain_Sim();
      this.dt = 1 / 60;
      this.sim_speed = 0.5;
      this.t_sim = 0;
      this.t_step = 1 / 1000;
      this.t_spline = 0;
      this.i_spline = 0;
      this.spline = [
        [0, 5, 0, -20, 0, 20],
        [0, 5, 5, 20, 0, 20],
        [5, 5, 5, 20, 0, -20],
        [5, 5, 0, -20, 0, -20],
        [0, 5, 0, -20, 0, 20],
      ];
      this.tangentScalingFactor = 0.25;
      this.curve_fn = null;
      this.sample_cnt = 0;
      // this.curve = new Curve_Shape(null, 100);
      this.curves = [];
      this.update_scene();
      this.human = new Articulated_Human();
    }

    render_animation(caller) {
      // display():  Called once per frame of animation.  We'll isolate out
      // the code that actually draws things into Part_one_hermite, a
      // subclass of this Scene.  Here, the base class's display only does
      // some initial setup.

      // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
      if (!caller.controls) {
        this.animated_children.push(
          (caller.controls = new defs.Movement_Controls({
            uniforms: this.uniforms,
          }))
        );
        caller.controls.add_mouse_controls(caller.canvas);

        // Define the global camera and projection matrices, which are stored in shared_uniforms.  The camera
        // matrix follows the usual format for transforms, but with opposite values (cameras exist as
        // inverted matrices).  The projection matrix follows an unusual format and determines how depth is
        // treated when projecting 3D points onto a plane.  The Mat4 functions perspective() or
        // orthographic() automatically generate valid matrices for one.  The input arguments of
        // perspective() are field of view, aspect ratio, and distances to the near plane and far plane.

        // !!! Camera changed here
        Shader.assign_camera(
          Mat4.look_at(vec3(10, 10, 10), vec3(0, 0, 0), vec3(0, 1, 0)),
          this.uniforms
        );
      }
      this.uniforms.projection_transform = Mat4.perspective(
        Math.PI / 4,
        caller.width / caller.height,
        1,
        100
      );

      // *** Lights: *** Values of vector or point lights.  They'll be consulted by
      // the shader when coloring shapes.  See Light's class definition for inputs.
      const t = (this.t = this.uniforms.animation_time / 1000);
      const angle = Math.sin(t);

      // const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,-1,1,0 ) ); !!!
      // !!! Light changed here
      const light_position = vec4(
        20 * Math.cos(angle),
        20,
        20 * Math.sin(angle),
        1.0
      );
      this.uniforms.lights = [
        defs.Phong_Shader.light_source(
          light_position,
          color(1, 1, 1, 1),
          1000000
        ),
      ];

      // draw axis arrows.
      // this.shapes.axis.draw(caller, this.uniforms, Mat4.identity(), this.materials.rgb);
    }
  });

export class Claw_Scene extends Part_three_chain_base {
  // **Part_one_hermite** is a Scene object that can be added to any display canvas.
  // This particular scene is broken up into two pieces for easier understanding.
  // See the other piece, My_Demo_Base, if you need to see the setup code.
  // The piece here exposes only the display() method, which actually places and draws
  // the shapes.  We isolate that code so it can be experimented with on its own.
  // This gives you a very small code sandbox for editing a simple scene, and for
  // experimenting with matrix transformations.
  render_animation(caller) {
    // display():  Called once per frame of animation.  For each shape that you want to
    // appear onscreen, place a .draw() call for it inside.  Each time, pass in a
    // different matrix value to control where the shape appears.

    // Variables that are in scope for you to use:
    // this.shapes.box:   A vertex array object defining a 2x2x2 cube.
    // this.shapes.ball:  A vertex array object defining a 2x2x2 spherical surface.
    // this.materials.metal:    Selects a shader and draws with a shiny surface.
    // this.materials.plastic:  Selects a shader and draws a more matte surface.
    // this.lights:  A pre-made collection of Light objects.
    // this.hover:  A boolean variable that changes when the user presses a button.
    // shared_uniforms:  Information the shader needs for drawing.  Pass to draw().
    // caller:  Wraps the WebGL rendering context shown onscreen.  Pass to draw().

    // Call the setup code that we left inside the base class:
    super.render_animation(caller);

    /**********************************
     Start coding down here!!!!
     **********************************/
    // From here on down it's just some example shapes drawn for you -- freely
    // replace them with your own!  Notice the usage of the Mat4 functions
    // translation(), scale(), and rotation() to generate matrices, and the
    // function times(), which generates products of matrices.

    const blue = color(0, 0, 1, 1),
      yellow = color(0.7, 1, 0, 1);

    const t = (this.t = this.uniforms.animation_time / 1000);

    // !!! Draw ground
    let floor_transform = Mat4.translation(0, 0, 0).times(
      Mat4.scale(10, 0.01, 10)
    );
    this.shapes.box.draw(caller, this.uniforms, floor_transform, {
      ...this.materials.plastic,
      color: yellow,
    });

    // !!! Draw ball (for reference)
    // let ball_transform = Mat4.translation(this.ball_location[0], this.ball_location[1], this.ball_location[2])
    //     .times(Mat4.scale(this.ball_radius, this.ball_radius, this.ball_radius));
    // this.shapes.ball.draw( caller, this.uniforms, ball_transform, { ...this.materials.metal, color: blue } );

    let dt = (this.dt = 1 / 60);
    dt *= this.sim_speed;
    let t_step = this.t_step;
    let t_sim = 0;
    let t_next = t_sim + dt;
    for (let i = 0; i < this.curves.length; i++) {
      this.curves[i].draw(caller, this.uniforms);
    }
    for (; t_sim <= t_next; t_sim += t_step) {
      // this.simulation_obj.update(dt);
      this.chainSimulation.chainSim.update(t_sim);
      this.chainSimulation.chainSim.particles[0].ext_force = vec3(0, 0, 0);
      this.chainSimulation.chainSim.particles[0].acc = vec3(0, 0, 0);
      this.chainSimulation.chainSim.particles[0].vel = vec3(0, 0, 0);
    }
    let prevPoint = this.spline[0];
    let currPoint = this.spline[1];
    let tangentScalingFactor = this.tangentScalingFactor;
    if (this.t_spline >= 1) {
      this.i_spline += 1;
      this.t_spline = 0;
    }
    if (this.i_spline >= 4) {
      this.i_spline = 0;
    }
    if (this.i_spline >= 0 && this.i_spline < 1) {
      prevPoint = this.spline[0];
      currPoint = this.spline[1];
    }
    if (this.i_spline >= 1 && this.i_spline < 2) {
      prevPoint = this.spline[1];
      currPoint = this.spline[2];
    }
    if (this.i_spline >= 2 && this.i_spline < 3) {
      prevPoint = this.spline[2];
      currPoint = this.spline[3];
    }
    if (this.i_spline >= 3 && this.i_spline < 4) {
      prevPoint = this.spline[3];
      currPoint = this.spline[4];
    }
    let x0 = prevPoint[0];
    let x1 = currPoint[0];
    let y0 = prevPoint[1];
    let y1 = currPoint[1];
    let z0 = prevPoint[2];
    let z1 = currPoint[2];
    let sx0 = prevPoint[3];
    let sx1 = currPoint[3];
    let sy0 = prevPoint[4];
    let sy1 = currPoint[4];
    let sz0 = prevPoint[5];
    let sz1 = currPoint[5];
    let prevx = x0;
    let prevy = y0;
    let prevz = z0;
    let f1_val = this.f1(this.t_spline);
    let f2_val = this.f2(this.t_spline);
    let f3_val = this.f3(this.t_spline);
    let f4_val = this.f4(this.t_spline);
    let x =
      f1_val * x0 +
      f2_val * x1 +
      f3_val * sx0 * tangentScalingFactor +
      f4_val * sx1 * tangentScalingFactor;
    let y =
      f1_val * y0 +
      f2_val * y1 +
      f3_val * sy0 * tangentScalingFactor +
      f4_val * sy1 * tangentScalingFactor;
    let z =
      f1_val * z0 +
      f2_val * z1 +
      f3_val * sz0 * tangentScalingFactor +
      f4_val * sz1 * tangentScalingFactor;
    this.chainSimulation.chainSim.particles[0].pos = vec3(x, y, z);
    this.chainSimulation.chainSim.particles[1].pos = vec3(x, y - 0.5, z);
    this.chainSimulation.chainSim.particles[2].pos = vec3(x, y - 1, z);
    this.chainSimulation.chainSim.particles[3].pos = vec3(1.5 + x, y - 2, z);
    this.chainSimulation.chainSim.particles[4].pos = vec3(
      x - 0.75,
      y - 2,
      z + 1.3
    );
    this.chainSimulation.chainSim.particles[5].pos = vec3(
      x - 0.75,
      y - 2,
      z - 1.3
    );
    this.t_spline += 0.005;
    this.chainSimulation.chainSim.draw(
      caller,
      this.uniforms,
      this.shapes,
      this.materials
    );
    let box_transform = Mat4.translation(5, 0.2, 0).times(
      Mat4.scale(0.2, 0.2, 0.2)
    );
    this.shapes.box.draw(caller, this.uniforms, box_transform, {
      ...this.materials.metal,
      color: blue,
    });
    box_transform = Mat4.translation(0, 0.2, 5).times(
      Mat4.scale(0.2, 0.2, 0.2)
    );
    this.shapes.box.draw(caller, this.uniforms, box_transform, {
      ...this.materials.metal,
      color: blue,
    });
    box_transform = Mat4.translation(5, 0.2, 5).times(
      Mat4.scale(0.2, 0.2, 0.2)
    );
    this.shapes.box.draw(caller, this.uniforms, box_transform, {
      ...this.materials.metal,
      color: blue,
    });
    let toy_transform = Mat4.translation(3, 0.2, 3).times(
      Mat4.scale(0.2, 0.2, 0.2)
    );
    this.shapes.ball.draw(caller, this.uniforms, toy_transform, {
      ...this.materials.metal,
      color: blue,
    });
    toy_transform = Mat4.translation(1, 0.2, 2).times(
      Mat4.scale(0.2, 0.2, 0.2)
    );
    this.shapes.ball.draw(caller, this.uniforms, toy_transform, {
      ...this.materials.metal,
      color: blue,
    });
    toy_transform = Mat4.translation(2, 0.2, 4).times(
      Mat4.scale(0.2, 0.2, 0.2)
    );
    this.shapes.ball.draw(caller, this.uniforms, toy_transform, {
      ...this.materials.metal,
      color: blue,
    });
    this.human.draw(caller, this.uniforms, this.materials.plastic);
  }
  f1(t) {
    return 2 * t ** 3 - 3 * t ** 2 + 1;
  }
  f2(t) {
    return -2 * t ** 3 + 3 * t ** 2;
  }
  f3(t) {
    return t ** 3 - 2 * t ** 2 + t;
  }
  f4(t) {
    return t ** 3 - t ** 2;
  }

  render_controls() {
    // render_controls(): Sets up a panel of interactive HTML elements, including
    // buttons with key bindings for affecting this scene, and live info readouts.
    this.control_panel.innerHTML += "Claw Buttons";
    this.new_line();

    this.key_triggered_button("LOWER", ["l"], function () {
      // let text = document.getElementById("input").value;
      // console.log(text);
      // document.getElementById("output").value = text;
    });
    this.new_line();
    this.key_triggered_button("OPEN/CLOSE", ["o"], function () {});
    /*this.new_line();
    this.key_triggered_button( "Relocate", [ "r" ], function() {
      let text = document.getElementById("input").value;
      const words = text.split(' ');
      if (words.length >= 3) {
        const x = parseFloat(words[0]);
        const y = parseFloat(words[1]);
        const z = parseFloat(words[2]);
        this.ball_location = vec3(x, y, z)
        document.getElementById("output").value = "success";
      }
      else {
        document.getElementById("output").value = "invalid input";
      }
    } );
     */
  }

  parse_commands() {
    document.getElementById("output").value = "parse_commands";
    //TODO
  }

  start() {
    // callback for Run button
    document.getElementById("output").value = "start";
    //TODO
  }
  update_scene() {
    // callback for Draw button
    // document.getElementById("output").value = "update_scene";
    let tangentScalingFactor = 1;
    if (this.spline.length >= 2) {
      tangentScalingFactor = 1 / (this.spline.length - 1);
    }
    for (let i = 1; i < this.spline.length; i++) {
      let prevPoint = this.spline[i - 1];
      let currPoint = this.spline[i];
      let x0 = prevPoint[0];
      let x1 = currPoint[0];
      let y0 = prevPoint[1];
      let y1 = currPoint[1];
      let z0 = prevPoint[2];
      let z1 = currPoint[2];
      let sx0 = prevPoint[3];
      let sx1 = currPoint[3];
      let sy0 = prevPoint[4];
      let sy1 = currPoint[4];
      let sz0 = prevPoint[5];
      let sz1 = currPoint[5];
      this.curve_fn = (t) =>
        vec3(
          this.f1(t) * x0 +
            this.f2(t) * x1 +
            this.f3(t) * sx0 * tangentScalingFactor +
            this.f4(t) * sx1 * tangentScalingFactor,
          this.f1(t) * y0 +
            this.f2(t) * y1 +
            this.f3(t) * sy0 * tangentScalingFactor +
            this.f4(t) * sy1 * tangentScalingFactor,
          this.f1(t) * z0 +
            this.f2(t) * z1 +
            this.f3(t) * sz0 * tangentScalingFactor +
            this.f4(t) * sz1 * tangentScalingFactor
        );
      this.sample_cnt = 1000;
      // this.curve = new Curve_Shape(this.curve_fn, this.sample_cnt);
      this.curves.push(new Curve_Shape(this.curve_fn, this.sample_cnt));
    }
  }
}
