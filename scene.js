import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

// TODO: you should implement the required classes here or in another file.

class Spline {
  constructor(){
    this.points = []
    this.tangents = []
    this.size = 0
    this.arc_length_table = []
  }

  addPoint(x,y,z, tx, ty, tz){
    this.points.push(vec3(x,y,z))
    this.tangents.push(vec3(tx, ty, tz))
    this.size += 1
    this.makeArcLengthTable()
  }

  setPoint(index, x,y,z){
    this.points[index] = vec3(x,y,z)
    this.makeArcLengthTable()
  }

  setTangent(index, x,y,z){
    this.tangents[index] = vec3(x,y,z)
    this.makeArcLengthTable()
  }

  get_position(t){
    if(this.size<2){return vec3(0,0,0)}

    const A = Math.floor(t * (this.size - 1));
    const B = Math.ceil(t*(this.size-1));
    const s = (t*(this.size-1))%1.0

    let a = this.points[A].copy()
    let b = this.points[B].copy()
    let sa = this.tangents[A].copy()
    let sb = this.tangents[B].copy()

    let h00 = 2*s**3 - 3*s**2 + 1;
    let h10 = s**3 - 2*s**2 + s;
    let h01 = -2*s**3 + 3*s**2;
    let h11 = s**3 - s**2;
    
    let point =vec3(
      a[0]*h00 + sa[0]*h10/(this.size-1) + b[0]*h01 + sb[0] * h11/(this.size-1),
      a[1]*h00 + sa[1]*h10/(this.size-1) + b[1]*h01 + sb[1] * h11/(this.size-1),
      a[2]*h00 + sa[2]*h10/(this.size-1) + b[2]*h01 + sb[2] * h11/(this.size-1),
    )
    return point
  }

  makeArcLengthTable(){
    this.arc_length_table = []
    let lastPoint = null
    for(let i = 0; i< 1001;i++){
      let t = i/1000
      let point = this.get_position(t)
      if(!lastPoint){
        lastPoint = point
        this.arc_length_table.push([0,0,0])
      }
      else{
          let pointLength = ((point[0] - lastPoint[0])**2 + (point[1] - lastPoint[1])**2 + (point[2] - lastPoint[2])**2)**(1/2)
          this.arc_length_table.push([i, t, pointLength + this.arc_length_table[i-1][2]])
          lastPoint = point
      }
    }
  }

  getArcLength(){
    return this.arc_length_table[this.arc_length_table.length-1][2]
  }
}


class Curve_Shape extends Shape {
  // curve_function: (t) => vec3
  constructor(curve_function, sample_count, curve_color=color( 1, 0, 0, 1 )) {
    super("position", "normal");

    this.material = { shader: new defs.Phong_Shader(), ambient: 1.0, color: curve_color }
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
    super.draw(webgl_manager, uniforms, Mat4.identity(), this.material, "LINE_STRIP");
  }

  update(webgl_manager, uniforms, curve_function) {
    if (curve_function && this.sample_count) {
      for (let i = 0; i < this.sample_count + 1; i++) {
        let t = 1.0 * i / this.sample_count;
        this.arrays.position[i] = curve_function(t);
      }
    }
    // this.arrays.position.forEach((v, i) => v = curve_function(i / this.sample_count));
    this.copy_onto_graphics_card(webgl_manager.context);
    // Note: vertex count is not changed.
    // not tested if possible to change the vertex count.
  }
};

class Simulation{
  constructor(){
    this.particles = []
    this.springs = []
    this.ground_ks = 0
    this.ground_kd = 0
    this.run = false
    this.hermite_spline = new Spline()
    this.hermite_spline.addPoint(0,10,0,-20,0,20)
    this.hermite_spline.addPoint(0,10,5,20,0,20)
    this.hermite_spline.addPoint(5,10,5,20,0,-20)
    this.hermite_spline.addPoint(5,10,0,-20,0,-20)
    this.hermite_spline.addPoint(0,10,0,-20,0,20)
    this.time_step = 1/1000
    this.integration = "symplectic"
  }

  display(t, dt, caller){
    dt = Math.min(1/60, dt)
    let t_sim = t
    let t_next = t_sim + dt
    for(;t_sim <= t_next; t_sim += this.time_step){
      this.update(t, this.time_step, caller)
    }
  }

  update(t,dt, caller){
    // dt = 1/1000
    let point = this.hermite_spline.get_position(Math.abs(Math.sin(t/2)))
    let nextPoint = this.hermite_spline.get_position(Math.abs(Math.sin((t+dt)/2)))
    this.particles[0].ball_location = point
    let delta = nextPoint.minus(point).normalized()
    if(delta[0] !== delta[0]){
      delta[0] = 0
    }
    if(delta[1] !== delta[1]){
      delta[1] = 0
    }
    if(delta[2] !== delta[2]){
      delta[2] = 0
    }
    this.particles[0].ball_velocity = delta.times(this.hermite_spline.getArcLength()/2 * Math.abs(Math.cos(t/2)))
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
    for (let i = 1; i < this.particles.length; i++) {
      this.particles[i].update(dt)
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
    this.ks_ground = 5000
    this.kd_ground = 10
    this.newAccel = this.ball_accel
    this.integration = "symplectic"
  }

  apply_forces() {
    let total_force = vec3(0, -this.gravity * this.mass, 0);
    let ground_level = 0;
    
    if (this.ball_location[1] - this.ball_radius/2 < ground_level) {
        let penetration = ground_level - (this.ball_location[1]-this.ball_radius/2);
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


export const Part_three_chain_base = defs.Part_three_chain_base =
    class Part_three_chain_base extends Component
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
        this.simulation.createParticles(4)
        this.simulation.createSprings(3)
        this.simulation.setParticle(0,0,10,0,1, 0,0,0)
        let startY = 9.5
        for(let i  = 1; i<this.simulation.particles.length; i++){
          this.simulation.setParticle(i, 0, startY, 0,1, 0,0,0)
          this.simulation.setSpring(i-1, i-1, i, 30, 10, 0.5)
          startY -= 0.5
        }
        // this.ball_path = new Curve_Shape(100, )
        this.ball_location = vec3(1, 1, 1);
        this.ball_radius = 0.25;

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


export class Part_three_chain extends Part_three_chain_base
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

    const blue = color( 0,0,1,1 ), yellow = color( 0.7,1,0,1 );

    const t = this.t = this.uniforms.animation_time/1000;
    const dt = this.dt = Math.min(1/30, this.uniforms.animation_delta_time/1000);
    this.simulation.update(t, dt, caller)
    // !!! Draw ground
    let floor_transform = Mat4.translation(0, 0, 0).times(Mat4.scale(10, 0.01, 10));
    this.shapes.box.draw( caller, this.uniforms, floor_transform, { ...this.materials.plastic, color: yellow } );

    for(let p of this.simulation.particles){
      p.draw(caller, this.uniforms)
    }
    for(let s of this.simulation.springs){
      s.draw(caller, this.uniforms)
    }
    // TODO: you should draw spline here.
  }

  render_controls()
  {                                 // render_controls(): Sets up a panel of interactive HTML elements, including
    // buttons with key bindings for affecting this scene, and live info readouts.
    this.control_panel.innerHTML += "Part Three: (no buttons)";
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
    //TODO
  }

  start() { // callback for Run button
    document.getElementById("output").value = "start";
    //TODO
  }
}
