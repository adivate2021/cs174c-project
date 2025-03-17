// Ball physics using spring-damper method
export class BallPhysics {
    constructor() {
        // Physics constants
        this.gravity = new THREE.Vector3(0, -9.8, 0);
        this.isGravityEnabled = true;
        this.damping = 0.98; // Less damping for more natural movement
        
        // Spring-damper constants for wall collisions - moderate values
        this.wallSpringConstant = 40.0;  // Spring stiffness
        this.wallDampingConstant = 8.0;  // Moderate damping
        
        // Spring-damper constants for ball-ball collisions
        this.ballSpringConstant = 30.0;  // Spring stiffness
        this.ballDampingConstant = 3.0;  // Moderate damping
        
        // Time step for simulation
        this.dt = 0.008; // 60 FPS
        
        // Velocity threshold for resting state
        this.restVelocityThreshold = 0.1; // Velocity magnitude below which objects come to rest
        this.slowMovingThreshold = 0.5;   // Threshold for reducing restitution coefficient
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
        // ball.userData.velocity.addScaledVector(ball.userData.acceleration, dt)
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
        
        // Keep track of all colliders to check
        const colliders = [];
        
        // Add main bounding box if it exists
        if (ball._lastCollider && ball._lastCollider.box) {
            colliders.push({ type: 'box', box: ball._lastCollider.box });
        }
        
        // Add glass box if it exists
        if (ball._glassBox) {
            colliders.push({ type: 'glass', box: ball._glassBox });
        }
        
        // Use ray casting to check for collisions along the path
        while (remainingDistance > 0.001 && iterations < maxIterations) {
            iterations++;
            
            // Move the ball along the ray by the remaining distance
            const stepDistance = Math.min(remainingDistance, radius);
            ball.position.addScaledVector(moveDirection, stepDistance);
            remainingDistance -= stepDistance;
            
            // Now check for collisions at this position and resolve if needed
            let collided = false;
            
            // Check against all colliders
            for (const collider of colliders) {
                const box = collider.box;
                
                // Simple sphere-box collision test
                if (this.sphereIntersectsBox(ball.position, radius, box)) {
                    collided = true;
                    
                    // For glass box, only collide if not at the top opening
                    if (collider.type === 'glass') {
                        // Find closest point on box to determine if we're at the top
                        const closestPoint = new THREE.Vector3();
                        closestPoint.x = Math.max(box.min.x, Math.min(ball.position.x, box.max.x));
                        closestPoint.y = Math.max(box.min.y, Math.min(ball.position.y, box.max.y));
                        closestPoint.z = Math.max(box.min.z, Math.min(ball.position.z, box.max.z));
                        
                        // If at the top of the glass box, allow movement (this is the opening)
                        if (closestPoint.y === box.max.y) {
                            collided = false;
                            continue;
                        }
                    }
                    
                    // Find the closest point on the box to the sphere center
                    const closestPoint = new THREE.Vector3();
                    closestPoint.x = Math.max(box.min.x, Math.min(ball.position.x, box.max.x));
                    closestPoint.y = Math.max(box.min.y, Math.min(ball.position.y, box.max.y));
                    closestPoint.z = Math.max(box.min.z, Math.min(ball.position.z, box.max.z));
                    
                    // Calculate penetration direction and depth
                    const penetrationDir = new THREE.Vector3().subVectors(ball.position, closestPoint).normalize();
                    const penetrationDepth = radius - ball.position.distanceTo(closestPoint);
                    
                    if (penetrationDepth > 0) {
                        // Move the ball out of the box along penetration direction with extra buffer
                        ball.position.addScaledVector(penetrationDir, penetrationDepth + 0.002);
                        
                        // Reflect velocity along penetration direction using adaptive restitution
                        const speedAlongNormal = Math.abs(velocity.dot(penetrationDir));
                        const bounceCoef = this.calculateAdaptiveRestitution(speedAlongNormal);
                        const dot = velocity.dot(penetrationDir);
                        velocity.addScaledVector(penetrationDir, -2 * dot * bounceCoef);
                        
                        // Apply friction after collision
                        this.applyFriction(velocity, penetrationDir, ball.userData.mass || 1);
                        
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

    spheresIntersect(sphere1, sphere2) {
        // Ensure bounding spheres are updated
        sphere1.geometry.computeBoundingSphere();
        sphere2.geometry.computeBoundingSphere();
    
        // Get world positions
        let pos1 = new THREE.Vector3();
        let pos2 = new THREE.Vector3();
        sphere1.getWorldPosition(pos1);
        sphere2.getWorldPosition(pos2);
    
        // Get radii
        let radius1 = sphere1.geometry.boundingSphere.radius * sphere1.scale.x;
        let radius2 = sphere2.geometry.boundingSphere.radius * sphere2.scale.x;
    
        // Calculate distance between centers
        let distance = pos1.distanceTo(pos2);
    
        // Check intersection
        return distance <= (radius1 + radius2);
    }
    
    
    // Handle collision between a ball and a bounding box using a hybrid approach
    handleBoxCollision(ball, box, isGlassHole = false) {
        if (!ball.userData.boundingSphere) return;
        
        // Register this box as a last collider for continuous collision detection
        if (!isGlassHole) {
            ball._lastCollider = { box };
        }
        
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
            ball.position.x = box.min.x + radius + 0.001; // Add small buffer to prevent recollision
            // Reverse velocity component with adaptive damping
            const speed = Math.abs(velocity.x);
            const bounceCoef = this.calculateAdaptiveRestitution(speed);
            velocity.x = -velocity.x * bounceCoef;
            
            // Apply friction after collision
            this.applyFriction(velocity, new THREE.Vector3(1, 0, 0), ball.userData.mass || 1);
            
            // Zero out velocity if it's below threshold
            this.applyVelocityThreshold(velocity);
        }
        
        // X-max boundary
        if (position.x + radius > box.max.x) {
            hasCollision = true;
            // Immediate position correction - place exactly at boundary
            ball.position.x = box.max.x - radius - 0.001; // Add small buffer to prevent recollision
            // Reverse velocity component with adaptive damping
            const speed = Math.abs(velocity.x);
            const bounceCoef = this.calculateAdaptiveRestitution(speed);
            velocity.x = -velocity.x * bounceCoef;
            
            // Apply friction after collision
            this.applyFriction(velocity, new THREE.Vector3(-1, 0, 0), ball.userData.mass || 1);
            
            // Zero out velocity if it's below threshold
            this.applyVelocityThreshold(velocity);
        }
        
        // Y-min boundary (floor)
        if (position.y - radius < box.min.y) {
            hasCollision = true;
            // Immediate position correction - place exactly at boundary
            ball.position.y = box.min.y + radius + 0.001; // Add small buffer to prevent recollision
            // Reverse velocity component with adaptive damping
            const speed = Math.abs(velocity.y);
            const bounceCoef = this.calculateAdaptiveRestitution(speed);
            velocity.y = -velocity.y * bounceCoef;
            
            // Apply additional drag to balls on the floor
            velocity.x *= 0.95;
            velocity.z *= 0.95;
            
            // Apply friction after collision with floor
            this.applyFriction(velocity, new THREE.Vector3(0, 1, 0), ball.userData.mass || 1, 0.3);
            
            // Zero out velocity if it's below threshold
            this.applyVelocityThreshold(velocity);
        }
        
        // Y-max boundary (ceiling)
        if (position.y + radius > box.max.y) {
            hasCollision = true;
            // Immediate position correction - place exactly at boundary
            ball.position.y = box.max.y - radius - 0.001; // Add small buffer to prevent recollision
            // Reverse velocity component with adaptive damping
            const speed = Math.abs(velocity.y);
            const bounceCoef = this.calculateAdaptiveRestitution(speed);
            velocity.y = -velocity.y * bounceCoef;
            
            // Apply friction after collision
            this.applyFriction(velocity, new THREE.Vector3(0, -1, 0), ball.userData.mass || 1);
            
            // Zero out velocity if it's below threshold
            this.applyVelocityThreshold(velocity);
        }
        
        // Z-min boundary
        if (position.z - radius < box.min.z) {
            hasCollision = true;
            // Immediate position correction - place exactly at boundary
            ball.position.z = box.min.z + radius + 0.001; // Add small buffer to prevent recollision
            // Reverse velocity component with adaptive damping
            const speed = Math.abs(velocity.z);
            const bounceCoef = this.calculateAdaptiveRestitution(speed);
            velocity.z = -velocity.z * bounceCoef;
            
            // Apply friction after collision
            this.applyFriction(velocity, new THREE.Vector3(0, 0, 1), ball.userData.mass || 1);
            
            // Zero out velocity if it's below threshold
            this.applyVelocityThreshold(velocity);
        }
        
        // Z-max boundary
        if (position.z + radius > box.max.z) {
            hasCollision = true;
            // Immediate position correction - place exactly at boundary
            ball.position.z = box.max.z - radius - 0.001; // Add small buffer to prevent recollision
            // Reverse velocity component with adaptive damping
            const speed = Math.abs(velocity.z);
            const bounceCoef = this.calculateAdaptiveRestitution(speed);
            velocity.z = -velocity.z * bounceCoef;
            
            // Apply friction after collision
            this.applyFriction(velocity, new THREE.Vector3(0, 0, -1), ball.userData.mass || 1);
            
            // Zero out velocity if it's below threshold
            this.applyVelocityThreshold(velocity);
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
        
        // Register this glass box as a collider for continuous collision detection
        ball._glassBox = glassBox;
        
        const sphere = ball.userData.boundingSphere;
        const radius = sphere.radius;
        const position = ball.position.clone();
        const velocity = ball.userData.velocity;
        
        let hasCollision = false;
        
        if (this.sphereIntersectsBox(ball.position, radius, glassBox)) {
            hasCollision = true;
            
            // Find the closest point on the box to the sphere center
            const closestPoint = new THREE.Vector3();
            closestPoint.x = Math.max(glassBox.min.x, Math.min(ball.position.x, glassBox.max.x));
            closestPoint.y = Math.max(glassBox.min.y, Math.min(ball.position.y, glassBox.max.y));
            closestPoint.z = Math.max(glassBox.min.z, Math.min(ball.position.z, glassBox.max.z));
            
            if(closestPoint.y === glassBox.max.y) {
                return false
            }
            // Calculate penetration direction and depth
            const penetrationDir = new THREE.Vector3().subVectors(ball.position, closestPoint).normalize();
            const penetrationDepth = radius - ball.position.distanceTo(closestPoint);
            
            if (penetrationDepth > 0) {
                // Move the ball out of the box along penetration direction with extra buffer
                ball.position.addScaledVector(penetrationDir, penetrationDepth + 0.002);
                
                // Update sphere position
                sphere.center.copy(ball.position);
                
                // Calculate spring force
                const springForce = penetrationDepth * this.wallSpringConstant;
                
                // Calculate damping force based on velocity component into wall
                const velocityAlongNormal = velocity.dot(penetrationDir);
                
                // Get velocity magnitude for adaptive restitution
                const speedAlongNormal = Math.abs(velocityAlongNormal);
                const restitution = this.calculateAdaptiveRestitution(speedAlongNormal);
                
                const dampingForce = Math.max(0, velocityAlongNormal) * this.wallDampingConstant;
                
                // Calculate total force
                const totalForce = springForce + dampingForce;
                
                // Calculate acceleration
                const acceleration = totalForce / (ball.userData.mass || 1);
                
                // Apply impulse along penetration direction with adaptive restitution
                velocity.addScaledVector(penetrationDir, -acceleration * this.dt * restitution);
                
                // Apply friction along tangential components
                this.applyFriction(velocity, penetrationDir, ball.userData.mass || 1);
                
                // Apply additional damping for stability
                velocity.multiplyScalar(0.98);
                
                // Zero out velocity if below threshold
                this.applyVelocityThreshold(velocity);
            }
        }
        
        return hasCollision;
    }
    handleBallEffectorCollision(ball1, eff, effPos, effVel) {
        if (!ball1.userData.boundingSphere || !eff.children[0].geometry.boundingSphere) return;
        
        const sphere1 = ball1.userData.boundingSphere;
        const sphere2 = eff.children[0].geometry.boundingSphere;
        
        // Calculate distance between the centers
        const distance = ball1.position.distanceTo(effPos);
        const combinedRadius = sphere1.radius + sphere2.radius;
        
        // Check for collision (if distance is less than combined radius)
        if (distance < combinedRadius) {
            // If balls are exactly overlapping, separate them slightly
            if (distance < 0.001) {
                // Add small random offset to prevent perfect overlap
                effPos.x += 0.01 + Math.random() * 0.02;
                effPos.z += 0.01 + Math.random() * 0.02;
                return; // Skip this frame and handle next frame after separation
            }
            
            // Calculate penetration depth with a small buffer to prevent jittering
            const penetration = Math.min(combinedRadius - distance, Math.min(sphere1.radius, sphere2.radius)) * 0.5; 
            
            // Calculate normal direction (from eff to ball1)
            const normal = new THREE.Vector3().subVectors(ball1.position, effPos).normalize();
            
            // Check if either ball is immobile
            const isImmobile1 = ball1.userData.isImmobile === true;
            const isImmobile2 = eff.userData.isImmobile === true;
            
            // Separate the balls to prevent overlap based on mobility
            if (isImmobile1 && isImmobile2) {
                // Both are immobile - do nothing or maybe add a small random jitter
                return;
            } else if (isImmobile1) {
                // Ball1 is immobile, so move only eff
                effPos.addScaledVector(normal, -penetration);
            } else if (isImmobile2) {
                // eff is immobile, so move only ball1
                ball1.position.addScaledVector(normal, penetration);
            } else {
                // Both are mobile - use standard physics-based separation
                const totalMass = ball1.userData.mass + eff.userData.mass;
                const ratio1 = eff.userData.mass / totalMass;
                const ratio2 = ball1.userData.mass / totalMass;
                
                // Move balls apart proportional to their masses
                ball1.position.addScaledVector(normal, penetration * ratio1);
                effPos.addScaledVector(normal, -penetration * ratio2);
            }
            
            // Update the spheres to match the new getWorldPosition()s
            sphere1.center.copy(ball1.position);
            sphere2.center.copy(effPos);
            
            // Calculate relative velocity
            const v1 = ball1.userData.velocity;
            const v2 = effVel;
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
                // Only ball1 is immobile - reflect eff's velocity
                const dotProduct = v2.dot(normal);
                v2.addScaledVector(normal, -2 * dotProduct);
                // Apply damping after reflection
                v2.multiplyScalar(0.7); // More damping for collision with immobile object
            } else if (isImmobile2) {
                // Only eff is immobile - reflect ball1's velocity
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
                                     (1/ball1.userData.mass + 1/eff.userData.mass);
                
                // Apply impulse
                const impulse = normal.clone().multiplyScalar(impulseScalar);
                v1.addScaledVector(impulse, 1/ball1.userData.mass);
                v2.addScaledVector(impulse, -1/eff.userData.mass);
                
                // Apply friction after collision
                this.applyFriction(v1, normal, ball1.userData.mass || 1);
                this.applyFriction(v2, normal.clone().negate(), eff.userData.mass || 1);
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
                ball2.position.x += 0.01 + Math.random() * 0.01;
                ball2.position.z += 0.01 + Math.random() * 0.01;
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
                ball2.position.addScaledVector(normal, -(penetration + 0.002)); // Add extra buffer
            } else if (isImmobile2) {
                // Ball2 is immobile, so move only ball1
                ball1.position.addScaledVector(normal, penetration + 0.002); // Add extra buffer
            } else {
                // Both are mobile - use standard physics-based separation
                const totalMass = ball1.userData.mass + ball2.userData.mass;
                const ratio1 = ball2.userData.mass / totalMass;
                const ratio2 = ball1.userData.mass / totalMass;
                
                // Move balls apart proportional to their masses with extra buffer
                ball1.position.addScaledVector(normal, (penetration + 0.002) * ratio1);
                ball2.position.addScaledVector(normal, -(penetration + 0.002) * ratio2);
            }
            
            // Update the spheres to match the new positions
            sphere1.center.copy(ball1.position);
            sphere2.center.copy(ball2.position);
            
            // Calculate relative velocity
            const v1 = ball1.userData.velocity;
            const v2 = ball2.userData.velocity;
            const relativeVelocity = new THREE.Vector3().subVectors(v1, v2);
            
            // Get relative velocity magnitude for adaptive restitution
            const relVelocityMagnitude = relativeVelocity.length();
            
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
                // Use adaptive restitution based on collision speed
                const restitution = this.calculateAdaptiveRestitution(Math.abs(dotProduct));
                v2.addScaledVector(normal, -2 * dotProduct * restitution);
                // Apply damping after reflection
                v2.multiplyScalar(0.7); // More damping for collision with immobile object
                
                // Zero out velocity if below threshold
                this.applyVelocityThreshold(v2);
            } else if (isImmobile2) {
                // Only ball2 is immobile - reflect ball1's velocity
                const dotProduct = v1.dot(normal);
                // Use adaptive restitution based on collision speed
                const restitution = this.calculateAdaptiveRestitution(Math.abs(dotProduct));
                v1.addScaledVector(normal, -2 * dotProduct * restitution);
                // Apply damping after reflection
                v1.multiplyScalar(0.7); // More damping for collision with immobile object
                
                // Zero out velocity if below threshold
                this.applyVelocityThreshold(v1);
            } else {
                // Both are mobile - use conservation of momentum with adaptive restitution
                // Calculate coefficient of restitution (bounciness) based on relative velocity
                const restitution = this.calculateAdaptiveRestitution(relVelocityMagnitude);
                
                // Calculate impulse scalar
                const impulseScalar = -(1 + restitution) * relativeVelocity.dot(normal) / 
                                     (1/ball1.userData.mass + 1/ball2.userData.mass);
                
                // Apply impulse
                const impulse = normal.clone().multiplyScalar(impulseScalar);
                v1.addScaledVector(impulse, 1/ball1.userData.mass);
                v2.addScaledVector(impulse, -1/ball2.userData.mass);
                
                // Apply friction after collision
                this.applyFriction(v1, normal, ball1.userData.mass || 1);
                this.applyFriction(v2, normal.clone().negate(), ball2.userData.mass || 1);
                
                // Zero out velocities if below threshold
                this.applyVelocityThreshold(v1);
                this.applyVelocityThreshold(v2);
            }
            
            // Add a small amount of randomness to prevent balls from getting stuck
            // but only if they're already moving very slowly
            if (Math.abs(v1.y) < 0.15 && Math.abs(v2.y) < 0.15) {
                // If both balls have very low vertical velocity (likely at rest)
                const smallRandom = 0.03; // Reduced randomness
                if (!isImmobile1 && !this.applyVelocityThreshold(v1)) {
                    v1.x += (Math.random() - 0.5) * smallRandom;
                    v1.z += (Math.random() - 0.5) * smallRandom;
                }
                if (!isImmobile2 && !this.applyVelocityThreshold(v2)) {
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

    // Apply friction to velocity along tangential components
    applyFriction(velocity, normal, mass, frictionCoefficient = 0.15) {
        // Get velocity magnitude
        const speed = velocity.length();
        
        // If barely moving, don't bother with friction calculations
        if (speed < 0.01) return;
        
        // Calculate normal component of velocity (dot product)
        const normalComponent = velocity.clone().projectOnVector(normal);
        
        // Calculate tangential component (total - normal)
        const tangentialComponent = velocity.clone().sub(normalComponent);
        const tangentialMagnitude = tangentialComponent.length();
        
        // If no tangential movement, no friction to apply
        if (tangentialMagnitude < 0.001) return;
        
        // Calculate friction force magnitude (limited by available tangential velocity)
        const frictionMagnitude = Math.min(
            frictionCoefficient * normalComponent.length(), 
            tangentialMagnitude
        );
        
        // Apply friction in opposite direction of tangential movement
        if (frictionMagnitude > 0) {
            const frictionDirection = tangentialComponent.clone().normalize();
            velocity.sub(frictionDirection.multiplyScalar(frictionMagnitude));
        }
    }

    // Calculate adaptive restitution based on relative velocity magnitude
    calculateAdaptiveRestitution(relativeVelocityMagnitude) {
        const baseRestitution = 0.7; // Base restitution coefficient
        
        // For very slow movements, significantly reduce restitution
        if (relativeVelocityMagnitude < this.restVelocityThreshold) {
            return 0.1; // Almost no bounce for very slow collisions
        } 
        // For slow movements, linearly reduce restitution
        else if (relativeVelocityMagnitude < this.slowMovingThreshold) {
            // Lerp between 0.1 and baseRestitution based on velocity
            return 0.1 + (baseRestitution - 0.1) * (relativeVelocityMagnitude - this.restVelocityThreshold) / 
                (this.slowMovingThreshold - this.restVelocityThreshold);
        }
        
        // Normal restitution for faster movements
        return baseRestitution;
    }
    
    // Set velocity to zero if below threshold to prevent balls from jittering forever
    applyVelocityThreshold(velocity) {
        const speedSquared = velocity.lengthSq();
        if (speedSquared < this.restVelocityThreshold * this.restVelocityThreshold) {
            velocity.set(0, 0, 0);
            return true; // Returns true if velocity was zeroed
        }
        return false; // Returns false if velocity remained unchanged
    }
}