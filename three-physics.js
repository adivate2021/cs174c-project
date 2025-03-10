// three-physics.js - Physics simulation module for Three.js version
import * as THREE from 'three';
import { vec3, toThreeVec3, add, subtract, scale, length, normalize } from './three-math.js';

// Particle class - adapted for Three.js
export class Particle {
    constructor() {
        this.pos = new THREE.Vector3(0, 0, 0);
        this.prev_pos = new THREE.Vector3(0, 0, 0);
        this.vel = new THREE.Vector3(0, 0, 0);
        this.acc = new THREE.Vector3(0, 0, 0);
        this.force = new THREE.Vector3(0, 0, 0);
        this.ext_force = new THREE.Vector3(0, 0, 0);
        this.mass = 1.0;
        this.valid = true;
        
        // Reference to the Three.js mesh that represents this particle
        this.mesh = null;
    }
    
    // Update the Three.js mesh position
    updateMesh() {
        if (this.mesh) {
            this.mesh.position.copy(this.pos);
        }
    }
}

// Spring class - adapted for Three.js
export class Spring {
    constructor() {
        this.particle_1 = null;
        this.particle_2 = null;
        this.ks = 1.0;  // spring constant
        this.kd = 0.1;  // damping constant
        this.rest_length = 1.0;
        this.valid = true;
        
        // Reference to the Three.js line that represents this spring
        this.line = null;
    }
    
    // Update the Three.js line geometry to match particle positions
    updateLine() {
        if (this.line && this.particle_1 && this.particle_2) {
            const positions = this.line.geometry.attributes.position;
            positions.setXYZ(0, this.particle_1.pos.x, this.particle_1.pos.y, this.particle_1.pos.z);
            positions.setXYZ(1, this.particle_2.pos.x, this.particle_2.pos.y, this.particle_2.pos.z);
            positions.needsUpdate = true;
        }
    }
}

// Simulation class - adapted for Three.js
export class Simulation {
    constructor() {
        this.particles = [];
        this.springs = [];
        this.g_acc = new THREE.Vector3(0, -9.8, 0);  // gravity
        this.ground_y = 0;  // y position of the ground
        this.ground_ks = 1000;  // ground spring constant
        this.ground_kd = 10;  // ground damping constant
        this.dt = 0.01;  // simulation time step
        this.gravity_enabled = true;
    }
    
    // Computes forces for all particles and springs
    computeForces() {
        // Reset forces
        for (const p of this.particles) {
            if (!p.valid) continue;
            p.force.set(0, 0, 0);
            
            // Add external force
            p.force.add(p.ext_force);
            
            // Add gravity if enabled
            if (this.gravity_enabled) {
                p.force.add(this.g_acc.clone().multiplyScalar(p.mass));
            }
            
            // Ground collision
            if (p.pos.y < this.ground_y) {
                // Spring force
                const depth = this.ground_y - p.pos.y;
                const spring_force = new THREE.Vector3(0, 1, 0).multiplyScalar(depth * this.ground_ks);
                p.force.add(spring_force);
                
                // Damping force
                if (p.vel.y < 0) {
                    const damping_force = new THREE.Vector3(0, 1, 0).multiplyScalar(-p.vel.y * this.ground_kd);
                    p.force.add(damping_force);
                }
            }
        }
        
        // Compute spring forces
        for (const s of this.springs) {
            if (!s.valid || !s.particle_1 || !s.particle_2) continue;
            
            const p1 = s.particle_1;
            const p2 = s.particle_2;
            
            if (!p1.valid || !p2.valid) continue;
            
            // Compute spring vector and length
            const spring_vec = p2.pos.clone().sub(p1.pos);
            const spring_len = spring_vec.length();
            
            if (spring_len === 0) continue;  // Avoid division by zero
            
            // Compute spring direction
            const spring_dir = spring_vec.clone().normalize();
            
            // Compute relative velocity
            const rel_vel = p2.vel.clone().sub(p1.vel);
            
            // Compute spring force magnitude
            const spring_force_mag = s.ks * (spring_len - s.rest_length);
            
            // Compute damping force magnitude
            const damping_force_mag = s.kd * rel_vel.dot(spring_dir);
            
            // Compute total force
            const total_force_mag = spring_force_mag + damping_force_mag;
            const force = spring_dir.multiplyScalar(total_force_mag);
            
            // Apply forces to particles
            p1.force.add(force);
            p2.force.sub(force);
        }
    }
    
    // Updates positions and velocities of all particles
    integrate() {
        for (const p of this.particles) {
            if (!p.valid) continue;
            
            // Store previous position
            p.prev_pos.copy(p.pos);
            
            // Compute acceleration
            p.acc.copy(p.force).divideScalar(p.mass);
            
            // Update velocity (semi-implicit Euler integration)
            p.vel.add(p.acc.clone().multiplyScalar(this.dt));
            
            // Update position
            p.pos.add(p.vel.clone().multiplyScalar(this.dt));
            
            // Update the Three.js mesh position
            p.updateMesh();
        }
        
        // Update spring line representations
        for (const s of this.springs) {
            if (s.valid) {
                s.updateLine();
            }
        }
    }
    
    // Simulate one time step
    step() {
        this.computeForces();
        this.integrate();
    }
    
    // Toggle gravity on/off
    toggleGravity() {
        this.gravity_enabled = !this.gravity_enabled;
    }
}

// Chain simulation - adapted for Three.js
export class ChainSim {
    constructor(scene) {
        this.scene = scene;
        this.chainSim = new Simulation();
        this.sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
        this.sphereMaterial = new THREE.MeshPhongMaterial({ color: 0x44aaff });
        this.lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        
        this.setupChain();
    }
    
    setupChain() {
        // Create particles
        for (let i = 0; i < 3; i++) {
            const particle = new Particle();
            particle.mass = 1;
            particle.pos.set(0, 5 - (0.5 * i), 0);
            particle.vel.set(0, 0, 0);
            particle.valid = true;
            
            // Create mesh for this particle
            particle.mesh = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial);
            particle.mesh.position.copy(particle.pos);
            this.scene.add(particle.mesh);
            
            this.chainSim.particles.push(particle);
        }
        
        // Create springs between particles
        for (let i = 0; i < 2; i++) {
            const spring = new Spring();
            spring.particle_1 = this.chainSim.particles[i];
            spring.particle_2 = this.chainSim.particles[i+1];
            spring.ks = 500;
            spring.kd = 10;
            spring.rest_length = 0.5;
            spring.valid = true;
            
            // Create a line to visualize the spring
            const lineGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(6);  // 2 points * 3 coordinates
            
            // Set initial positions
            positions[0] = spring.particle_1.pos.x;
            positions[1] = spring.particle_1.pos.y;
            positions[2] = spring.particle_1.pos.z;
            positions[3] = spring.particle_2.pos.x;
            positions[4] = spring.particle_2.pos.y;
            positions[5] = spring.particle_2.pos.z;
            
            lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            spring.line = new THREE.Line(lineGeometry, this.lineMaterial);
            this.scene.add(spring.line);
            
            this.chainSim.springs.push(spring);
        }
        
        // Create additional particles for the claw
        const particle3 = new Particle();
        particle3.mass = 1;
        particle3.pos.set(1.5, 3, 0);
        particle3.vel.set(0, 0, 0);
        particle3.valid = true;
        particle3.mesh = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial);
        particle3.mesh.position.copy(particle3.pos);
        this.scene.add(particle3.mesh);
        this.chainSim.particles.push(particle3);
        
        const particle4 = new Particle();
        particle4.mass = 1;
        particle4.pos.set(-0.75, 3, 1.3);
        particle4.vel.set(0, 0, 0);
        particle4.valid = true;
        particle4.mesh = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial);
        particle4.mesh.position.copy(particle4.pos);
        this.scene.add(particle4.mesh);
        this.chainSim.particles.push(particle4);
        
        const particle5 = new Particle();
        particle5.mass = 1;
        particle5.pos.set(-0.75, 3, -1.3);
        particle5.vel.set(0, 0, 0);
        particle5.valid = true;
        particle5.mesh = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial);
        particle5.mesh.position.copy(particle5.pos);
        this.scene.add(particle5.mesh);
        this.chainSim.particles.push(particle5);
        
        // Create springs for the claw
        const spring2 = new Spring();
        spring2.particle_1 = this.chainSim.particles[2];
        spring2.particle_2 = this.chainSim.particles[3];
        spring2.ks = 5000;
        spring2.kd = 10;
        spring2.rest_length = 2.5;
        spring2.valid = true;
        
        const lineGeometry2 = new THREE.BufferGeometry();
        const positions2 = new Float32Array(6);
        positions2[0] = spring2.particle_1.pos.x;
        positions2[1] = spring2.particle_1.pos.y;
        positions2[2] = spring2.particle_1.pos.z;
        positions2[3] = spring2.particle_2.pos.x;
        positions2[4] = spring2.particle_2.pos.y;
        positions2[5] = spring2.particle_2.pos.z;
        
        lineGeometry2.setAttribute('position', new THREE.BufferAttribute(positions2, 3));
        spring2.line = new THREE.Line(lineGeometry2, this.lineMaterial);
        this.scene.add(spring2.line);
        
        this.chainSim.springs.push(spring2);
        
        const spring3 = new Spring();
        spring3.particle_1 = this.chainSim.particles[2];
        spring3.particle_2 = this.chainSim.particles[4];
        spring3.ks = 5000;
        spring3.kd = 10;
        spring3.rest_length = 2.5;
        spring3.valid = true;
        
        const lineGeometry3 = new THREE.BufferGeometry();
        const positions3 = new Float32Array(6);
        positions3[0] = spring3.particle_1.pos.x;
        positions3[1] = spring3.particle_1.pos.y;
        positions3[2] = spring3.particle_1.pos.z;
        positions3[3] = spring3.particle_2.pos.x;
        positions3[4] = spring3.particle_2.pos.y;
        positions3[5] = spring3.particle_2.pos.z;
        
        lineGeometry3.setAttribute('position', new THREE.BufferAttribute(positions3, 3));
        spring3.line = new THREE.Line(lineGeometry3, this.lineMaterial);
        this.scene.add(spring3.line);
        
        this.chainSim.springs.push(spring3);
        
        const spring4 = new Spring();
        spring4.particle_1 = this.chainSim.particles[2];
        spring4.particle_2 = this.chainSim.particles[5];
        spring4.ks = 5000;
        spring4.kd = 10;
        spring4.rest_length = 2.5;
        spring4.valid = true;
        
        const lineGeometry4 = new THREE.BufferGeometry();
        const positions4 = new Float32Array(6);
        positions4[0] = spring4.particle_1.pos.x;
        positions4[1] = spring4.particle_1.pos.y;
        positions4[2] = spring4.particle_1.pos.z;
        positions4[3] = spring4.particle_2.pos.x;
        positions4[4] = spring4.particle_2.pos.y;
        positions4[5] = spring4.particle_2.pos.z;
        
        lineGeometry4.setAttribute('position', new THREE.BufferAttribute(positions4, 3));
        spring4.line = new THREE.Line(lineGeometry4, this.lineMaterial);
        this.scene.add(spring4.line);
        
        this.chainSim.springs.push(spring4);
        
        // Configure simulation
        this.chainSim.g_acc.set(0, -9.8, 0);
        this.chainSim.ground_ks = 5000;
        this.chainSim.ground_kd = 10;
        
        // Fixed top particle
        this.chainSim.particles[0].ext_force.set(0, 0, 0);
        this.chainSim.particles[0].acc.set(0, 0, 0);
        this.chainSim.particles[0].vel.set(0, 0, 0);
    }
    
    update(dt) {
        // Fixed time step for simulation stability
        const subSteps = 10;
        const subDt = dt / subSteps;
        
        for (let i = 0; i < subSteps; i++) {
            this.chainSim.dt = subDt;
            this.chainSim.step();
        }
    }
    
    reset() {
        // Reset particle positions and velocities
        for (let i = 0; i < 3; i++) {
            this.chainSim.particles[i].pos.set(0, 5 - (0.5 * i), 0);
            this.chainSim.particles[i].vel.set(0, 0, 0);
            this.chainSim.particles[i].updateMesh();
        }
        
        this.chainSim.particles[3].pos.set(1.5, 3, 0);
        this.chainSim.particles[3].vel.set(0, 0, 0);
        this.chainSim.particles[3].updateMesh();
        
        this.chainSim.particles[4].pos.set(-0.75, 3, 1.3);
        this.chainSim.particles[4].vel.set(0, 0, 0);
        this.chainSim.particles[4].updateMesh();
        
        this.chainSim.particles[5].pos.set(-0.75, 3, -1.3);
        this.chainSim.particles[5].vel.set(0, 0, 0);
        this.chainSim.particles[5].updateMesh();
        
        // Update all springs
        for (const s of this.chainSim.springs) {
            s.updateLine();
        }
    }
    
    toggleGravity() {
        this.chainSim.toggleGravity();
    }
}

// Ball physics using spring-damper method
export class BallPhysics {
    constructor() {
        // Physics constants
        this.gravity = new THREE.Vector3(0, -9.8, 0);
        this.isGravityEnabled = true;
        this.damping = 0.985; // Less damping for more natural movement
        
        // Spring-damper constants for wall collisions - moderate values
        this.wallSpringConstant = 40.0;  // Spring stiffness
        this.wallDampingConstant = 4.0;  // Moderate damping
        
        // Spring-damper constants for ball-ball collisions
        this.ballSpringConstant = 30.0;  // Spring stiffness
        this.ballDampingConstant = 3.0;  // Moderate damping
        
        // Time step for simulation
        this.dt = 0.016; // 60 FPS
    }
    
    // Update physics for a ball with continuous collision detection for fast-moving objects
    updateBallPhysics(ball, dt = this.dt) {
        if (!ball.userData || !ball.userData.velocity) return;
        
        // Store the previous position for continuous collision detection
        const prevPosition = ball.position.clone();
        
        // Apply gravity if enabled - with normal strength
        if (this.isGravityEnabled) {
            // Use full gravity for proper acceleration
            ball.userData.velocity.addScaledVector(this.gravity, dt);
        }
        
        // Check velocity magnitude - if it's high, we need continuous collision detection
        const velocity = ball.userData.velocity;
        const speed = velocity.length();
        const radius = ball.userData.radius || 0.4;
        
        // If speed is high relative to object radius, use swept sphere collision detection
        if (speed * dt > radius * 0.5) {
            // This ball is moving fast enough that it might tunnel through obstacles
            // Use continuous (swept) collision detection
            this.updateWithContinuousCollision(ball, dt, prevPosition);
        } else {
            // Regular update for slow-moving balls
            ball.position.addScaledVector(velocity, dt);
        }
        
        // Apply damping (air resistance) - less damping for more natural movement
        velocity.multiplyScalar(this.damping);
        
        // Apply a reasonable velocity cap to prevent extreme values
        const maxVelocity = 10.0; // Higher max velocity 
        const currentSpeed = velocity.length();
        if (currentSpeed > maxVelocity) {
            velocity.multiplyScalar(maxVelocity / currentSpeed);
        }
        
        // Update bounding sphere position if this is a ball
        if (ball.userData.boundingSphere) {
            ball.userData.boundingSphere.center.copy(ball.position);
        }
    }
    
    // Continuous collision detection for fast-moving objects
    updateWithContinuousCollision(ball, dt, startPosition) {
        const velocity = ball.userData.velocity;
        const radius = ball.userData.radius || 0.4;
        
        // Calculate the movement vector for this frame
        const moveVector = velocity.clone().multiplyScalar(dt);
        const moveDistance = moveVector.length();
        
        // If hardly moving, just do a regular update
        if (moveDistance < 0.001) {
            ball.position.addScaledVector(velocity, dt);
            return;
        }
        
        // Normalize the movement direction
        const moveDirection = moveVector.clone().normalize();
        
        // How far the ball will travel this frame
        const fullDistance = moveDistance;
        let remainingDistance = fullDistance;
        
        // Set a maximum number of iterations to prevent infinite loops
        const maxIterations = 5;
        let iterations = 0;
        
        // Set current position to start position
        ball.position.copy(startPosition);
        
        // Use ray casting to check for collisions along the path
        while (remainingDistance > 0.001 && iterations < maxIterations) {
            iterations++;
            
            // Move the ball along the ray by the remaining distance
            const stepDistance = Math.min(remainingDistance, radius);
            ball.position.addScaledVector(moveDirection, stepDistance);
            remainingDistance -= stepDistance;
            
            // Now check for collisions at this position and resolve if needed
            let collided = false;
            
            // Handle collision with main bounds if passed in
            if (ball._lastCollider && ball._lastCollider.box) {
                const box = ball._lastCollider.box;
                
                // Simple sphere-box collision test
                if (this.sphereIntersectsBox(ball.position, radius, box)) {
                    collided = true;
                    
                    // Find the closest point on the box to the sphere center
                    const closestPoint = new THREE.Vector3();
                    closestPoint.x = Math.max(box.min.x, Math.min(ball.position.x, box.max.x));
                    closestPoint.y = Math.max(box.min.y, Math.min(ball.position.y, box.max.y));
                    closestPoint.z = Math.max(box.min.z, Math.min(ball.position.z, box.max.z));
                    
                    // Calculate penetration direction and depth
                    const penetrationDir = new THREE.Vector3().subVectors(ball.position, closestPoint).normalize();
                    const penetrationDepth = radius - ball.position.distanceTo(closestPoint);
                    
                    if (penetrationDepth > 0) {
                        // Move the ball out of the box along penetration direction
                        ball.position.addScaledVector(penetrationDir, penetrationDepth + 0.001);
                        
                        // Reflect velocity along penetration direction
                        const bounceCoef = 0.7;
                        const dot = velocity.dot(penetrationDir);
                        velocity.addScaledVector(penetrationDir, -2 * dot * bounceCoef);
                        
                        // Update remaining distance based on reflection
                        remainingDistance = 0; // Stop movement for this frame after collision
                    }
                }
            }
            
            if (!collided && remainingDistance > 0.001) {
                // If we didn't collide, we can safely move the remaining distance
                ball.position.addScaledVector(moveDirection, remainingDistance);
                remainingDistance = 0;
            }
        }
    }
    
    // Helper method to check if a sphere intersects a box
    sphereIntersectsBox(sphereCenter, sphereRadius, box) {
        // Find the closest point on the box to the sphere center
        const closestPoint = new THREE.Vector3();
        closestPoint.x = Math.max(box.min.x, Math.min(sphereCenter.x, box.max.x));
        closestPoint.y = Math.max(box.min.y, Math.min(sphereCenter.y, box.max.y));
        closestPoint.z = Math.max(box.min.z, Math.min(sphereCenter.z, box.max.z));
        
        // Calculate distance between the sphere center and the closest point
        const distance = sphereCenter.distanceTo(closestPoint);
        
        // If the distance is less than the radius, the sphere intersects the box
        return distance < sphereRadius;
    }
    
    // Handle collision between a ball and a bounding box using a hybrid approach
    handleBoxCollision(ball, box, isGlassHole = false) {
        if (!ball.userData.boundingSphere) return;
        
        const sphere = ball.userData.boundingSphere;
        const radius = sphere.radius;
        const position = ball.position.clone();
        const velocity = ball.userData.velocity;
        
        // Initialize applied force
        let appliedForce = new THREE.Vector3(0, 0, 0);
        let hasCollision = false;
        
        // If this is the glass hole box, we handle it differently
        if (isGlassHole) {
            return this.handleGlassHoleCollision(ball, box);
        }
        
        // Strict bounding box collision resolution first - no penetration allowed
        
        // X-min boundary
        if (position.x - radius < box.min.x) {
            hasCollision = true;
            // Immediate position correction - place exactly at boundary
            ball.position.x = box.min.x + radius;
            // Reverse velocity component with damping
            const bounceCoef = 0.7; // Coefficient of restitution
            velocity.x = -velocity.x * bounceCoef;
        }
        
        // X-max boundary
        if (position.x + radius > box.max.x) {
            hasCollision = true;
            // Immediate position correction - place exactly at boundary
            ball.position.x = box.max.x - radius;
            // Reverse velocity component with damping
            const bounceCoef = 0.7; // Coefficient of restitution
            velocity.x = -velocity.x * bounceCoef;
        }
        
        // Y-min boundary (floor)
        if (position.y - radius < box.min.y) {
            hasCollision = true;
            // Immediate position correction - place exactly at boundary
            ball.position.y = box.min.y + radius;
            // Reverse velocity component with damping
            const bounceCoef = 0.7; // Coefficient of restitution
            velocity.y = -velocity.y * bounceCoef;
            
            // Apply additional drag to balls on the floor
            velocity.x *= 0.95;
            velocity.z *= 0.95;
        }
        
        // Y-max boundary (ceiling)
        if (position.y + radius > box.max.y) {
            hasCollision = true;
            // Immediate position correction - place exactly at boundary
            ball.position.y = box.max.y - radius;
            // Reverse velocity component with damping
            const bounceCoef = 0.7; // Coefficient of restitution
            velocity.y = -velocity.y * bounceCoef;
        }
        
        // Z-min boundary
        if (position.z - radius < box.min.z) {
            hasCollision = true;
            // Immediate position correction - place exactly at boundary
            ball.position.z = box.min.z + radius;
            // Reverse velocity component with damping
            const bounceCoef = 0.7; // Coefficient of restitution
            velocity.z = -velocity.z * bounceCoef;
        }
        
        // Z-max boundary
        if (position.z + radius > box.max.z) {
            hasCollision = true;
            // Immediate position correction - place exactly at boundary
            ball.position.z = box.max.z - radius;
            // Reverse velocity component with damping
            const bounceCoef = 0.7; // Coefficient of restitution
            velocity.z = -velocity.z * bounceCoef;
        }
        
        // If there was a collision, add some additional damping
        if (hasCollision) {
            // Apply additional damping on collision
            velocity.multiplyScalar(0.95);
        }
        
        // Update the bounding sphere position to match the ball
        sphere.center.copy(ball.position);
        
        return hasCollision;
    }
    
    // Special handling for the glass hole with solid walls except for the top opening
    handleGlassHoleCollision(ball, glassBox) {
        if (!ball.userData.boundingSphere) return false;
        
        const sphere = ball.userData.boundingSphere;
        const radius = sphere.radius;
        const position = ball.position.clone();
        const velocity = ball.userData.velocity;
        
        let hasCollision = false;
        
        // Special checks to prevent balls from teleporting inside the box
        // First, determine if the ball is predominantly outside or inside the box
        
        // Calculate distance to each wall (negative means inside)
        const distanceToLeftWall = position.x - radius - glassBox.min.x;
        const distanceToRightWall = glassBox.max.x - (position.x + radius);
        const distanceToBottomWall = position.y - radius - glassBox.min.y;
        const distanceToFrontWall = glassBox.max.z - (position.z + radius);
        const distanceToBackWall = position.z - radius - glassBox.min.z;
        
        // Count how many walls the ball is outside of
        let wallsOutside = 0;
        if (distanceToLeftWall < 0) wallsOutside++;
        if (distanceToRightWall < 0) wallsOutside++;
        if (distanceToBottomWall < 0) wallsOutside++;
        if (distanceToFrontWall < 0) wallsOutside++;
        if (distanceToBackWall < 0) wallsOutside++;
        
        // If ball is outside most walls, it's predominantly outside
        const isPredominantlyOutside = wallsOutside >= 3;
        
        // Determine if ball is already completely inside
        const isCompletelyInside = (
            position.x - radius > glassBox.min.x &&
            position.x + radius < glassBox.max.x &&
            position.y - radius > glassBox.min.y &&
            position.z - radius > glassBox.min.z &&
            position.z + radius < glassBox.max.z
        );
        
        // For balls predominantly outside, only allow them in through the top
        if (isPredominantlyOutside && !isCompletelyInside) {
            // Handle LEFT wall collision - balls outside should bounce off
            if (position.x - radius < glassBox.min.x && 
                position.y >= glassBox.min.y && 
                position.y <= glassBox.max.y && 
                position.z >= glassBox.min.z && 
                position.z <= glassBox.max.z) {
                
                // Only handle collision if approaching from outside
                if (velocity.x < 0) {
                    hasCollision = true;
                    // Push completely outside the wall
                    ball.position.x = glassBox.min.x + radius + 0.01;
                    // Reverse x velocity with damping
                    velocity.x = -velocity.x * 0.7;
                }
            }
            
            // Handle RIGHT wall collision - balls outside should bounce off
            if (position.x + radius > glassBox.max.x && 
                position.y >= glassBox.min.y && 
                position.y <= glassBox.max.y && 
                position.z >= glassBox.min.z && 
                position.z <= glassBox.max.z) {
                
                // Only handle collision if approaching from outside
                if (velocity.x > 0) {
                    hasCollision = true;
                    // Push completely outside the wall
                    ball.position.x = glassBox.max.x - radius - 0.01;
                    // Reverse x velocity with damping
                    velocity.x = -velocity.x * 0.7;
                }
            }
            
            // Handle FRONT wall collision - balls outside should bounce off
            if (position.z + radius > glassBox.max.z && 
                position.y >= glassBox.min.y && 
                position.y <= glassBox.max.y && 
                position.x >= glassBox.min.x && 
                position.x <= glassBox.max.x) {
                
                // Only handle collision if approaching from outside
                if (velocity.z > 0) {
                    hasCollision = true;
                    // Push completely outside the wall
                    ball.position.z = glassBox.max.z - radius - 0.01;
                    // Reverse z velocity with damping
                    velocity.z = -velocity.z * 0.7;
                }
            }
            
            // Handle BACK wall collision - balls outside should bounce off
            if (position.z - radius < glassBox.min.z && 
                position.y >= glassBox.min.y && 
                position.y <= glassBox.max.y && 
                position.x >= glassBox.min.x && 
                position.x <= glassBox.max.x) {
                
                // Only handle collision if approaching from outside
                if (velocity.z < 0) {
                    hasCollision = true;
                    // Push completely outside the wall
                    ball.position.z = glassBox.min.z + radius + 0.01;
                    // Reverse z velocity with damping
                    velocity.z = -velocity.z * 0.7;
                }
            }
            
            // Handle BOTTOM wall collision - balls outside should bounce off
            if (position.y - radius < glassBox.min.y && 
                position.x >= glassBox.min.x && 
                position.x <= glassBox.max.x && 
                position.z >= glassBox.min.z && 
                position.z <= glassBox.max.z) {
                
                // Only handle collision if approaching from outside
                if (velocity.y < 0) {
                    hasCollision = true;
                    // Push completely outside the wall
                    ball.position.y = glassBox.min.y + radius + 0.01;
                    // Reverse y velocity with damping
                    velocity.y = -velocity.y * 0.5; // Less bouncy on floor
                    
                    // Apply floor friction
                    velocity.x *= 0.9;
                    velocity.z *= 0.9;
                }
            }
        } else {
            // For balls predominantly inside, handle containment normally
            
            // LEFT wall (X-min) - only if inside already
            if (position.x - radius < glassBox.min.x) {
                hasCollision = true;
                // Position correction
                ball.position.x = glassBox.min.x + radius + 0.01;
                // Reverse velocity with damping
                velocity.x = Math.abs(velocity.x) * 0.7;
            }
            
            // RIGHT wall (X-max) - only if inside already
            if (position.x + radius > glassBox.max.x) {
                hasCollision = true;
                // Position correction
                ball.position.x = glassBox.max.x - radius - 0.01;
                // Reverse velocity with damping
                velocity.x = -Math.abs(velocity.x) * 0.7;
            }
            
            // BOTTOM wall (Y-min) - only if inside already
            if (position.y - radius < glassBox.min.y) {
                hasCollision = true;
                // Position correction
                ball.position.y = glassBox.min.y + radius + 0.01;
                // Reverse velocity with damping
                velocity.y = Math.abs(velocity.y) * 0.5; // Less bouncy
                
                // Add extra damping when on floor
                velocity.x *= 0.92;
                velocity.z *= 0.92;
            }
            
            // FRONT wall (Z-max) - only if inside already
            if (position.z + radius > glassBox.max.z) {
                hasCollision = true;
                // Position correction
                ball.position.z = glassBox.max.z - radius - 0.01;
                // Reverse velocity with damping
                velocity.z = -Math.abs(velocity.z) * 0.7;
            }
            
            // BACK wall (Z-min) - only if inside already
            if (position.z - radius < glassBox.min.z) {
                hasCollision = true;
                // Position correction
                ball.position.z = glassBox.min.z + radius + 0.01;
                // Reverse velocity with damping
                velocity.z = Math.abs(velocity.z) * 0.7;
            }
        }
        
        // Apply additional damping on collision
        if (hasCollision) {
            velocity.multiplyScalar(0.97);
            
            // Add tiny jitter to prevent sticking
            if (velocity.lengthSq() < 0.1) {
                velocity.x += (Math.random() - 0.5) * 0.03;
                velocity.z += (Math.random() - 0.5) * 0.03;
            }
        }
        
        // Update the bounding sphere position
        sphere.center.copy(ball.position);
        
        return hasCollision;
    }
    
    // Handle collision between two balls using improved collision response
    handleBallCollision(ball1, ball2) {
        if (!ball1.userData.boundingSphere || !ball2.userData.boundingSphere) return;
        
        const sphere1 = ball1.userData.boundingSphere;
        const sphere2 = ball2.userData.boundingSphere;
        
        // Calculate distance between the centers
        const distance = ball1.position.distanceTo(ball2.position);
        const combinedRadius = sphere1.radius + sphere2.radius;
        
        // Check for collision (if distance is less than combined radius)
        if (distance < combinedRadius) {
            // If balls are exactly overlapping, separate them slightly
            if (distance < 0.001) {
                // Add small random offset to prevent perfect overlap
                ball2.position.x += 0.01 + Math.random() * 0.02;
                ball2.position.z += 0.01 + Math.random() * 0.02;
                return; // Skip this frame and handle next frame after separation
            }
            
            // Calculate penetration depth with a small buffer to prevent jittering
            const penetration = Math.min(combinedRadius - distance, Math.min(sphere1.radius, sphere2.radius)) * 0.5; 
            
            // Calculate normal direction (from ball2 to ball1)
            const normal = new THREE.Vector3().subVectors(ball1.position, ball2.position).normalize();
            
            // Check if either ball is immobile
            const isImmobile1 = ball1.userData.isImmobile === true;
            const isImmobile2 = ball2.userData.isImmobile === true;
            
            // Separate the balls to prevent overlap based on mobility
            if (isImmobile1 && isImmobile2) {
                // Both are immobile - do nothing or maybe add a small random jitter
                return;
            } else if (isImmobile1) {
                // Ball1 is immobile, so move only ball2
                ball2.position.addScaledVector(normal, -penetration);
            } else if (isImmobile2) {
                // Ball2 is immobile, so move only ball1
                ball1.position.addScaledVector(normal, penetration);
            } else {
                // Both are mobile - use standard physics-based separation
                const totalMass = ball1.userData.mass + ball2.userData.mass;
                const ratio1 = ball2.userData.mass / totalMass;
                const ratio2 = ball1.userData.mass / totalMass;
                
                // Move balls apart proportional to their masses
                ball1.position.addScaledVector(normal, penetration * ratio1);
                ball2.position.addScaledVector(normal, -penetration * ratio2);
            }
            
            // Update the spheres to match the new positions
            sphere1.center.copy(ball1.position);
            sphere2.center.copy(ball2.position);
            
            // Calculate relative velocity
            const v1 = ball1.userData.velocity;
            const v2 = ball2.userData.velocity;
            const relativeVelocity = new THREE.Vector3().subVectors(v1, v2);
            
            // Check if balls are separating (moving away from each other)
            // If so, we don't need to apply impulse, reduce computational load
            if (relativeVelocity.dot(normal) > 0) {
                return;
            }
            
            // Apply impulse based on mobility
            if (isImmobile1 && isImmobile2) {
                // Both immobile - no velocity change
                return;
            } else if (isImmobile1) {
                // Only ball1 is immobile - reflect ball2's velocity
                const dotProduct = v2.dot(normal);
                v2.addScaledVector(normal, -2 * dotProduct);
                // Apply damping after reflection
                v2.multiplyScalar(0.7); // More damping for collision with immobile object
            } else if (isImmobile2) {
                // Only ball2 is immobile - reflect ball1's velocity
                const dotProduct = v1.dot(normal);
                v1.addScaledVector(normal, -2 * dotProduct);
                // Apply damping after reflection
                v1.multiplyScalar(0.7); // More damping for collision with immobile object
            } else {
                // Both are mobile - use conservation of momentum
                // Calculate coefficient of restitution (bounciness)
                const restitution = 0.7;
                
                // Calculate impulse scalar
                const impulseScalar = -(1 + restitution) * relativeVelocity.dot(normal) / 
                                     (1/ball1.userData.mass + 1/ball2.userData.mass);
                
                // Apply impulse
                const impulse = normal.clone().multiplyScalar(impulseScalar);
                v1.addScaledVector(impulse, 1/ball1.userData.mass);
                v2.addScaledVector(impulse, -1/ball2.userData.mass);
            }
            
            // Add a small amount of randomness to prevent balls from getting stuck
            if (Math.abs(v1.y) < 0.1 && Math.abs(v2.y) < 0.1) {
                // If both balls have very low vertical velocity (likely at rest)
                const smallRandom = 0.05;
                if (!isImmobile1) {
                    v1.x += (Math.random() - 0.5) * smallRandom;
                    v1.z += (Math.random() - 0.5) * smallRandom;
                }
                if (!isImmobile2) {
                    v2.x += (Math.random() - 0.5) * smallRandom;
                    v2.z += (Math.random() - 0.5) * smallRandom;
                }
            }
            
            // Apply additional damping to prevent excessive bouncing
            if (!isImmobile1) v1.multiplyScalar(0.99);
            if (!isImmobile2) v2.multiplyScalar(0.99);
        }
    }
    
    // Check if a ball is far from a reference position and reset if needed
    checkBallBounds(ball, referencePos, maxDistance, resetFunction) {
        if (!ball) return;
        
        const distanceFromCenter = ball.position.distanceTo(referencePos);
        if (distanceFromCenter > maxDistance) {
            console.log(`Ball ${ball.name} has fallen out of bounds, resetting position`);
            if (typeof resetFunction === 'function') {
                resetFunction(ball);
            }
            return true;
        }
        return false;
    }
    
    // Toggle gravity on/off
    toggleGravity() {
        this.isGravityEnabled = !this.isGravityEnabled;
        return this.isGravityEnabled;
    }
}

// Bounding box collider for efficient collision detection
export class BoundingBoxCollider {
    constructor(min, max, color = 0xffff00) {
        this.box = new THREE.Box3(
            new THREE.Vector3(min.x, min.y, min.z),
            new THREE.Vector3(max.x, max.y, max.z)
        );
        // Create a box helper with the specified color
        this.helper = new THREE.Box3Helper(this.box, color);
        this.helper.visible = true; // Ensure visibility
        this.color = color;
        
        console.log(`Created BoundingBoxCollider at (${min.x}, ${min.y}, ${min.z}) to (${max.x}, ${max.y}, ${max.z})`);
    }
    
    // Set the box from min/max points
    setFromMinMax(min, max) {
        this.box.set(min, max);
        this.updateHelper();
        console.log(`Updated BoundingBoxCollider to (${min.x}, ${min.y}, ${min.z}) to (${max.x}, ${max.y}, ${max.z})`);
        return this;
    }
    
    // Set the box from center point and size
    setFromCenterAndSize(center, size) {
        const halfSize = size.clone().multiplyScalar(0.5);
        this.box.set(
            center.clone().sub(halfSize),
            center.clone().add(halfSize)
        );
        this.updateHelper();
        return this;
    }
    
    // Update the helper to match the box
    updateHelper() {
        if (this.helper) {
            // Recreate the helper if needed
            this.helper.box = this.box;
            this.helper.updateMatrixWorld(true);
            
            // Ensure the helper is visible
            this.helper.visible = true;
            if (this.helper.material) {
                this.helper.material.color.set(this.color);
                this.helper.material.needsUpdate = true;
            }
        } else {
            // Create a new helper if one doesn't exist
            this.helper = new THREE.Box3Helper(this.box, this.color);
        }
    }
    
    // Check if a point is inside the box
    containsPoint(point) {
        return this.box.containsPoint(point);
    }
    
    // Get the closest point on the box to the given point
    clampPoint(point, target) {
        return this.box.clampPoint(point, target);
    }
    
    // Expand the box by a scalar amount
    expandByScalar(scalar) {
        this.box.expandByScalar(scalar);
        this.updateHelper();
        return this;
    }
} 