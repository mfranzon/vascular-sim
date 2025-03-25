import * as THREE from 'three';
import { setupScene } from './sceneSetup.js';
import { initStentControls } from './stentControls.js';
import { initUIControls } from './uiControls.js';
import { animate } from './animation.js';

// Main initialization
const { scene, camera, renderer, controls, artery, curve, bloodParticles, bloodParticleCount, curveParams, baseVelocities, bloodPositions, velocities, setStentApplied, setStentPosition, radiusCallback } = setupScene();
const { placeStent, confirmStent, removeStent, getStent } = initStentControls(scene, camera, renderer, controls, artery, curve, radiusCallback); // Added radiusCallback
const uiControls = initUIControls(placeStent, confirmStent, removeStent, artery, bloodParticles, curve, setStentApplied, setStentPosition, camera, radiusCallback, getStent);

animate(scene, camera, renderer, controls, bloodParticles, curve, 
    uiControls.getPlaqueParticleCount, 
    uiControls.getStentApplied, 
    uiControls.getStentPosition, 
    bloodParticleCount, curveParams, baseVelocities, bloodPositions, 
    uiControls.getCurrentResistance, velocities);

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
