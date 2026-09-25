import { AlertRecord, Coordinates } from '../types/orca.js';
import { GeospatialService } from './geospatialService.js';

export class AlertService {
  private static activeAlerts: AlertRecord[] = [
    {
      id: 'alt-wave-sw-01',
      title: 'High Swell & Rough Surf Advisory',
      severity: 'MODERATE',
      category: 'WAVE',
      geographicArea: 'Central-South Konkan Coastal Waters (14.5°N - 16.0°N)',
      coordinates: { latitude: 15.35, longitude: 73.65 },
      radiusKm: 65,
      source: 'INCOIS / Regional Ocean Hazard Bulletin',
      validFrom: new Date(Date.now() - 3 * 3600000).toISOString(),
      validUntil: new Date(Date.now() + 21 * 3600000).toISOString(),
      description: 'Swell waves of 1.8 to 2.4 meters with 14-second periods approaching from the southwest. Small fishing craft advised to avoid breaking shoals.',
      active: true
    },
    {
      id: 'alt-sanctuary-malvan',
      title: 'Marine Protected Sanctuary Geofence',
      severity: 'INFO',
      category: 'SANCTUARY',
      geographicArea: 'Malvan Marine Sanctuary Zone',
      coordinates: { latitude: 16.05, longitude: 73.47 },
      radiusKm: 18,
      source: 'State Coastal Zone Management Authority',
      validFrom: '2024-01-01T00:00:00Z',
      validUntil: '2028-12-31T23:59:59Z',
      description: 'Environmentally sensitive coral and mangrove buffer zone. Commercial trawling and untreated discharge prohibited.',
      active: true
    },
    {
      id: 'alt-current-shelf-02',
      title: 'Rip-Current & Shelf Shear Warning',
      severity: 'MODERATE',
      category: 'CURRENT',
      geographicArea: 'Outer Continental Shelf Edge (50m Bathymetry Contour)',
      coordinates: { latitude: 15.10, longitude: 73.30 },
      radiusKm: 40,
      source: 'Global Ocean Data Assimilation Experiment (GODAE)',
      validFrom: new Date(Date.now() - 6 * 3600000).toISOString(),
      validUntil: new Date(Date.now() + 18 * 3600000).toISOString(),
      description: 'Surface current velocities exceeding 2.2 km/h due to cross-shelf density gradients. Drifting risks for light vessels.',
      active: true
    }
  ];

  /**
   * Retrieves active marine alerts within proximity of the target coordinates
   */
  static getAlertsForLocation(center: Coordinates, radiusKm: number = 150): AlertRecord[] {
    return this.activeAlerts.filter(alert => {
      const dist = GeospatialService.haversineDistance(center, alert.coordinates);
      return dist <= (radiusKm + alert.radiusKm);
    });
  }

  static getAllAlerts(): AlertRecord[] {
    return [...this.activeAlerts];
  }
}
