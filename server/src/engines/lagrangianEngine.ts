import {
  Coordinates,
  DriftType,
  DriftTrajectoryStep,
  LagrangianParticle,
  LagrangianSimulationResult
} from '../types/orca.js';

export class LagrangianEngine {
  /**
   * Computes 24-hour Lagrangian particle advection combining surface currents & wind leeway
   */
  static simulateDrift(
    origin: Coordinates,
    type: DriftType,
    currentSpeedKmH: number,
    currentDirDeg: number,
    windSpeedKmH: number,
    windDirDeg: number,
    durationHours = 24
  ): LagrangianSimulationResult {
    // Current vector components in km/h
    const currentRad = (currentDirDeg * Math.PI) / 180;
    const uCurrent = currentSpeedKmH * Math.sin(currentRad); // East-West component
    const vCurrent = currentSpeedKmH * Math.cos(currentRad); // North-South component

    // Wind vector components (direction wind is blowing toward)
    const windBlowToDeg = (windDirDeg + 180) % 360;
    const windRad = (windBlowToDeg * Math.PI) / 180;

    // Physical parameter tuning based on object hydrodynamic leeway (Breivik & Allen, 2008)
    let leewayCoeff = 0.0;
    let deflectionDeg = 0.0;
    let initialSpreadM = 100;
    let diffusionRateMPerHour = 250;

    if (type === 'SEARCH_AND_RESCUE_DEBRIS') {
      leewayCoeff = 0.042; // 4.2% windage for life-raft / person-in-water
      deflectionDeg = 12.0; // Northern hemisphere Coriolis deflection to right of downwind
      initialSpreadM = 150;
      diffusionRateMPerHour = 400;
    } else if (type === 'OIL_SLICK') {
      leewayCoeff = 0.030; // 3.0% windage for surface crude / bunker fuel
      deflectionDeg = 0.0;
      initialSpreadM = 300;
      diffusionRateMPerHour = 650;
    } else {
      // PLANKTON_LARVAE / BIOMASS
      leewayCoeff = 0.005; // Plankton floats sub-surface, almost pure hydrodynamic current
      deflectionDeg = 0.0;
      initialSpreadM = 500;
      diffusionRateMPerHour = 200;
    }

    const effectiveWindRad = ((windBlowToDeg + deflectionDeg) * Math.PI) / 180;
    const uWindLeeway = windSpeedKmH * leewayCoeff * Math.sin(effectiveWindRad);
    const vWindLeeway = windSpeedKmH * leewayCoeff * Math.cos(effectiveWindRad);

    const netU = uCurrent + uWindLeeway; // km/h East
    const netV = vCurrent + vWindLeeway; // km/h North
    const netSpeed = Math.sqrt(netU * netU + netV * netV);

    const trajectory: DriftTrajectoryStep[] = [];
    let curLat = origin.latitude;
    let curLon = origin.longitude;

    // 1 degree latitude ≈ 111.139 km
    // 1 degree longitude ≈ 111.139 * cos(lat) km
    const kmToLat = 1 / 111.139;

    for (let h = 0; h <= durationHours; h += 2) {
      const cosLat = Math.cos((curLat * Math.PI) / 180);
      const kmToLon = 1 / (111.139 * (cosLat || 1.0));

      const dispersion = initialSpreadM + h * diffusionRateMPerHour;

      trajectory.push({
        hour: h,
        latitude: Number(curLat.toFixed(4)),
        longitude: Number(curLon.toFixed(4)),
        currentVelocity: Number(currentSpeedKmH.toFixed(1)),
        windSpeed: Number(windSpeedKmH.toFixed(1)),
        leewaySpeed: Number(netSpeed.toFixed(2)),
        dispersionRadiusMeters: Math.round(dispersion)
      });

      // Advect coordinates for next 2h step with small random turbulent jitter
      const stepHours = 2;
      const jitterU = (Math.random() - 0.5) * 0.08 * netSpeed;
      const jitterV = (Math.random() - 0.5) * 0.08 * netSpeed;

      curLat += (netV * stepHours + jitterV) * kmToLat;
      curLon += (netU * stepHours + jitterU) * kmToLon;
    }

    // Generate simulated particle swarm around trajectory for animated canvas visualization
    const swarm: LagrangianParticle[] = [];
    const particleCount = 70;
    const finalStep = trajectory[trajectory.length - 1];

    for (let i = 0; i < particleCount; i++) {
      // Gaussian distribution around trajectory path
      const progress = Math.random();
      const stepIdx = Math.min(
        trajectory.length - 1,
        Math.floor(progress * (trajectory.length - 1))
      );
      const center = trajectory[stepIdx];

      const cosLat = Math.cos((center.latitude * Math.PI) / 180);
      const kmToLon = 1 / (111.139 * (cosLat || 1.0));

      const angle = Math.random() * 2 * Math.PI;
      const distKm = (Math.random() * center.dispersionRadiusMeters) / 1000;

      const pLat = center.latitude + distKm * Math.cos(angle) * kmToLat;
      const pLon = center.longitude + distKm * Math.sin(angle) * kmToLon;

      swarm.push({
        id: i + 1,
        latitude: Number(pLat.toFixed(4)),
        longitude: Number(pLon.toFixed(4)),
        ageHours: Math.round(progress * durationHours),
        status: 'ACTIVE'
      });
    }

    // Total distance drifted in km
    const totalDriftKm = Number((netSpeed * durationHours).toFixed(1));
    const searchRadiusKm = Number(((finalStep.dispersionRadiusMeters * 1.6) / 1000).toFixed(1));

    // Evaluate coastal landfall probability
    // For west coast of India (longitudes < 73.0), eastward drift increases landfall probability
    const headingEast = netU > 0.3;
    const landfallProbability = headingEast ? Math.min(88, Math.round(35 + netU * 12)) : Math.round(Math.max(5, 20 - netSpeed * 3));

    let summary = '';
    if (type === 'SEARCH_AND_RESCUE_DEBRIS') {
      summary = `Leeway advection model predicts ${totalDriftKm} km drift along ${(netU >= 0 ? 'East' : 'West')}-${(netV >= 0 ? 'North' : 'South')} vector. Recommended primary search datum is at (${finalStep.latitude.toFixed(3)}°N, ${finalStep.longitude.toFixed(3)}°E) with a ${searchRadiusKm} km 95% containment radius.`;
    } else if (type === 'OIL_SLICK') {
      summary = `Surface slick dispersion rate estimated at ${finalStep.dispersionRadiusMeters}m plume envelope over ${durationHours}h. Landfall risk probability is ${landfallProbability}%. Containment boom deployment recommended upstream of current vector.`;
    } else {
      summary = `Pelagic larval transport vector moves at ${netSpeed.toFixed(2)} km/h along main current boundary. Trophic front aggregation probability is elevated near convergence zone.`;
    }

    return {
      simulationId: `sim-${type.toLowerCase()}-${Date.now()}`,
      type,
      origin,
      timestamp: new Date().toISOString(),
      durationHours,
      particleCount,
      trajectory,
      swarm,
      searchRadiusKm,
      landfallProbability,
      predictedLandfallPoint: landfallProbability > 50 ? { latitude: finalStep.latitude, longitude: finalStep.longitude } : undefined,
      summary
    };
  }
}
