import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MemberView } from '../shared/models/admin/memberView';
import { MemberAddEdit } from '../shared/models/admin/memberAddEdit';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);


  getMembers() {
    return this.http.get<MemberView[]>("/api/admin/get-members");
  }

  getMember(id: string) {
    return this.http.get<MemberAddEdit>(`/api/admin/get-member/${id}`);
  }

  getApplicationRoles() {
    return this.http.get<string[]>(`/api/admin/get-application-roles`);
  }

  addEditMember(model: MemberAddEdit) {
    return this.http.post(`/api/admin/add-edit-member`, model);
  }

  lockMember(id: string) {
    return this.http.put(`/api/admin/lock-member/${id}`, {});
  }

  unlockMember(id: string) {
    return this.http.put(`/api/admin/unlock-member/${id}`, {});
  }

  deleteMember(id: string) {
    return this.http.delete(`/api/admin/delete-member/${id}`, {});
  }
}
