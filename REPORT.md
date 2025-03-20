## CS C174C Final Project Report

# Arcade Claw Machine Simulation

```
Aaryan Divate
205691736
```
```
Vikram Chilkunda
105751108
```
```
Elliot Lin
705737591
```
```
Anders Hundeby
205804979
```
## Abstract

In our simulation, we modeled a claw machine, similar to what you would find at an arcade. The claw machine is
on an island with a ferris wheel and ice cream truck, creating an atmosphere similar to a local fair. The game has user
interactivity, allowing the user to lower or raise the claw. There is a 60 second timer, and by the end of the timer, the
score is based on how many balls the user was able to grab with the claw.

## 1 Introduction

The simulation employs Blender to create models and
Three.js to make the general algorithms for the claw ma-
chine. We used Blender to make a model of an island with
a ferris wheel and ice cream truck to create an atmosphere
of a local fair. In addition the claw machine was also made
with Blender. The claw and chain inside the claw machine
was made with Three.js.

The claw by default moves along a Hermite spline path
throughout the game. When the user presses the ”space
bar” button, the claw is lowered, and the claw is raised
when the user presses this button again. Once the claw
picks up a ball, it will diverge off this spline path and
move towards a glass hole box that we have in the corner
of the machine. The claw will then drop the ball into this
box and move back to where it was along the spline path.
Once the ball is dropped into the glass hole box, it dis-
appears and the score is incremented by 1. The claw will
then resume along the original spline path at the location
that it was at when it first was lowered to grab the ball.
When the game starts, a 60 second timer also starts to
tick, and once this timer runs all the way down to 0, then
the game ends and the score becomes final.

In the next sections, we will go into more detail about
how each of the main features were implemented.

## 2 Features Implemented

## 2.1 Hermite Spline

The claw by default takes the path of a Hermite spline.
We have a file called ’three-hermite.js’, where we imple-
ment the logic for this spline. We have a class called ’Her-
miteCurve’, which handles the two point Hermite curve
case. This class keeps track of two points and their tan-
gents and is able to create a curve line for this case. The
class also has functions to get a point, tangent, normal
vector, and frame at the given t parameter.
We also have another class in this file called ’Her-
mitePath’ which creates the spline with multiple of the
’HermiteCurve’ objects. In this class, we have a function
that can add a Hermite curve called ”addCurve”. In ad-
dition, we have functions to get a point at a parameter t
and also a function to get the current point on the spline
using the current parameter. We also have a function that
advances along the path by updating the parameter and
index (the index manages which Hermite curve we are on).
We manage the creation of the Hermite spline in
”main.js”. Specifically, we have a function called ’update-
HermitePathToMatchRoof’. In this function, we tried to
ensure that the spline is able to cover a large portion of
the machine, and that the spline is also aligned with the
roof of the claw machine. This ensures that the spring
appears to be coming out of the roof of the claw machine,
and any ball can be grabbed by the claw.

## 2.2 Mass-Spring Damper System

We use a mass spring damper system to model a chain
that carries the claw along the spline. This chain appears
as a ”string” like structure, as the particles are hidden and
the springs are thin. This mass-spring damper system is
mainly implemented in a file called ’three-physics.js’. In
this file, we have a class called ”Particle”, a class called
”Spring”, and a class called ”Simulation”, similar to As-
signment 1.

For the particles, we used symplectic Euler integration
to update the positions and velocities. This means that we
calculate the velocity and position in the following ways:

```
v(t+ ∆t) =v(t) + ∆t∗a(t) (1)
```
```
x(t+ ∆t) =x(t) + ∆t∗v(t+ ∆t) (2)
```
For the springs, we calculate the spring force for a
spring between two particles with the formula:

```
fijs=ksij(dij−lij)dˆij (3)
```
We calculate the damping force for a spring between two
particles with the formula:

```
fijd=−kdij(vij·dˆij)dˆij (4)
```

In these equations, k representskijs represents the
spring constant andkijd represents the damping constant.
dij represents the magnitude of the distance vector be-
tween the two points, and dˆij represents the unit distance
vector.lij represents the natural length of the spring, and
vijrepresents the difference between the two velocity vec-
tors for the two points.

A class called ”ChainSim” is where we configure the
specifics of the chain. A ChainSim object is made in
’main.js’ and managed in this file as well in order to han-
dle lowering and raising the chain, as well as moving the
chain.

## 2.3 Forward Kinematics

We use forward kinematics for the claw. The claw was
inspired by the way that a human knuckle works. It was
modeled with nodes and arcs, where the outer arms move
first, which is then used to calculate movement for the
inner arms. The end effectors are the tips of the claw.
The upper and lower arms were modeled with rectangular
meshes, and the middle of the claw was modeled with a
sphere.

The pivot points for the claw were at the end of the
joints, offset by a slight displacement. The mesh geometry
was then shifted by its length. The fingers were rotated
about a pivot point that wasn’t its own mesh geometry.

The code for the claw logic is written in the file called
’claw.js’. In this file, there is a class called ’ClawScene’,
and a function called ’initCustomClaw’ in this class. In
addition, we have a function to get the end effector po-
sitions for the claw in order to handle collisions with the
balls.

## 2.4 Collisions and Friction

For collision detection, there were many areas of col-
lision to handle for this simulation. The main collisions
included ball to ball collision, ball to ground collision, ball
to wall of the claw machine collision, and claw to ball col-
lision.
In order to calculate ground collision, we treated the
ground and ball as a mass spring damper system, and used
this formulation to calculate the normal force that acts on
the ball.
The formula for the normal force was therefore:
```
fn=ks((Pg−x(t))·ˆn)ˆn−kd(v(t)·ˆn)ˆn (5)
```
where P represents a point on the ground,x(t) repre-
sents the position at t,ˆn represents the unit normal force,
v(t) represents the velocity at t,ks represents the ground
spring constant, and kd represents the damping ground
spring constant.
To calculate the ball-to-ball collisions and ball-to-wall
collisions, we used a bounding object approach. With this
approach, we used a sphere-sphere intersection function
between balls and a sphere-box intersection function for
the ball and the wall. We also used a swept sphere method.
This was to ensure that we traced the continuous trajec-
tory of the balls rather than tracking the balls at discrete
time steps. To handle the collisions, we calculated the
penetration depth between the two objects, and if it was
more than 0, then we took the component of velocity that
is along the penetration direction and reflecting it across
the penetration normal. In addition, we used adaptive
restitution to adjust the coefficient of restitution based on
the speed of the ball. We also applied a dynamic friction
that resisted motion at the end of these collisions to slow
the ball down.
The friction was calculated as:
```
Ffriction= min (μ∥v·n∥,∥vtangent∥) (6)
```
```
vnew=v−Ffriction
```
```
vtangent
∥vtangent∥
```
### (7)

To handle collisions between the claw and the balls,
we used invisible spheres at the tips of the claw. These
spheres use the same collision calculations as the balls
when colliding with other balls.
In order for the claw to grab the balls, the claw’s tips
act as sticky ends where if the 4 tips collide with one ball,
then the claw will grab the ball and proceed to carry it to
the glass hole box.

## 3 Conclusion

We were able to accomplish our goal of simulating a
claw machine. Specifically, the chain carrying the claw
was able to successfully follow a Hermite spline path, the
chain was able to be modeled properly with a mass-spring
damper system, the claw was successfully created using ar-
ticulated kinematics, and the collisions between the balls, 
wall, ground, and claw were working.
In the future, we would like to add Verlet integration
to have smoother motion. In addition, we think that hav-
ing more balls in the machine could make the game more
interesting (but will also add many more collisions). One
other thing that we would like to explore is potentially
adding other games in the island where the game takes
place, to complement the claw machine.


