import * as THREE from 'three';

export function initUIControls(placeStent, confirmStent, removeStent, artery, bloodParticles, curve, setStentApplied, setStentPosition, camera, radiusCallback, getStent) {
    const slider = document.getElementById('plaqueSlider');
    const percentageDisplay = document.getElementById('percentage');
    const flowRateDisplay = document.getElementById('flowRate');
    const resistanceDisplay = document.getElementById('resistanceValue');
    const explanationDisplay = document.getElementById('explanation');
    const viscosity = 0.035;
    const segmentLength = 20;
    const conversionFactor = 0.075;
    const maxResistance = 10;
    let plaqueParticleCount = 0;
    let currentResistance = 0;
    let stentApplied = false;
    let stentPosition = null;
    let originalPlaqueCount = 0;

    let plaqueParticles;

    function updatePlaque(count, stentRange = null) {
        if (plaqueParticles) artery.parent.remove(plaqueParticles);
        if (count === 0) return;
        const plaqueGeometry = new THREE.BufferGeometry();
        const plaquePositions = new Float32Array(count * 3);
        let placedCount = 0;
        for (let i = 0; i < count; i++) {
            const t = 0.4 + (0.6 - 0.4) * Math.random();
            if (stentRange && t >= stentRange.tStart && t <= stentRange.tEnd) continue;
            const pos = curve.getPointAt(t);
            const radius = radiusCallback(t);
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * radius * 0.9,
                (Math.random() - 0.5) * radius * 0.9,
                (Math.random() - 0.5) * radius * 0.9
            );
            plaquePositions[placedCount * 3] = pos.x + offset.x;
            plaquePositions[placedCount * 3 + 1] = pos.y + offset.y;
            plaquePositions[placedCount * 3 + 2] = pos.z + offset.z;
            placedCount++;
        }
        const trimmedPositions = plaquePositions.slice(0, placedCount * 3);
        plaqueGeometry.setAttribute('position', new THREE.BufferAttribute(trimmedPositions, 3));
        const plaqueMaterial = new THREE.PointsMaterial({ color: 0x8B8B00, size: 0.25 });
        plaqueParticles = new THREE.Points(plaqueGeometry, plaqueMaterial);
        plaqueParticles.renderOrder = 1;
        plaqueParticles.userData = { tooltip: "Plaque: Fatty buildup that blocks blood flow." };
        artery.parent.add(plaqueParticles);
        return placedCount;
    }

    function updateMetrics(percentage) {
        const plaqueDensityFactor = percentage === 0 || stentApplied ? 1 : Math.max(1 - (percentage / 100) * 1.05, 0.05);
        const samplePoints = 10;
        let plaqueRadiusSum = 0;
        for (let i = 0; i < samplePoints; i++) {
            const t = 0.4 + (0.6 - 0.4) * (i / (samplePoints - 1));
            let radius = radiusCallback(t) * (stentApplied && stentPosition && t >= stentPosition.tStart && t <= stentPosition.tEnd ? 1 : plaqueDensityFactor);
            radius = Math.max(radius, stentApplied ? 2 * 0.85 : 0.26);
            plaqueRadiusSum += radius;
        }
        const avgPlaqueRadius = plaqueRadiusSum / samplePoints;
        const area = Math.PI * avgPlaqueRadius * avgPlaqueRadius;
        const rFourth = Math.pow(avgPlaqueRadius, 4);
        currentResistance = Math.min((8 * viscosity * segmentLength) / (Math.PI * rFourth) * conversionFactor, maxResistance);
        const avgVelocity = (percentage === 0 || stentApplied) ? 0.035 : Math.min(0.035 * plaqueDensityFactor * 0.5, 0.035);
        const flowRate = avgVelocity * area / 1000;

        flowRateDisplay.textContent = flowRate.toFixed(2);
        resistanceDisplay.textContent = currentResistance.toFixed(2);
        explanationDisplay.textContent = !stentApplied
            ? percentage === 0 ? "Healthy artery: Blood flows freely."
            : percentage < 50 ? "Mild plaque: Flow slows slightly."
            : percentage < 80 ? "Moderate plaque: Flow is reduced, resistance rises."
            : "Severe plaque: Flow nearly stops in the blockage."
            : "Stent applied: Flow improves" + (stentPosition && stentPosition.tStart <= 0.6 && stentPosition.tEnd >= 0.4 ? ", plaque cleared in stented area." : ".");
    }

    slider.addEventListener('input', () => {
        const percentage = parseInt(slider.value);
        percentageDisplay.textContent = `${percentage}%`;
        plaqueParticleCount = Math.round((percentage / 100) * 1000);
        originalPlaqueCount = plaqueParticleCount;
        updatePlaque(plaqueParticleCount, stentApplied ? stentPosition : null);
        updateMetrics(percentage);
    });

    document.getElementById('healthyBtn').addEventListener('click', () => setPlaque(0));
    document.getElementById('mildBtn').addEventListener('click', () => setPlaque(30));
    document.getElementById('severeBtn').addEventListener('click', () => setPlaque(80));
    document.getElementById('resetBtn').addEventListener('click', () => setPlaque(0));
    document.getElementById('stentBtn').addEventListener('click', placeStent);

    const uiControls = {
        getPlaqueParticleCount: () => plaqueParticleCount,
        getCurrentResistance: () => currentResistance,
        getStentApplied: () => stentApplied,
        getStentPosition: () => stentPosition
    };

    document.getElementById('confirmStentBtn').addEventListener('click', () => {
        confirmStent(setStentApplied, setStentPosition);
        stentApplied = true;
        stentPosition = uiControls.getStentPosition();
        const currentPercentage = parseInt(slider.value);
        const stentObj = getStent();

        // Check if stent is inside artery mesh using raycasting
        let isInsideArtery = false;
        if (stentObj) {
            const raycaster = new THREE.Raycaster();
            const stentCenter = stentObj.position.clone();
            const directions = [
                new THREE.Vector3(1, 0, 0),  // +X
                new THREE.Vector3(-1, 0, 0), // -X
                new THREE.Vector3(0, 1, 0),  // +Y
                new THREE.Vector3(0, -1, 0), // -Y
                new THREE.Vector3(0, 0, 1),  // +Z
                new THREE.Vector3(0, 0, -1) // -Z
            ];
            let hitCount = 0;

            // Cast rays in all 6 directions to determine if inside
            for (const direction of directions) {
                raycaster.set(stentCenter, direction);
                const intersects = raycaster.intersectObject(artery, true);
                if (intersects.length > 0) hitCount++;
            }

            // If rays hit in all directions (or a majority), stent is likely inside
            isInsideArtery = hitCount >= 4; // Adjust threshold if needed
        }

        if (isInsideArtery) {
            plaqueParticleCount = updatePlaque(originalPlaqueCount, stentPosition);
            const newPercentage = Math.round((plaqueParticleCount / originalPlaqueCount) * currentPercentage);
            slider.value = newPercentage;
            percentageDisplay.textContent = `${newPercentage}%`;
            updateMetrics(newPercentage);
        } else {
            updateMetrics(currentPercentage);
        }
        slider.disabled = true;
    });

    document.getElementById('removeStentBtn').addEventListener('click', () => {
        removeStent(setStentApplied, setStentPosition);
        stentApplied = false;
        stentPosition = null;
        plaqueParticleCount = originalPlaqueCount;
        updatePlaque(plaqueParticleCount);
        const percentage = parseInt(slider.value);
        updateMetrics(percentage);
        slider.disabled = false;
    });

    function setPlaque(value) {
        if (stentApplied) return;
        slider.value = value;
        const event = new Event('input');
        slider.dispatchEvent(event);
    }

    // Tooltip and highlight
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const tooltip = document.getElementById('tooltip');
    let lastHovered = null;

    window.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const stentObj = typeof getStent === 'function' ? getStent() : null;
        const objectsToCheck = [artery, bloodParticles];
        if (plaqueParticles) objectsToCheck.push(plaqueParticles);
        if (stentObj) objectsToCheck.push(stentObj);
        const intersects = raycaster.intersectObjects(objectsToCheck.filter(obj => obj && !obj.geometry.disposed));
        if (intersects.length > 0) {
            const obj = intersects[0].object;
            if (lastHovered !== obj) {
                if (lastHovered && lastHovered.material) lastHovered.material.emissive?.set(0x000000);
                if (obj.material && obj.material.emissive) obj.material.emissive.set(0x333333);
                lastHovered = obj;
            }
            tooltip.textContent = obj.userData.tooltip;
            tooltip.style.left = `${event.clientX + 15}px`;
            tooltip.style.top = `${event.clientY + 15}px`;
            tooltip.style.display = 'block';
        } else {
            if (lastHovered && lastHovered.material) {
                lastHovered.material.emissive?.set(0x000000);
                lastHovered = null;
            }
            tooltip.style.display = 'none';
        }
    });

    // Help popup
    const helpBtn = document.getElementById('helpBtn');
    const helpPopup = document.getElementById('helpPopup');
    helpBtn.addEventListener('click', () => {
        helpPopup.style.display = helpPopup.style.display === 'block' ? 'none' : 'block';
    });

    return uiControls;
}
