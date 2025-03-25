export function animate(scene, camera, renderer, controls, bloodParticles, curve, getPlaqueParticleCount, getStentApplied, getStentPosition, bloodParticleCount, curveParams, baseVelocities, bloodPositions, getCurrentResistance, velocities) {
    function animationLoop(timestamp) {
        requestAnimationFrame(animationLoop);

        const plaqueParticleCount = getPlaqueParticleCount();
        const stentApplied = getStentApplied();
        const stentPosition = getStentPosition();
        const currentResistance = getCurrentResistance();
        const plaqueStart = 0.4;
        const plaqueEnd = 0.6;
        const isPlaqueSolved = stentApplied && stentPosition && 
            (stentPosition.tEnd - stentPosition.tStart >= 0.1) && // Minimum overlap
            (stentPosition.tStart <= plaqueEnd) && 
            (stentPosition.tEnd >= plaqueStart);
        const plaqueDensityFactor = plaqueParticleCount === 0 || isPlaqueSolved ? 1 : Math.max(1 - (plaqueParticleCount / 1000) * 1.05, 0.05);

        const positions = bloodParticles.geometry.attributes.position.array;
        const colors = bloodParticles.geometry.attributes.color.array;

        for (let i = 0; i < bloodParticleCount; i++) {
            let t = curveParams[i];
            let velocity = baseVelocities[i];

            if (t >= plaqueStart && t <= plaqueEnd && plaqueParticleCount > 0 && !isPlaqueSolved) {
                if (currentResistance >= 9.5) velocity = 0;
                else velocity *= plaqueDensityFactor * 0.5;
            }

            if (velocity > 0) {
                t += velocity * 0.016;
                if (t > 1) t -= 1;
                const pos = curve.getPointAt(t);
                positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.5;
                positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.5;
                positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.5;
                curveParams[i] = t;
                velocities[i] = velocity;
            }

            const speedFactor = Math.min(velocity * 20, 1);
            if (t >= plaqueStart && t <= plaqueEnd && plaqueParticleCount > 0 && !isPlaqueSolved) {
                colors[i * 3] = 0.3;
                colors[i * 3 + 1] = 0.3;
                colors[i * 3 + 2] = 0.5 + speedFactor * 0.3;
            } else {
                colors[i * 3] = 0.5 + speedFactor * 0.5;
                colors[i * 3 + 1] = 0;
                colors[i * 3 + 2] = speedFactor * 0.2;
            }
        }

        bloodParticles.geometry.attributes.position.needsUpdate = true;
        bloodParticles.geometry.attributes.color.needsUpdate = true;

        controls.update();
        renderer.render(scene, camera);
    }
    requestAnimationFrame(animationLoop);
}
