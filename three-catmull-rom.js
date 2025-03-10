import * as THREE from 'three';
import { vec3, toThreeVec3 } from './three-math.js';

/**
 * Calculate Catmull-Rom tangents for a set of points
 * @param {Array<THREE.Vector3>} points - Array of 3D points
 * @param {number} alpha - Tension parameter (0.5 for centripetal Catmull-Rom)
 * @returns {Array<THREE.Vector3>} Array of tangent vectors
 */
export function catmullRomTangents(points, alpha = 0.5) {
  const n = points.length;
  const tangents = [];

  for (let i = 0; i < n; i++) {
    const iPrev = (i - 1 + n) % n;
    const iNext = (i + 1) % n;

    // Using Three.js Vector3 operations
    const diff = new THREE.Vector3().subVectors(points[iNext], points[iPrev]);
    const tangent = diff.multiplyScalar(alpha);

    tangents.push(tangent);
  }

  return tangents;
}

/**
 * Create a path object from a set of points using Catmull-Rom interpolation
 * @param {Array<THREE.Vector3>} points - Array of points
 * @param {boolean} closed - Whether the path is closed (loops back to start)
 * @param {number} alpha - Tension parameter (0 to 1, 0.5 for centripetal)
 * @returns {Object} A path object with points, curves, and helper methods
 */
export function createCatmullRomPath(points, closed = false, alpha = 0.5) {
  if (points.length < 2) {
    throw new Error('At least 2 points are required for a Catmull-Rom path');
  }

  // Calculate tangents for Catmull-Rom
  const tangents = catmullRomTangents(points, alpha);
  
  // Create a Three.js CatmullRomCurve3 for visualization and sampling
  const curve = new THREE.CatmullRomCurve3(
    points,
    closed,
    'catmullrom',
    alpha
  );
  
  // Create a visible line for the path
  const linePoints = curve.getPoints(50 * points.length);
  const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
  const material = new THREE.LineBasicMaterial({ color: 0xff00ff });
  const line = new THREE.Line(geometry, material);
  
  // Return a path object with useful methods
  return {
    points,
    curve,
    line,
    closed,
    alpha,
    
    // Get a point at parameter t (0 to 1)
    getPoint: function(t) {
      return this.curve.getPoint(t);
    },
    
    // Get a tangent at parameter t
    getTangent: function(t) {
      return this.curve.getTangent(t);
    },
    
    // Get a normal vector at parameter t
    getNormal: function(t, up = new THREE.Vector3(0, 1, 0)) {
      const tangent = this.getTangent(t);
      const binormal = new THREE.Vector3().crossVectors(up, tangent).normalize();
      return new THREE.Vector3().crossVectors(tangent, binormal).normalize();
    },
    
    // Get a frame at parameter t
    getFrame: function(t, up = new THREE.Vector3(0, 1, 0)) {
      const position = this.getPoint(t);
      const tangent = this.getTangent(t);
      const binormal = new THREE.Vector3().crossVectors(up, tangent).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, binormal).normalize();
      
      return {
        position,
        tangent,
        normal,
        binormal
      };
    }
  };
}

/**
 * A standalone path built with Catmull-Rom splines
 * No dependency on HermitePath to avoid circular references
 */
export class CatmullRomPath {
  constructor(points = [], closed = false, alpha = 0.5) {
    this.points = points;
    this.closed = closed;
    this.alpha = alpha;
    this.currentParameter = 0;
    
    // THREE.js native implementation of Catmull-Rom
    this.curve = null;
    this.line = null;
    this.pathGroup = new THREE.Group();
    
    // Create the curve if enough points are provided
    if (points.length >= 2) {
      this.createCurve();
    }
  }
  
  createCurve() {
    // Use THREE.js built-in Catmull-Rom curve
    this.curve = new THREE.CatmullRomCurve3(
      this.points,
      this.closed,
      'catmullrom',
      this.alpha
    );
    
    // Create a visible line
    this.createLine();
    
    return this.curve;
  }
  
  createLine() {
    // Clean up any existing line
    if (this.line) {
      this.pathGroup.remove(this.line);
      this.line.geometry.dispose();
    }
    
    // Create a new line
    const points = this.curve.getPoints(50 * this.points.length);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff00ff });
    this.line = new THREE.Line(geometry, material);
    
    // Add to the path group
    this.pathGroup.add(this.line);
    
    return this.line;
  }
  
  setPoints(points, closed = this.closed, alpha = this.alpha) {
    this.points = points;
    this.closed = closed;
    this.alpha = alpha;
    
    // Reset current parameter
    this.currentParameter = 0;
    
    // Re-create the curve with new points
    if (points.length >= 2) {
      this.createCurve();
    }
    
    return this;
  }
  
  addPoint(point) {
    this.points.push(point);
    
    // Re-create curve if we have enough points
    if (this.points.length >= 2) {
      this.createCurve();
    }
    
    return this;
  }
  
  // Get a point at parameter t (0 to 1)
  getPoint(t) {
    if (!this.curve) return new THREE.Vector3();
    return this.curve.getPoint(Math.max(0, Math.min(1, t)));
  }
  
  // Get the current point
  getCurrentPoint() {
    return this.getPoint(this.currentParameter);
  }
  
  // Get tangent at parameter t
  getTangent(t) {
    if (!this.curve) return new THREE.Vector3(0, 0, 1);
    return this.curve.getTangent(Math.max(0, Math.min(1, t)));
  }
  
  // Get current tangent
  getCurrentTangent() {
    return this.getTangent(this.currentParameter);
  }
  
  // Get a frame at parameter t
  getFrame(t, up = new THREE.Vector3(0, 1, 0)) {
    const position = this.getPoint(t);
    const tangent = this.getTangent(t);
    const binormal = new THREE.Vector3().crossVectors(up, tangent).normalize();
    const normal = new THREE.Vector3().crossVectors(tangent, binormal).normalize();
    
    return {
      position,
      tangent,
      normal,
      binormal
    };
  }
  
  // Get current frame
  getCurrentFrame(up = new THREE.Vector3(0, 1, 0)) {
    return this.getFrame(this.currentParameter, up);
  }
  
  // Advance along the path
  advance(step) {
    this.currentParameter += step;
    
    // Loop back if we reach the end
    if (this.currentParameter > 1) {
      if (this.closed) {
        this.currentParameter = this.currentParameter % 1;
        return true;
      } else {
        this.currentParameter = 1;
        return false;
      }
    }
    
    return true;
  }
}

// Export utility functions
export const CatmullRomUtils = {
  // Get a Hermite curve from a segment of a Catmull-Rom spline
  getHermiteFromCatmullRom(p0, p1, p2, p3, tension = 0.5) {
    // Catmull-Rom to Hermite conversion
    const v1 = new THREE.Vector3()
      .subVectors(p2, p0)
      .multiplyScalar(tension);
        
    const v2 = new THREE.Vector3()
      .subVectors(p3, p1)
      .multiplyScalar(tension);
        
    return { p1, p2, v1, v2 };
  }
};