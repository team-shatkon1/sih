export interface RoleRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  currentRole: string;
  requestedRole: string;
  justification: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export class RoleRequestService {
  private static requests: RoleRequest[] = [];

  static createRequest(req: Omit<RoleRequest, 'id' | 'status' | 'createdAt'>): RoleRequest {
    const newReq: RoleRequest = {
      ...req,
      id: `rolereq-${Date.now()}`,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    this.requests.unshift(newReq);
    return newReq;
  }

  static getRequests(): RoleRequest[] {
    return this.requests;
  }

  static reviewRequest(id: string, approved: boolean, reviewedBy: string): RoleRequest | null {
    const item = this.requests.find(r => r.id === id);
    if (!item) return null;
    item.status = approved ? 'APPROVED' : 'REJECTED';
    item.reviewedAt = new Date().toISOString();
    item.reviewedBy = reviewedBy;
    return item;
  }
}
