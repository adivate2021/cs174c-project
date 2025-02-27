import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

let integration_method = "symplectic";

// TODO: you should implement the required classes here or in another file.
export
class Particle {
  constructor() {
    this.mass = 0;
    this.pos = vec3(0, 0, 0);
    this.vel = vec3(0, 0, 0);
    this.acc = vec3(0, 0, 0);
    this.ext_force = vec3(0, 0, 0);
    this.valid = false;
  }

  update(dt) {
    if (!this.valid)
      throw "Initialization not complete";
    let prev_velocity = this.vel;
    let prev_acc = this.acc;
    this.acc = this.ext_force.times(1/this.mass);
    if (integration_method != "verlet") {
      this.vel.add_by(this.acc.times(dt));
    }
    if (this.pos[1] <= 0) {
      this.vel[0] *= 0.99;
      this.vel[2] *= 0.99;
    }
    if (integration_method == "euler") {
      // Damping after hitting ground to ensure the springs don't gain energy
      // if (this.pos[1] <= 0) {
      //   this.vel[0] *= 0.99;
      //   this.vel[2] *= 0.99;
      // }
      this.pos.add_by(prev_velocity.times(dt));
    }
    if (integration_method == "symplectic") {
      // Damping after hitting ground to ensure the springs don't gain energy
      // if (this.pos[1] <= 0) {
      //   this.vel[0] *= 0.99;
      //   this.vel[2] *= 0.99;
      // }
      this.pos.add_by(this.vel.times(dt));
    }
    // Velocity Verlet
    if (integration_method == "verlet") {
      // Damping after hitting ground to ensure does not keep bouncing higher
      if (this.pos[1] <= 0) {
        this.vel[1] *= 0.9;
      }
      this.pos.add_by(prev_velocity.times(dt).plus(prev_acc.times((dt**2)/2)))
      let second_term_vel_eq = (prev_acc.plus(this.acc)).times(0.5);
      this.vel.add_by(second_term_vel_eq.times(dt));
    }
  }
}

export
class Spring {
  constructor() {
    this.particle_1 = null;
    this.particle_2 = null;
    this.rest_length = 0;
    this.ks = 0;
    this.kd = 0;
    this.valid = false;
  }
  update() {
    if (!this.valid) {
      throw "Initialization not complete";
    }
    let dij = this.particle_1.pos.minus(this.particle_2.pos);
    let dij_magnitude = dij.norm();
    let dij_hat = dij.times(1/dij_magnitude);
    let vij = this.particle_1.vel.minus(this.particle_2.vel);
    let fs_ij = dij_hat.times(this.ks * (dij_magnitude - this.rest_length));
    let fd_ij = dij_hat.times(this.kd * vij.dot(dij_hat));
    let fe_ij = fs_ij.plus(fd_ij);
    // let fe_ij = fs_ij;
    this.particle_1.ext_force.subtract_by(fe_ij);
    this.particle_2.ext_force.add_by(fe_ij);
  }
}

export
class Simulation {
  constructor() {
    this.particles = [];
    this.springs = [];
    this.g_acc = vec3(0,0,0);
    this.ground_ks = 0;
    this.ground_kd = 0;
  }
  update(dt) {
    for (const p of this.particles) {
      p.ext_force = this.g_acc.times(p.mass);
      // add ground collision detection and damping
      // secret_ground_forces(this, p);
      this.update_ground_forces(p);
    }
    for (const s of this.springs) {
      s.update();
    }
    for (const p of this.particles) {
      p.update(dt);
    }
  }
  update_ground_forces(p) {
    if (p.pos[1] <= 0) {
      let ground_point = vec3(0, 0, 0);
      let normal_vector = vec3(0, 1, 0);
      let first_term = ground_point.minus(p.pos);
      first_term = first_term.dot(normal_vector);
      first_term = first_term * this.ground_ks;
      first_term = normal_vector.times(first_term);
      let second_term = p.vel.dot(normal_vector);
      second_term = second_term * this.ground_kd;
      second_term = normal_vector.times(second_term);
      let normal_force = first_term.minus(second_term);
      p.ext_force.add_by(normal_force);
      // p.ext_force = normal_force;
    }
  }
  draw(webgl_manager, uniforms, shapes, materials) {
    const blue = color(0, 0, 1, 1), red = color(1,0,0,1);
    for (const p of this.particles) {
      const pos = p.pos;
      let model_transform = Mat4.scale(0.2, 0.2, 0.2);
      model_transform.pre_multiply(Mat4.translation(pos[0], pos[1], pos[2]));
      shapes.ball.draw(webgl_manager, uniforms, model_transform, { ...materials.plastic, color: blue });
    }
    for (const s of this.springs) {
      const p1 = s.particle_1.pos;
      const p2 = s.particle_2.pos;
      const len = (p2.minus(p1)).norm();
      const center = (p1.plus(p2)).times(0.5);
      let model_transform = Mat4.scale(0.05, len/2, 0.05);
      const p = p1.minus(p2).normalized();
      let v = vec3(0, 1, 0);
      if (Math.abs(v.cross(p).norm()) < 0.1) {
        v = vec3(0, 0, 1);
        model_transform = Mat4.scale(0.05, 0.05, len/2);
      }
      const w = v.cross(p).normalized();
      const theta = Math.acos(v.dot(p));
      model_transform.pre_multiply(Mat4.rotation(theta, w[0], w[1], w[2]));
      model_transform.pre_multiply(Mat4.translation(center[0], center[1], center[2]));
      shapes.box.draw(webgl_manager, uniforms, model_transform, { ...materials.plastic, color: red });
    }
  }
}


export
const Part_two_spring_base = defs.Part_two_spring_base =
    class Part_two_spring_base extends Component
    {                                          // **My_Demo_Base** is a Scene that can be added to any display canvas.
                                               // This particular scene is broken up into two pieces for easier understanding.
                                               // The piece here is the base class, which sets up the machinery to draw a simple
                                               // scene demonstrating a few concepts.  A subclass of it, Part_one_hermite,
                                               // exposes only the display() method, which actually places and draws the shapes,
                                               // isolating that code so it can be experimented with on its own.
      init()
      {
        console.log("init")

        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        this.hover = this.swarm = false;
        // At the beginning of our program, load one of each of these shape
        // definitions onto the GPU.  NOTE:  Only do this ONCE per shape it
        // would be redundant to tell it again.  You should just re-use the
        // one called "box" more than once in display() to draw multiple cubes.
        // Don't define more than one blueprint for the same thing here.
        this.shapes = { 'box'  : new defs.Cube(),
          'ball' : new defs.Subdivision_Sphere( 4 ),
          'axis' : new defs.Axis_Arrows() };

        // *** Materials: ***  A "material" used on individual shapes specifies all fields
        // that a Shader queries to light/color it properly.  Here we use a Phong shader.
        // We can now tweak the scalar coefficients from the Phong lighting formulas.
        // Expected values can be found listed in Phong_Shader::update_GPU().
        const phong = new defs.Phong_Shader();
        const tex_phong = new defs.Textured_Phong();
        this.materials = {};
        this.materials.plastic = { shader: phong, ambient: .2, diffusivity: 1, specularity: .5, color: color( .9,.5,.9,1 ) }
        this.materials.metal   = { shader: phong, ambient: .2, diffusivity: 1, specularity:  1, color: color( .9,.5,.9,1 ) }
        this.materials.rgb = { shader: tex_phong, ambient: .5, texture: new Texture( "assets/rgb.jpg" ) }

        this.ball_location = vec3(1, 1, 1);
        this.ball_radius = 0.25;

        // TODO: you should create the necessary shapes
        this.simulation_obj = new Simulation();
        this.dt = 1/60;
        this.sim_speed = 0.5;
        this.start_var = false;
        this.t_sim = 0;
        this.t_step = 1/1000;
        this.parse_var = false;
      }

      render_animation( caller )
      {                                                // display():  Called once per frame of animation.  We'll isolate out
        // the code that actually draws things into Part_one_hermite, a
        // subclass of this Scene.  Here, the base class's display only does
        // some initial setup.

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if( !caller.controls )
        { this.animated_children.push( caller.controls = new defs.Movement_Controls( { uniforms: this.uniforms } ) );
          caller.controls.add_mouse_controls( caller.canvas );

          // Define the global camera and projection matrices, which are stored in shared_uniforms.  The camera
          // matrix follows the usual format for transforms, but with opposite values (cameras exist as
          // inverted matrices).  The projection matrix follows an unusual format and determines how depth is
          // treated when projecting 3D points onto a plane.  The Mat4 functions perspective() or
          // orthographic() automatically generate valid matrices for one.  The input arguments of
          // perspective() are field of view, aspect ratio, and distances to the near plane and far plane.

          // !!! Camera changed here
          Shader.assign_camera( Mat4.look_at (vec3 (10, 10, 10), vec3 (0, 0, 0), vec3 (0, 1, 0)), this.uniforms );
        }
        this.uniforms.projection_transform = Mat4.perspective( Math.PI/4, caller.width/caller.height, 1, 100 );

        // *** Lights: *** Values of vector or point lights.  They'll be consulted by
        // the shader when coloring shapes.  See Light's class definition for inputs.
        const t = this.t = this.uniforms.animation_time/1000;
        const angle = Math.sin( t );

        // const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,-1,1,0 ) ); !!!
        // !!! Light changed here
        const light_position = vec4(20 * Math.cos(angle), 20,  20 * Math.sin(angle), 1.0);
        this.uniforms.lights = [ defs.Phong_Shader.light_source( light_position, color( 1,1,1,1 ), 1000000 ) ];

        // draw axis arrows.
        this.shapes.axis.draw(caller, this.uniforms, Mat4.identity(), this.materials.rgb);
      }
    }


export class Part_two_spring extends Part_two_spring_base
{                                                    // **Part_one_hermite** is a Scene object that can be added to any display canvas.
                                                     // This particular scene is broken up into two pieces for easier understanding.
                                                     // See the other piece, My_Demo_Base, if you need to see the setup code.
                                                     // The piece here exposes only the display() method, which actually places and draws
                                                     // the shapes.  We isolate that code so it can be experimented with on its own.
                                                     // This gives you a very small code sandbox for editing a simple scene, and for
                                                     // experimenting with matrix transformations.
  render_animation( caller )
  {                                                // display():  Called once per frame of animation.  For each shape that you want to
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
    super.render_animation( caller );

    /**********************************
     Start coding down here!!!!
     **********************************/
        // From here on down it's just some example shapes drawn for you -- freely
        // replace them with your own!  Notice the usage of the Mat4 functions
        // translation(), scale(), and rotation() to generate matrices, and the
        // function times(), which generates products of matrices.

    const blue = color( 0,0,1,1 ), yellow = color( 1,1,0,1 );

    const t = this.t = this.uniforms.animation_time/1000;

    // !!! Draw ground
    let floor_transform = Mat4.translation(0, 0, 0).times(Mat4.scale(10, 0.01, 10));
    this.shapes.box.draw( caller, this.uniforms, floor_transform, { ...this.materials.plastic, color: yellow } );

    // !!! Draw ball (for reference)
    let ball_transform = Mat4.translation(this.ball_location[0], this.ball_location[1], this.ball_location[2])
        .times(Mat4.scale(this.ball_radius, this.ball_radius, this.ball_radius));
    this.shapes.ball.draw( caller, this.uniforms, ball_transform, { ...this.materials.metal, color: blue } );
    
    if (this.start_var) {
      // let dt = this.dt = Math.min(1/60, this.uniforms.animation_delta_time / 1000);
      let dt = this.dt = 1/60;
      dt *= this.sim_speed;
      let t_step = this.t_step;
      let t_sim = 0;
      let t_next = t_sim + dt;
      for (; t_sim <= t_next; t_sim += t_step) {
        // this.simulation_obj.update(dt);
        this.simulation_obj.update(t_sim);
      }
      this.simulation_obj.draw(caller, this.uniforms, this.shapes, this.materials);
      // this.t_sim = t_sim;
    }
    else if (this.parse_var) {
      this.simulation_obj.draw(caller, this.uniforms, this.shapes, this.materials);
    }
    
  }

  render_controls()
  {                                 // render_controls(): Sets up a panel of interactive HTML elements, including
    // buttons with key bindings for affecting this scene, and live info readouts.
    this.control_panel.innerHTML += "Part Two:";
    this.new_line();
    this.key_triggered_button( "Config", [], this.parse_commands );
    this.new_line();
    this.key_triggered_button( "Run", [], this.start );
    this.new_line();

    /* Some code for your reference
    this.key_triggered_button( "Copy input", [ "c" ], function() {
      let text = document.getElementById("input").value;
      console.log(text);
      document.getElementById("output").value = text;
    } );
    this.new_line();
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
    let input_text = document.getElementById("input").value;
    const lines = input_text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      let words = lines[i].split(/\s+/);
      if (words[0] == "create") {
        if (words[1] == "particles") {
          let num_particles = parseInt(words[2]);
          for (let i = 0; i < num_particles; i++) {
            this.simulation_obj.particles.push(new Particle());
          }
        }
        if (words[1] == "springs") {
          let num_springs = parseInt(words[2]);
          for (let i = 0; i < num_springs; i++) {
            this.simulation_obj.springs.push(new Spring());
          }
          this.parse_var = true;
        }
      }
      if (words[0] == "particle") {
        let index = parseInt(words[1]);
        let mass = parseFloat(words[2]);
        let x = parseFloat(words[3]);
        let y = parseFloat(words[4]);
        let z = parseFloat(words[5]);
        let vx = parseFloat(words[6]);
        let vy = parseFloat(words[7]);
        let vz = parseFloat(words[8]);
        this.simulation_obj.particles[index].mass = mass;
        this.simulation_obj.particles[index].pos = vec3(x, y, z);
        this.simulation_obj.particles[index].vel = vec3(vx, vy, vz);
        this.simulation_obj.particles[index].valid = true;
      }
      if (words[0] == "all_velocities") {
        let vx = parseFloat(words[1]);
        let vy = parseFloat(words[2]);
        let vz = parseFloat(words[3]);
        for (let i = 0; i < this.simulation_obj.particles.length; i++) {
          this.simulation_obj.particles[i].vel = vec3(vx, vy, vz);
        }
      }
      if (words[0] == "link") {
        let sindex = parseInt(words[1]);
        let pindex1 = parseInt(words[2]);
        let pindex2 = parseInt(words[3]);
        let ks = parseFloat(words[4]);
        let kd = parseFloat(words[5]);
        let rest_length = parseFloat(words[6]);
        // console.log(this.simulation_obj.springs[sindex]);
        this.simulation_obj.springs[sindex].particle_1 = this.simulation_obj.particles[pindex1];
        this.simulation_obj.springs[sindex].particle_2 = this.simulation_obj.particles[pindex2];
        this.simulation_obj.springs[sindex].ks = ks;
        this.simulation_obj.springs[sindex].kd = kd;
        if (rest_length >= 0) {
          this.simulation_obj.springs[sindex].rest_length = rest_length;
        }
        else {
          this.simulation_obj.springs[sindex].rest_length = (this.simulation_obj.particles[pindex1].minus(this.simulation_obj.particles[pindex2])).norm();
        }
        this.simulation_obj.springs[sindex].valid = true;
        // console.log(this.simulation_obj.springs[sindex]);
      }
      if (words[0] == "gravity") {
        let g_acc = parseFloat(words[1]);
        this.simulation_obj.g_acc = vec3(0, -g_acc, 0);
      }
      if (words[0] == "ground") {
        let ground_ks = parseFloat(words[1]);
        let ground_kd = parseFloat(words[2]);
        this.simulation_obj.ground_ks = ground_ks;
        this.simulation_obj.ground_kd = ground_kd;
      }
      if (words[0] == "integration") {
        integration_method = words[1];
        this.t_step = parseFloat(words[2]);
      }
    }
  }

  start() { // callback for Run button
    document.getElementById("output").value = "start";
    this.start_var = true;
  }
}
