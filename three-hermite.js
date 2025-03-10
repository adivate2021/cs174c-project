// three-hermite.js - Hermite curve implementation for Three.js
import * as THREE from 'three';
import { vec3, toThreeVec3 } from './three-math.js';
import { CatmullRomPath, catmullRomTangents } from './three-catmull-rom.js';

export class HermiteCurve {
    constructor() {
        this.p1 = new THREE.Vector3(0, 0, 0);    // First point
        this.p2 = new THREE.Vector3(0, 0, 0);    // Second point
        this.v1 = new THREE.Vector3(0, 0, 0);    // First velocity
        this.v2 = new THREE.Vector3(0, 0, 0);    // Second velocity
        this.segments = 100;                     // Number of segments to draw the curve
        this.color = 0xff00ff;                   // Default curve color
        this.lineWidth = 3;                      // Line width for visualization
        this.line = null;                        // Line object for visualization
        
        // Create a default curve material
        this.material = new THREE.LineBasicMaterial({
            color: this.color,
            linewidth: this.lineWidth
        });
    }
    
    setControlPoints(p1, p2, v1, v2) {
        this.p1.copy(toThreeVec3(p1));
        this.p2.copy(toThreeVec3(p2));
        this.v1.copy(toThreeVec3(v1));
        this.v2.copy(toThreeVec3(v2));
        this.createCurveLine();
    }
    
    createCurveLine() {
        // Generate points along the curve
        const points = [];
        for (let i = 0; i <= this.segments; i++) {
            const t = i / this.segments;
            points.push(this.getPoint(t));
        }
        
        // Create geometry from points
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Create or update the line
        if (this.line) {
            this.line.geometry.dispose();
            this.line.geometry = geometry;
        } else {
            this.line = new THREE.Line(geometry, this.material);
        }
        
        return this.line;
    }
    
    updateCurve() {
        if (!this.line) {
            this.createCurveLine();
            return;
        }
        
        // Get the existing points array
        const points = [];
        for (let i = 0; i <= this.segments; i++) {
            const t = i / this.segments;
            points.push(this.getPoint(t));
        }
        
        // Update geometry
        this.line.geometry.dispose();
        this.line.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }
    
    // Hermite curve formula: p(t) = h00(t)*p1 + h10(t)*v1 + h01(t)*p2 + h11(t)*v2
    getPoint(t) {
        // Hermite basis functions
        const t2 = t * t;
        const t3 = t2 * t;
        
        const h00 = 2*t3 - 3*t2 + 1;    // 2t^3 - 3t^2 + 1
        const h10 = t3 - 2*t2 + t;       // t^3 - 2t^2 + t
        const h01 = -2*t3 + 3*t2;        // -2t^3 + 3t^2
        const h11 = t3 - t2;             // t^3 - t^2
        
        // Calculate point using Hermite formula
        const point = new THREE.Vector3();
        point.addScaledVector(this.p1, h00);
        point.addScaledVector(this.v1, h10);
        point.addScaledVector(this.p2, h01);
        point.addScaledVector(this.v2, h11);
        
        return point;
    }
    
    // Get tangent at parameter t
    getTangent(t) {
        // Derivative of Hermite basis functions
        const t2 = t * t;
        
        const dh00 = 6*t2 - 6*t;       // 6t^2 - 6t
        const dh10 = 3*t2 - 4*t + 1;    // 3t^2 - 4t + 1
        const dh01 = -6*t2 + 6*t;       // -6t^2 + 6t
        const dh11 = 3*t2 - 2*t;        // 3t^2 - 2t
        
        // Calculate tangent using derivatives
        const tangent = new THREE.Vector3();
        tangent.addScaledVector(this.p1, dh00);
        tangent.addScaledVector(this.v1, dh10);
        tangent.addScaledVector(this.p2, dh01);
        tangent.addScaledVector(this.v2, dh11);
        
        return tangent.normalize();
    }
    
    // Get normal at parameter t
    getNormal(t, upVector = new THREE.Vector3(0, 1, 0)) {
        const tangent = this.getTangent(t);
        const binormal = new THREE.Vector3().crossVectors(upVector, tangent).normalize();
        return new THREE.Vector3().crossVectors(tangent, binormal).normalize();
    }
    
    // Get binormal at parameter t
    getBinormal(t, upVector = new THREE.Vector3(0, 1, 0)) {
        const tangent = this.getTangent(t);
        return new THREE.Vector3().crossVectors(upVector, tangent).normalize();
    }
    
    // Get full frame at parameter t
    getFrame(t, upVector = new THREE.Vector3(0, 1, 0)) {
        const tangent = this.getTangent(t);
        const binormal = new THREE.Vector3().crossVectors(upVector, tangent).normalize();
        const normal = new THREE.Vector3().crossVectors(tangent, binormal).normalize();
        
        return {
            position: this.getPoint(t),
            tangent: tangent,
            normal: normal,
            binormal: binormal
        };
    }
}

// Create a collection of hermite curves to form a path
export class HermitePath {
    constructor() {
        this.curves = [];
        this.currentCurveIndex = 0;
        this.currentParameter = 0;
        this.totalLength = 0;
        this.segmentLengths = [];
        
        // Group to hold all curve lines
        this.pathGroup = new THREE.Group();
    }
    
    // Add a curve to the path
    addCurve(p1, p2, v1, v2) {
        const curve = new HermiteCurve();
        curve.setControlPoints(p1, p2, v1, v2);
        this.curves.push(curve);
        this.pathGroup.add(curve.line);
        
        // Calculate approximate curve length
        this.calculateSegmentLength(this.curves.length - 1);
        
        return curve;
    }
    
    // Calculate approximate length of a curve segment
    calculateSegmentLength(index) {
        if (index < 0 || index >= this.curves.length) return 0;
        
        const curve = this.curves[index];
        let length = 0;
        let prevPoint = curve.getPoint(0);
        
        const steps = 100;
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const point = curve.getPoint(t);
            length += point.distanceTo(prevPoint);
            prevPoint = point;
        }
        
        // Store segment length
        this.segmentLengths[index] = length;
        
        // Update total path length
        this.totalLength = this.segmentLengths.reduce((a, b) => a + b, 0);
        
        return length;
    }
    
    // Get point at parameter t along the entire path (t from 0 to 1)
    getPoint(t) {
        if (this.curves.length === 0) {
            return new THREE.Vector3();
        }
        
        // Clamp t to [0, 1]
        t = Math.max(0, Math.min(1, t));
        
        // If only one curve, use it directly
        if (this.curves.length === 1) {
            return this.curves[0].getPoint(t);
        }
        
        // Find which curve segment corresponds to t
        let segmentStartT = 0;
        let segmentEndT = 0;
        let curveIndex = 0;
        
        for (let i = 0; i < this.segmentLengths.length; i++) {
            segmentEndT = segmentStartT + (this.segmentLengths[i] / this.totalLength);
            
            if (t <= segmentEndT || i === this.segmentLengths.length - 1) {
                curveIndex = i;
                break;
            }
            
            segmentStartT = segmentEndT;
        }
        
        // Calculate local t for the selected curve
        const localT = (t - segmentStartT) / (segmentEndT - segmentStartT);
        
        // Get point on the selected curve
        return this.curves[curveIndex].getPoint(localT);
    }
    
    // Get the current point on the path
    getCurrentPoint() {
        if (this.curves.length === 0) return new THREE.Vector3();
        return this.curves[this.currentCurveIndex].getPoint(this.currentParameter);
    }
    
    // Get the current frame on the path
    getCurrentFrame() {
        if (this.curves.length === 0) return null;
        return this.curves[this.currentCurveIndex].getFrame(this.currentParameter);
    }
    
    // Advance along the path by a step amount (0 to 1)
    advance(step) {
        if (this.curves.length === 0) return false;
        
        this.currentParameter += step;
        
        // If we've reached the end of the current curve, move to the next
        if (this.currentParameter > 1) {
            this.currentCurveIndex++;
            this.currentParameter = this.currentParameter - 1;
            
            // Loop back to the beginning if we've reached the end of the path
            if (this.currentCurveIndex >= this.curves.length) {
                this.currentCurveIndex = 0;
                return false; // Signal that we've completed the path
            }
        }
        
        return true; // We're still on the path
    }
} 