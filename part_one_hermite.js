import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

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

// TODO: you should implement the required classes here or in another file.
export const Part_one_hermite_base = defs.Part_one_hermite_base =
    class Part_one_hermite_base extends Component
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

        this.sample_cnt = 1000;
        this.curve = new Curve_Shape(null, this.sample_cnt);
        this.hermite_spline = new Spline()
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

        // TODO: you should create a Spline class instance
        // this.spline = new HermiteSpline()
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



export class Part_one_hermite extends Part_one_hermite_base
{                                                    // **Part_one_hermite** is a Scene object that can be added to any display canvas.
                                                     // This particular scene is broken up into two pieces for easier understanding.
                                                     // See the other piece, My_Demo_Base, if you need to see the setup code.
                                                     // The piece here exposes only the display() method, which actually places and draws
                                                     // the shapes.  We isolate that code so it can be experimented with on its own.
                                                     // This gives you a very small code sandbox for editing a simple scene, and for
                                                     // experimenting with matrix transformations.
  parse_button_press = false
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

    const blue = color( 0,0,1,1 ), yellow = color( 1,0.7,0,1 );

    const t = this.t = this.uniforms.animation_time/1000;

    // !!! Draw ground
    let floor_transform = Mat4.translation(0, 0, 0).times(Mat4.scale(10, 0.01, 10));
    this.shapes.box.draw( caller, this.uniforms, floor_transform, { ...this.materials.plastic, color: yellow } );

    // !!! Draw ball (for reference)
    // let ball_transform = Mat4.translation(this.ball_location[0], this.ball_location[1], this.ball_location[2])
    //     .times(Mat4.scale(this.ball_radius, this.ball_radius, this.ball_radius));
    // this.shapes.ball.draw( caller, this.uniforms, ball_transform, { ...this.materials.metal, color: this.blue } );
    // TODO: you should draw spline here.
    this.curve.draw(caller, this.uniforms);
    // this.curve.update(caller)
    // if(this.parse_button_press){
    //   this.curve.update()
    //   this.parse_button_press = false
    // }
  }

  render_controls()
  {                                 // render_controls(): Sets up a panel of interactive HTML elements, including
    // buttons with key bindings for affecting this scene, and live info readouts.
    this.control_panel.innerHTML += "Part One:";
    this.new_line();
    this.key_triggered_button( "Parse Commands", [], this.parse_commands );
    this.new_line();
    this.key_triggered_button( "Draw", [], this.update_scene );
    this.new_line();
    this.key_triggered_button( "Load", [], this.load_spline );
    this.new_line();
    this.key_triggered_button( "Export", [], this.export_spline );
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
      if (words.length == 8) {
        if(words[0] == "add" && words[1] == "point"){
          const x = parseFloat(words[2]);
          const y = parseFloat(words[3]);
          const z = parseFloat(words[4]);
          const sx = parseFloat(words[5]);
          const sy = parseFloat(words[6]);
          const sz = parseFloat(words[7]);

          this.hermite_spline.addPoint(x,y,z,sx,sy,sz)
          // this.curve = new Curve_Shape((t) => this.hermite_spline.get_position(t), this.sample_cnt)
        }
        else{
          document.getElementById("output").value = "invalid input";
        }
      }
      else if(words.length == 6){
        if(words[0] == "set" && words[1] == "tangent"){
          const index = parseFloat(words[2])
          const sx = parseFloat(words[3])
          const sy = parseFloat(words[4])
          const sz = parseFloat(words[5])
          this.curve.setTangent(index, vec3(sx, sy, sz))
        }
        else if(words[0] == "set" && words[1] == "point"){
          const index = parseFloat(words[2])
          const x = parseFloat(words[3])
          const y = parseFloat(words[4])
          const z = parseFloat(words[5])
          this.curve.setPoint(index, vec3(x, y, z))
        }
        else{
          document.getElementById("output").value = "invalid input";
        }
      }
      else if(words.length == 1){
        if(words[0] == "get_arc_length"){
          document.getElementById("output").value = this.hermite_spline.getArcLength();
        }
        else{
          document.getElementById("output").value = "invalid input";
        }
      }
      else {
        document.getElementById("output").value = "invalid input";
      }
    }
  }

  update_scene() { // callback for Draw button
    this.curve = new Curve_Shape((t) => this.hermite_spline.get_position(t), this.sample_cnt)
  }

  load_spline() {
    let text = document.getElementById("input").value;
    let commands = text.split('\n')
    this.hermite_spline.points.length = 0
    for(let i = 0; i< commands.length; i++){
      let words = commands[i].split(' ')
      if(i>0 && words != ""){
        const x = parseFloat(words[0]);
        const y = parseFloat(words[1]);
        const z = parseFloat(words[2]);
        const sx = parseFloat(words[3]);
        const sy = parseFloat(words[4]);
        const sz = parseFloat(words[5]);
        this.hermite_spline.addPoint(x,y,z,sx,sy,sz)
      }
    }
  }

  export_spline() {
    let points = this.hermite_spline.points
    let tangents = this.hermite_spline.tangents
    let output = this.hermite_spline.size.toString() + "\n"
    for(let i = 0; i< points.length; i++){
      output += points[i][0].toString() + " " + points[i][1].toString() + " " + points[i][2].toString() + " "
      output += tangents[i][0].toString() + " " + tangents[i][1].toString() + " " + tangents[i][2].toString() + "\n"
    }
    document.getElementById("output").value = output;
  }

}
