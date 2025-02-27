import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

// TODO: you should implement the required classes here or in another file.
export
class Curve_Shape extends Shape {
  // curve_function: (t) => vec3
  constructor(curve_function, sample_count, curve_color=color( 0, 0, 1, 1 )) {
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
      // for (let i = 0; i < this.sample_count + 1; i++) {
      //   let t = 1.0 * i / this.sample_count;
      //   this.arrays.position[i] = curve_function(t);
      let step_size = 1 / this.sample_count;
      for (let t = 0; t < 1; t+=step_size) {
        let i = t * this.sample_count;
        this.arrays.position[i] = curve_function(t);
      }
    }
    // this.arrays.position.forEach((v, i) => v = curve_function(i / this.sample_count));
    this.copy_onto_graphics_card(webgl_manager.context);
    // Note: vertex count is not changed.
    // not tested if possible to change the vertex count.
  }
};

export
const Part_one_hermite_base = defs.Part_one_hermite_base =
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

        this.curve_fn = null;
        this.sample_cnt = 0;
        // this.curve = new Curve_Shape(null, 100);
        this.curves = [];

        // TODO: you should create a Spline class instance
        this.spline = [];
        this.lookup_table = [];
        this.step_size = 0.001;
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
    // this.shapes.ball.draw( caller, this.uniforms, ball_transform, { ...this.materials.metal, color: blue } );

    // this.curve.draw(caller, this.uniforms);
    for (let i = 0; i < this.curves.length; i++) {
      this.curves[i].draw(caller, this.uniforms);
    }

    // add some fluctuation
    // if (this.curve_fn && this.sample_cnt === this.curve.sample_count) {
    //   this.curve.update(caller, this.uniforms,
    //       (s) => this.curve_fn(s).plus(vec3(Math.cos(this.t * s), Math.sin(this.t), 0)) );
    // }


    // TODO: you should draw spline here.
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
  f1(t) {
    return (2 * t**3) - (3 * t**2) + 1;
  }
  f2(t) {
    return (-2 * t**3) + (3 * t**2);
  }
  f3(t) {
    return (t**3) - (2 * t**2) + t;
  }
  f4(t) {
    return (t**3) - (t**2);
  }

  arc_length_calc() {
      this.lookup_table = [];
      this.lookup_table.push(0);
      let tangentScalingFactor = 1;
      if (this.spline.length >= 2) {
        tangentScalingFactor = 1/(this.spline.length-1);
      }
      for (let i = 1; i < this.spline.length; i++) {
        let prevPoint = this.spline[i-1];
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
        let prevx = x0;
        let prevy = y0;
        let prevz = z0;
        // for (let t = i-1; t < i; t += this.step_size) {
        for (let t = 0; t < 1; t += this.step_size) {
          let f1_val = this.f1(t);
          let f2_val = this.f2(t);
          let f3_val = this.f3(t);
          let f4_val = this.f4(t);
          let x = f1_val * x0 + f2_val * x1 + f3_val * sx0 * tangentScalingFactor + f4_val * sx1 * tangentScalingFactor;
          let y = f1_val * y0 + f2_val * y1 + f3_val * sy0 * tangentScalingFactor + f4_val * sy1 * tangentScalingFactor;
          let z = f1_val * z0 + f2_val * z1 + f3_val * sz0 * tangentScalingFactor + f4_val * sz1 * tangentScalingFactor;
          let distance = ((x - prevx)**2 + (y - prevy)**2 + (z - prevz)**2) ** 0.5;
          this.lookup_table.push(distance + this.lookup_table[this.lookup_table.length - 1]);
          prevx = x;
          prevy = y;
          prevz = z;
        }
      }
      return this.lookup_table[this.lookup_table.length - 1];
}

  parse_commands() {
    // document.getElementById("output").value = "parse_commands";
    let input_text = document.getElementById("input").value;
    const lines = input_text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      lines[i] = lines[i].replace(/,/g, "");
      lines[i] = lines[i].replace(/</g, "");
      lines[i] = lines[i].replace(/>/g, "");
      let words = lines[i].split(/\s+/);
      if (words[0] === "add") {
        let x = parseFloat(words[2]);
        let y = parseFloat(words[3]);
        let z = parseFloat(words[4]);
        let sx = parseFloat(words[5]);
        let sy = parseFloat(words[6]);
        let sz = parseFloat(words[7]);
        this.spline.push([x, y, z, sx, sy, sz]);
      }
      else if (words[0] == "set") {
        if (words[1] === "tangent") {
          let t = parseInt(words[2]);
          let sx = parseFloat(words[3]);
          let sy = parseFloat(words[4]);
          let sz = parseFloat(words[5]);
          this.spline[t][3] = sx;
          this.spline[t][4] = sy;
          this.spline[t][5] = sz;
        }
        else {
          let t = parseInt(words[2]);
          let x = parseFloat(words[3]);
          let y = parseFloat(words[4]);
          let z = parseFloat(words[5]);
          this.spline[t][0] = x;
          this.spline[t][1] = y;
          this.spline[t][2] = z;
        } 
      }
      else {
        document.getElementById("output").value = "Arc Length: " + this.arc_length_calc();
      }
    }
  }

  update_scene() { // callback for Draw button
    // document.getElementById("output").value = "update_scene";
    let tangentScalingFactor = 1;
    if (this.spline.length >= 2) {
      tangentScalingFactor = 1/(this.spline.length-1);
    }
    for (let i = 1; i < this.spline.length; i++) {
      let prevPoint = this.spline[i-1];
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
      this.curve_fn =
        (t) => vec3(
            this.f1(t) * x0 + this.f2(t) * x1 + this.f3(t) * sx0 * tangentScalingFactor + this.f4(t) * sx1 * tangentScalingFactor,
            this.f1(t) * y0 + this.f2(t) * y1 + this.f3(t) * sy0 * tangentScalingFactor + this.f4(t) * sy1 * tangentScalingFactor,
            this.f1(t) * z0 + this.f2(t) * z1 + this.f3(t) * sz0 * tangentScalingFactor + this.f4(t) * sz1 * tangentScalingFactor,
        );
        this.sample_cnt = 1000;
        // this.curve = new Curve_Shape(this.curve_fn, this.sample_cnt);
        this.curves.push(new Curve_Shape(this.curve_fn, this.sample_cnt));
  }
}

  load_spline() {
    // document.getElementById("output").value = "load_spline";
    let input_text = document.getElementById("input").value;
    const lines = input_text.split('\n');
    this.spline = [];
    for (let i = 1; i < lines.length; i++) {
      let words = lines[i].split(/\s+/);
      this.spline.push([parseFloat(words[0]), parseFloat(words[1]), parseFloat(words[2]), parseFloat(words[3]), parseFloat(words[4]), parseFloat(words[5])]);
    }
  }

  export_spline() {
    // document.getElementById("output").value = "export_spline";
    let output_text = this.spline.length + '\n';
    for (let i = 0; i < this.spline.length; i++) {
      let x = this.spline[i][0];
      let y = this.spline[i][1];
      let z = this.spline[i][2];
      let sx = this.spline[i][3];
      let sy = this.spline[i][4];
      let sz = this.spline[i][5];
      output_text += x + " " + y + " " + z + " " + sx + " " + sy + " " + sz + "\n";
    }
    output_text = output_text.slice(0, -1);
    document.getElementById("output").value = output_text;
  }
}

