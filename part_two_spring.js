import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

// TODO: you should implement the required classes here or in another file.
class Simulation{
  constructor(){
    this.particles = []
    this.springs = []
    this.ground_ks = 0
    this.ground_kd = 0
    this.run = false
    this.time_step = 1/1000
    this.integration = "verlet"
  }

  display(t, dt, caller){
    dt = Math.min(1/60, dt)
    let t_sim = t
    let t_next = t_sim + dt
    for(;t_sim <= t_next; t_sim += this.time_step){
      this.update(this.time_step, caller)
    }
  }

  update(dt, caller){
    if(this.run){
      for (let s of this.springs) {
        s.update(caller)
      }
      for (let p of this.particles) {
        if(this.integration != "verlet"){
          p.ball_accel = p.apply_forces()
        }
        else{
          p.newAccel = p.apply_forces()
        }
      }
      for (let p of this.particles) {
        p.update(dt)
      }
    }
  }  

  createParticles(num){
    for(let i =0;i< num;i++){
      this.particles.push(null)
    }
  }

  setParticle(index, x,y,z,mass, vx,vy,vz){
    this.particles[index] = new Particle(x,y,z,mass, vx,vy,vz)
  }

  setSpring(index,p1, p2, ks, kd, rest_length, ){
    this.springs[index] = new Spring(this.particles[p1], this.particles[p2], ks, kd, rest_length )
  }

  createSprings(num){
    for(let i =0; i< num;i++){
      this.springs.push(null)
    }
  }

  setKSKD(ks, kd){
    for(let p of this.particles){
      p.ks_ground = ks
      p.kd_ground = kd
    }
  }

  setGravity(gravity){
    for(let p of this.particles){
      p.gravity = gravity
    }
  }

  setVelocities(vx, vy, vz){
    for(let p of this.particles){
      p.ball_velocity = vec3(vx, vy,vz)
    }
  }

  setIntegration(integration, time_step){
    this.time_step = time_step
    this.integration = integration
    for(let p of this.particles){
      p.setIntegration(integration)
    }

  }

}

class Particle{
  constructor(x, y, z, mass, vx,vy,vz, curve_color=color( 0, 0, 1, 1 )) {
    this.shapes = {'ball' : new defs.Subdivision_Sphere( 4 )}
    this.materials   = { shader: new defs.Phong_Shader(), ambient: .2, diffusivity: 1, specularity:  1, color: color( .9,.5,.9,1 ) }
    this.ball_location = vec3(x, y, z);
    this.ball_radius = 0.2;
    this.curve_color = curve_color
    this.ball_transform = Mat4.translation(...this.ball_location)
        .times(Mat4.scale(this.ball_radius, this.ball_radius, this.ball_radius));
    this.ball_velocity = vec3(vx,vy,vz)
    this.gravity = 9.8
    this.ball_accel = vec3(0,-this.gravity, 0)
    this.bounce_factor = 0.5
    this.mass = mass
    this.connected_springs = []
    this.ks_ground = 0
    this.kd_ground = 0
    this.integration = "verlet"
    this.newAccel =  this.ball_accel
  }

  apply_forces() {
    let total_force = vec3(0, -this.gravity * this.mass, 0);
    let ground_level = 0;
    if (this.ball_location[1] - this.ball_radius < ground_level) {
        let penetration = ground_level - (this.ball_location[1] - this.ball_radius)
        let velocity_y = this.ball_velocity[1];
        let ground_force_y = this.ks_ground * penetration - this.kd_ground * velocity_y;
        total_force = total_force.plus(vec3(0, ground_force_y, 0));

    }
    for (let spring of this.connected_springs) {
      total_force = total_force.plus(spring.compute_force_on(this));
    }
    return total_force.times(1 / this.mass);
  }

  draw(webgl_manager, uniforms) {
    this.ball_transform = Mat4.translation(...this.ball_location)
        .times(Mat4.scale(this.ball_radius, this.ball_radius, this.ball_radius));
    this.shapes.ball.draw( webgl_manager, uniforms, this.ball_transform, { ...this.materials, color: this.curve_color } );
  }

  update(dt) {
    if(this.integration == "symplectic"){
      this.ball_velocity = this.ball_velocity.plus(this.ball_accel.times(dt))
      this.ball_location = this.ball_location.plus(this.ball_velocity.times(dt))
    }
    else if(this.integration == "euler"){
      this.ball_location = this.ball_location.plus(this.ball_velocity.times(dt))
      this.ball_velocity = this.ball_velocity.plus(this.ball_accel.times(dt))
    }
    else if(this.integration == "verlet"){
      // let newAccel = this.apply_forces()
      this.ball_velocity = this.ball_velocity.plus(this.ball_accel.plus(this.newAccel).times(dt*0.5))
      this.ball_location = this.ball_location.plus(this.ball_velocity.times(dt)).plus(this.ball_accel.times((dt**2)*0.5))
      this.ball_accel = this.newAccel
    }
  }

  setIntegration(integration, time_step){
    this.integration = integration
  }
}

class Spring extends Shape{
  constructor(p1, p2, ks, kd, rest_length = -1, curve_color=color( 1, 0, 0, 1 )) {
    super("position", "normal");
    this.p1 = p1;
    this.p2 = p2;
    this.ks = ks;
    this.kd = kd;
    this.rest_length = rest_length > 0 ? rest_length : p1.ball_location.minus(p2.ball_location).norm();
    this.material = { shader: new defs.Phong_Shader(), ambient: 1.0, color: curve_color }
    this.arrays.position.push(p1.ball_location);
    this.arrays.position.push(p2.ball_location);
    this.arrays.normal.push(vec3(0, 0, 0));
    this.arrays.normal.push(vec3(0, 0, 0));
    this.p1.connected_springs.push(this);
    this.p2.connected_springs.push(this);
  }

  compute_force_on(particle) {
    let other = this.p1 === particle ? this.p2 : this.p1;
    let delta = other.ball_location.minus(particle.ball_location);
    let dist = delta.norm();
    let force_magnitude = this.ks * (dist - this.rest_length);
    let damping = this.kd * (other.ball_velocity.minus(particle.ball_velocity)).dot(delta.normalized());
    return delta.normalized().times(force_magnitude + damping);
  }


  draw(webgl_manager, uniforms) {
    // call super with "LINE_STRIP" mode
    super.draw(webgl_manager, uniforms, Mat4.identity(), this.material, "LINE_STRIP");
  }

  update(webgl_manager) {
    this.arrays.position[0] = this.p1.ball_location
    this.arrays.position[1] = this.p2.ball_location
    // this.arrays.position.forEach((v, i) => v = curve_function(i / this.sample_count));
    this.copy_onto_graphics_card(webgl_manager.context);
    // Note: vertex count is not changed.
    // not tested if possible to change the vertex count.
  }
}

export const Part_two_spring_base = defs.Part_two_spring_base =
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

        this.simulation = new Simulation()
        // TODO: you should create the necessary shapes
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
    let dt = this.dt = Math.min(1/30, this.uniforms.animation_delta_time/1000);
    // !!! Draw ground
    let floor_transform = Mat4.translation(0, 0, 0).times(Mat4.scale(10, 0.01, 10));
    this.shapes.box.draw( caller, this.uniforms, floor_transform, { ...this.materials.plastic, color: yellow } );
    this.simulation.display(t, dt, caller)
    for(let p of this.simulation.particles){
      p.draw(caller, this.uniforms)
    }
    for(let s of this.simulation.springs){
      s.draw(caller, this.uniforms)
    }
    // !!! Draw ball (for reference)
    // let ball_transform = Mat4.translation(this.ball_location[0], this.ball_location[1], this.ball_location[2])
    //     .times(Mat4.scale(this.ball_radius, this.ball_radius, this.ball_radius));
    // this.shapes.ball.draw( caller, this.uniforms, ball_transform, { ...this.materials.metal, color: blue } );

    // TODO: you should draw spline here.
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
    //TODO
    let text = document.getElementById("input").value;
    let commands = text.split('\n')
    for(let i = 0; i< commands.length; i++){
      commands[i] = commands[i].replace(/\s+/g, ' ').trim()
      const words = commands[i].split(' ');
      if (words.length == 3) {
        if(words[0] == "create" && words[1] == "particles"){
          const num = parseFloat(words[2]);

          this.simulation.createParticles()
        }
        else if(words[0] == "create" && words[1] == "springs"){
          const num = parseFloat(words[2])

          this.simulation.createSprings()
        }
        else if(words[0] == "ground"){
          const ks = parseFloat(words[1])
          const kd = parseFloat(words[2])

          this.simulation.setKSKD(ks, kd)
        }
        else if(words[0] == "integration"){
          const inte = words[1]
          const step = parseFloat(words[2])

          this.simulation.setIntegration(inte, step)
        }
        else{
          document.getElementById("output").value = "invalid input";
        }
      }
      else if(words.length == 2){
        if(words[0] == "gravity"){
          const grav = parseFloat(words[1])
          this.simulation.setGravity(grav)
        }
      }
      else if(words.length == 9){
        if(words[0] == "particle"){
          const index = parseFloat(words[1])
          const mass = parseFloat(words[2])
          const x = parseFloat(words[3])
          const y = parseFloat(words[4])
          const z = parseFloat(words[5])
          const vx = parseFloat(words[6])
          const vy = parseFloat(words[7])
          const vz = parseFloat(words[8])

          this.simulation.setParticle(index, x,y,z,mass, vx,vy,vz)
        }
      }
      else if(words.length == 7){
        if(words[0] == "link"){
          const index = parseFloat(words[1])
          const p1 = parseFloat(words[2])
          const p2 = parseFloat(words[3])
          const ks = parseFloat(words[4])
          const kd = parseFloat(words[5])
          const length = parseFloat(words[6])

          this.simulation.setSpring(index, p1, p2, ks, kd, length)
        }
      }
      else if(words.length == 4){
        if(words[0] == "velocities"){
          const vx = parseFloat(words[2])
          const vy = parseFloat(words[3])
          const vz = parseFloat(words[4])

          this.simulation.setVelocities(vx, vy,vz)
        }
      }
      else {
        document.getElementById("output").value = "invalid input";
      }
    }
  }

  start() { // callback for Run button
    document.getElementById("output").value = "start";
    this.simulation.run = true
  }
}
