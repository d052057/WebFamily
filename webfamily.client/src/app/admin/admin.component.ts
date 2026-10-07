import { Component, OnInit, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { AdminService } from './admin.service';
import { SharedService } from '../shared/shared.service';
import { MemberView } from '../shared/models/admin/memberView';
import { MatDialog } from '@angular/material/dialog';
import { setTheme } from 'ngx-bootstrap/utils';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { TitleCasePipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-admin',
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, TitleCasePipe, DatePipe]
})
export class AdminComponent implements OnInit {
  private adminService = inject(AdminService);
  private sharedService = inject(SharedService);
  private _dialog = inject(MatDialog);

  members = signal<MemberView[]>([]);

  ngOnInit(): void {
    this.adminService.getMembers().subscribe({
      next: members => this.members.set(members)
    });
  }
  constructor() {
    setTheme('bs5'); // or 'bs4'
  }
  lockMember(id: string) {
    this.adminService.lockMember(id).subscribe({
      next: _ => {
        this.handleLockUnlockFilterAndMessage(id, true);
      }
    })
  }

  unlockMember(id: string) {
    this.adminService.unlockMember(id).subscribe({
      next: _ => {
        this.handleLockUnlockFilterAndMessage(id, false);
      }
    })
  }

  deleteMember(id: string) {
    const member = this.findMember(id);
    if (!member) return;

    this.confirmDelete(
      'Delete member',
      `Are you sure you want to delete ${member.userName}?`,
      () => this.adminService.deleteMember(member.id).subscribe({
        next: _ => {
          this.sharedService.showNotification(true, 'Deleted', `Member of ${member.userName} has been deleted!`);
          this.members.update(list => list.filter(x => x.id !== member.id));
        }
      })
    );
  }

  // Material confirmation dialog (same one Todo, Links, Duplicates and music-maint use).
  // Runs onConfirmed only when the user presses Delete.
  private confirmDelete(title: string, message: string, onConfirmed: () => void): void {
    this._dialog
      .open(ConfirmDialogComponent, {
        data: { title, message, confirmLabel: 'Delete', destructive: true }
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (confirmed) onConfirmed();
      });
  }

  private handleLockUnlockFilterAndMessage(id: string, locking: boolean) {
    let member = this.findMember(id);

    if (member) {
      this.members.update(list =>
        list.map(m => m.id === id ? { ...m, isLocked: !m.isLocked } : m)
      );

      if (locking) { 
        this.sharedService.showNotification(true, 'Locked', `${member.userName} member has been locked`);
      } else {
        this.sharedService.showNotification(true, 'Unlocked', `${member.userName} member has been unlocked`);
      }
    }
  }

  private findMember(id: string): MemberView | undefined {
    let member = this.members().find(x => x.id === id);
    if (member) {
      return member;
    }

    return undefined;
  }
}
