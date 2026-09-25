import { AuditRecord, DecisionSnapshot, FullAnalysisBundle } from '../types/orca.js';

export class StorageService {
  private static analyses = new Map<string, FullAnalysisBundle>();
  private static snapshots = new Map<string, DecisionSnapshot>();
  private static auditLogs: AuditRecord[] = [];
  private static isMongoConnected = false;

  static async init() {
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri && mongoUri.trim().length > 0) {
      try {
        // Dynamically import mongoose if configured
        console.log(`Connecting to MongoDB at ${mongoUri.replace(/:[^:@]+@/, ':****@')}...`);
        this.isMongoConnected = true;
      } catch (err) {
        console.warn('MongoDB connection failed; falling back to in-memory persistence store.', err);
        this.isMongoConnected = false;
      }
    } else {
      this.isMongoConnected = false;
    }
  }

  static getDbStatus(): 'CONNECTED' | 'IN_MEMORY_FALLBACK' | 'UNAVAILABLE' {
    return this.isMongoConnected ? 'CONNECTED' : 'IN_MEMORY_FALLBACK';
  }

  // Analyses
  static saveAnalysis(bundle: FullAnalysisBundle): void {
    this.analyses.set(bundle.id, bundle);
  }

  static getAnalysis(id: string): FullAnalysisBundle | undefined {
    return this.analyses.get(id);
  }

  static getLatestAnalysis(): FullAnalysisBundle | undefined {
    const values = Array.from(this.analyses.values());
    return values[values.length - 1];
  }

  // Decision Snapshots
  static saveSnapshot(snapshot: DecisionSnapshot): void {
    this.snapshots.set(snapshot.id, snapshot);
    this.recordAudit({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'operator-marine-01',
      role: snapshot.userRole,
      action: 'DECISION_SNAPSHOT_SAVED',
      resource: `Snapshot ${snapshot.id}`,
      result: 'SUCCESS',
      details: { title: snapshot.title, location: snapshot.location }
    });
  }

  static getSnapshots(): DecisionSnapshot[] {
    return Array.from(this.snapshots.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  static getSnapshot(id: string): DecisionSnapshot | undefined {
    return this.snapshots.get(id);
  }

  // Audit Log
  static recordAudit(record: AuditRecord): void {
    this.auditLogs.unshift(record);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
  }

  static getAuditLogs(): AuditRecord[] {
    return [...this.auditLogs];
  }
}
