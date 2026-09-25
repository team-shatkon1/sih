import { Coordinates } from '../types/orca.js';

export type ReportCategory = 'MARINE_CONDITION' | 'STRONG_CURRENT' | 'HAZARD' | 'WILDLIFE' | 'WEATHER' | 'COASTAL';
export type ReportSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type ReportStatus = 'UNVERIFIED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
export type ReportVisibility = 'PUBLIC' | 'COMMUNITY' | 'PRIVATE';

export interface RegionReport {
  id: string;
  location: Coordinates;
  category: ReportCategory;
  title: string;
  description: string;
  severity: ReportSeverity;
  status: ReportStatus;
  authorId: string;
  authorName: string;
  authorRole: string;
  visibility: ReportVisibility;
  mediaUrl?: string;
  createdAt: string;
  updatedAt: string;
  confirmations: {
    yes: number;
    no: number;
  };
}

// In-memory reports store seeded with initial genuine community reports
const initialReports: RegionReport[] = [
  {
    id: 'rep-001',
    location: {
      latitude: 15.342,
      longitude: 73.785,
      name: 'Aguada Bay, Goa'
    },
    category: 'STRONG_CURRENT',
    title: 'Rip current near Aguada headland',
    description: 'Strong localized surface current observed during outgoing tide. Small crafts should keep 200m distance from rocks.',
    severity: 'MODERATE',
    status: 'VERIFIED',
    authorId: 'user-fisherman-42',
    authorName: 'Coastal Patrol V-08',
    authorRole: 'AUTHORITIES',
    visibility: 'PUBLIC',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    confirmations: { yes: 7, no: 0 }
  },
  {
    id: 'rep-002',
    location: {
      latitude: 15.228,
      longitude: 73.882,
      name: 'Mormugao Approach, Goa'
    },
    category: 'HAZARD',
    title: 'Submerged mooring cable marker missing',
    description: 'Temporary navigational marker dislodged during swell. Marked buoy unlighted at night.',
    severity: 'HIGH',
    status: 'VERIFIED',
    authorId: 'user-pilot-12',
    authorName: 'Port Operations Pilot',
    authorRole: 'AUTHORITIES',
    visibility: 'PUBLIC',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    confirmations: { yes: 12, no: 1 }
  },
  {
    id: 'rep-003',
    location: {
      latitude: 15.480,
      longitude: 73.720,
      name: 'Calangute Shoals'
    },
    category: 'WILDLIFE',
    title: 'Dolphin pod feeding in inshore waters',
    description: 'Pod of ~8 Indian Ocean humpback dolphins sighted feeding 600m off coastline. Trawler traffic advised to slow down.',
    severity: 'LOW',
    status: 'UNVERIFIED',
    authorId: 'user-guide-99',
    authorName: 'Eco-Tour Observer',
    authorRole: 'RESEARCHER',
    visibility: 'PUBLIC',
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    confirmations: { yes: 3, no: 0 }
  }
];

export class ReportService {
  private static reports: RegionReport[] = [...initialReports];

  static getAllReports(timeframeHours?: number, status?: ReportStatus): RegionReport[] {
    let list = [...this.reports];
    if (status) {
      list = list.filter(r => r.status === status);
    }
    if (timeframeHours) {
      const cutoff = Date.now() - timeframeHours * 3600000;
      list = list.filter(r => new Date(r.createdAt).getTime() >= cutoff);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static getReportById(id: string): RegionReport | undefined {
    return this.reports.find(r => r.id === id);
  }

  static createReport(report: Omit<RegionReport, 'id' | 'createdAt' | 'updatedAt' | 'confirmations' | 'status'>): RegionReport {
    const newReport: RegionReport = {
      ...report,
      id: `rep-${Date.now()}`,
      status: report.authorRole === 'AUTHORITIES' ? 'VERIFIED' : 'UNVERIFIED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmations: { yes: 1, no: 0 }
    };
    this.reports.unshift(newReport);
    return newReport;
  }

  static confirmReport(id: string, isAccurate: boolean): RegionReport | null {
    const report = this.reports.find(r => r.id === id);
    if (!report) return null;

    if (isAccurate) {
      report.confirmations.yes += 1;
      // Auto-promote to VERIFIED if >= 5 yes confirmations
      if (report.status === 'UNVERIFIED' && report.confirmations.yes >= 5) {
        report.status = 'VERIFIED';
      }
    } else {
      report.confirmations.no += 1;
      if (report.confirmations.no >= 4 && report.confirmations.no > report.confirmations.yes) {
        report.status = 'UNDER_REVIEW';
      }
    }
    report.updatedAt = new Date().toISOString();
    return report;
  }

  static updateStatus(id: string, newStatus: ReportStatus): RegionReport | null {
    const report = this.reports.find(r => r.id === id);
    if (!report) return null;
    report.status = newStatus;
    report.updatedAt = new Date().toISOString();
    return report;
  }
}
