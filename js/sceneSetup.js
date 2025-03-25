import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function setupScene() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    camera.position.z = 50;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.update();

    // Artery geometry
    const points = [];
    for (let i = 0; i < 50; i++) {
        const x = Math.sin(i * 0.2) * 10;
        const y = i * 2;
        const z = Math.cos(i * 0.2) * 10;
        points.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(points);

    const baseRadius = 2;
    const plaqueStart = 0.4;
    const plaqueEnd = 0.6;
    const stenosisFactor = 0.3;
    let stentApplied = false;
    let stentPosition = null;

    const radiusCallback = (t) => {
        if (t >= plaqueStart && t <= plaqueEnd) {
            const mid = (plaqueStart + plaqueEnd) / 2;
            const dist = Math.abs(t - mid) / ((plaqueEnd - plaqueStart) / 2);
            const base = baseRadius * (stenosisFactor + (1 - stenosisFactor) * Math.cos(dist * Math.PI) ** 2);
            if (stentApplied && stentPosition && t >= stentPosition.tStart && t <= stentPosition.tEnd) {
                return Math.max(base, baseRadius * 0.85);
            }
            return base;
        }
        return baseRadius;
    };

    const arteryMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
    const geometry = new THREE.TubeGeometry(curve, 64, baseRadius, 8, false, radiusCallback);
    const artery = new THREE.Mesh(geometry, arteryMaterial);
    artery.renderOrder = 0;
    artery.userData = { tooltip: "Artery: Carries blood through your body. Plaque can narrow it." };
    scene.add(artery);

    // Blood flow particles
    const bloodParticleCount = 200;
    const bloodGeometry = new THREE.BufferGeometry();
    const bloodPositions = new Float32Array(bloodParticleCount * 3);
    const velocities = new Float32Array(bloodParticleCount);
    const baseVelocities = new Float32Array(bloodParticleCount);
    const colors = new Float32Array(bloodParticleCount * 3);
    const curveParams = new Float32Array(bloodParticleCount);

    for (let i = 0; i < bloodParticleCount; i++) {
        const t = i / bloodParticleCount;
        const pos = curve.getPointAt(t);
        bloodPositions[i * 3] = pos.x;
        bloodPositions[i * 3 + 1] = pos.y;
        bloodPositions[i * 3 + 2] = pos.z;
        const v = Math.random() * 0.05 + 0.02;
        velocities[i] = v;
        baseVelocities[i] = v;
        curveParams[i] = t;
        colors[i * 3] = 0.5;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
    }
    bloodGeometry.setAttribute('position', new THREE.BufferAttribute(bloodPositions, 3));
    bloodGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const bloodMaterial = new THREE.PointsMaterial({ size: 0.5, vertexColors: true });
    const bloodParticles = new THREE.Points(bloodGeometry, bloodMaterial);
    bloodParticles.renderOrder = 1;
    bloodParticles.userData = { tooltip: "Blood: Carries oxygen; slows with plaque." };
    scene.add(bloodParticles);

    // Lighting
    scene.add(new THREE.AmbientLight(0x606060, 1.5));
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight1.position.set(5, 10, 7.5);
    scene.add(directionalLight1);
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight2.position.set(-5, -10, -7.5);
    scene.add(directionalLight2);

    return { 
        scene, 
        camera, 
        renderer, 
        controls, 
        artery, 
        curve, 
        bloodParticles, 
        bloodParticleCount, 
        curveParams, 
        baseVelocities, 
        bloodPositions, 
        velocities, 
        setStentApplied: (value) => stentApplied = value, 
        setStentPosition: (pos) => stentPosition = pos, 
        radiusCallback
    };
}
