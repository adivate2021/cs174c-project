// three-math.js - Math utilities for Three.js version
// This provides helper functions for converting between TinyGraphics and Three.js math conventions
import * as THREE from 'three';

// Create a vec3 helper function that returns a THREE.Vector3
export function vec3(x, y, z) {
    return new THREE.Vector3(x, y, z);
}

// Create a utility for converting from TinyGraphics vec3 to THREE.Vector3
export function toThreeVec3(tinyVec) {
    if (tinyVec instanceof THREE.Vector3) {
        return tinyVec;
    }
    return new THREE.Vector3(tinyVec[0], tinyVec[1], tinyVec[2]);
}

// Helper for adding vectors
export function add(v1, v2) {
    const result = toThreeVec3(v1).clone();
    return result.add(toThreeVec3(v2));
}

// Helper for subtracting vectors
export function subtract(v1, v2) {
    const result = toThreeVec3(v1).clone();
    return result.sub(toThreeVec3(v2));
}

// Helper for scaling vectors
export function scale(v, s) {
    const result = toThreeVec3(v).clone();
    return result.multiplyScalar(s);
}

// Helper for calculating vector length
export function length(v) {
    return toThreeVec3(v).length();
}

// Helper for normalizing vectors
export function normalize(v) {
    const result = toThreeVec3(v).clone();
    return result.normalize();
}

// Helper for dot product
export function dot(v1, v2) {
    return toThreeVec3(v1).dot(toThreeVec3(v2));
}

// Helper for cross product
export function cross(v1, v2) {
    return toThreeVec3(v1).cross(toThreeVec3(v2));
}

// Create a helper for colors that returns a THREE.Color
export function color(r, g, b, a = 1.0) {
    return new THREE.Color(r, g, b);
}

// Export all utilities
export const math = {
    vec3,
    toThreeVec3,
    add,
    subtract,
    scale,
    length,
    normalize,
    dot,
    cross,
    color
}; 