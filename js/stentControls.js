import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export function initStentControls(scene, camera, renderer, orbitControls, artery, curve, radiusCallback) {
    let stent, transformControls;
    const baseRadius = 2;

    function placeStent() {
        if (stent) return;
        const stentGeometry = new THREE.CylinderGeometry(baseRadius * 0.85, baseRadius * 0.85, 5, 32, 1, true);
        const stentMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, wireframe: true, transparent: false, opacity: 1 });
        stent = new THREE.Mesh(stentGeometry, stentMaterial);
        stent.position.copy(curve.getPointAt(0.5));
        stent.rotation.x = Math.PI / 2;
        stent.renderOrder = 2;
        stent.userData = { tooltip: "Stent: A mesh tube that opens the artery." };
        scene.add(stent);

        transformControls = new TransformControls(camera, renderer.domElement);
        transformControls.attach(stent);
        transformControls.setMode('translate');
        scene.add(transformControls);

        orbitControls.enabled = true;
        transformControls.addEventListener('dragging-changed', (event) => {
            orbitControls.enabled = !event.value;
        });

        document.getElementById('stentBtn').style.display = 'none';
        document.getElementById('confirmStentBtn').style.display = 'inline';
        document.getElementById('rotateStentBtn').style.display = 'inline';
        document.getElementById('translateStentBtn').style.display = 'inline';
    }

    function confirmStent(setStentApplied, setStentPosition) {
        if (!stent) return;
        setStentApplied(true);
        const tMid = curve.getUtoTmapping(0, stent.position.distanceTo(curve.getPointAt(0)) / curve.getLength());
        const stentLengthT = 5 / curve.getLength();
        setStentPosition({ 
            tStart: Math.max(tMid - stentLengthT / 2, 0.4), 
            tEnd: Math.min(tMid + stentLengthT / 2, 0.6) 
        });
        scene.remove(transformControls);
        transformControls.dispose();
        transformControls = null;
        orbitControls.enabled = true;
        artery.geometry.dispose();
        artery.geometry = new THREE.TubeGeometry(curve, 64, baseRadius, 8, false, radiusCallback); // Use passed radiusCallback
        document.getElementById('confirmStentBtn').style.display = 'none';
        document.getElementById('removeStentBtn').style.display = 'inline';
        document.getElementById('rotateStentBtn').style.display = 'none';
        document.getElementById('translateStentBtn').style.display = 'none';
    }

    function removeStent(setStentApplied, setStentPosition) {
        if (!stent) return;
        scene.remove(stent);
        stent.geometry.dispose();
        stent = null;
        setStentApplied(false);
        setStentPosition(null);
        artery.geometry.dispose();
        artery.geometry = new THREE.TubeGeometry(curve, 64, baseRadius, 8, false, radiusCallback); // Use passed radiusCallback
        document.getElementById('stentBtn').style.display = 'inline';
        document.getElementById('removeStentBtn').style.display = 'none';
        document.getElementById('rotateStentBtn').style.display = 'none';
        document.getElementById('translateStentBtn').style.display = 'none';
        orbitControls.enabled = true;
    }

    document.getElementById('rotateStentBtn').addEventListener('click', () => {
        if (transformControls) {
            transformControls.setMode('rotate');
            transformControls.setSpace('local');
            transformControls.axis = 'Y';
        }
    });

    document.getElementById('translateStentBtn').addEventListener('click', () => {
        if (transformControls) {
            transformControls.setMode('translate');
            transformControls.axis = null;
        }
    });

    return { 
        placeStent, 
        confirmStent, 
        removeStent,
        getStent: () => stent
    };
}
