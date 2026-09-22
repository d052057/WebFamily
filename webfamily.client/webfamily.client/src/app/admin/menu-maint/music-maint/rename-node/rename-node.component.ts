import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { SnackService } from '../../../../shared/services/snack.service';
import { MusicMaintenanceService } from '../../../../shared/services/music-maintenance.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { languages } from '../../../../models/languages';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Subject } from 'rxjs';
import { VoiceDirective } from '../../../../shared/directives/voice.directive';

export type RenameNodeKind = 'folder' | 'track';

export interface RenameNodeDialogData {
  id: string;
  currentName: string; // for a track this is the fileName (with extension); for a folder, the plain name
  kind: RenameNodeKind;
}

// Same shape/behaviour as the legacy rename-media popup (read-only "from"
// name, editable "to" name, mic + dictation-language picker) generalized to
// also rename a folder (artist/album) - which has no file extension to split
// off - instead of only a track's file name.
@Component({
  selector: 'app-rename-node',
  standalone: true,
  imports: [
    VoiceDirective,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './rename-node.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./rename-node.component.scss']
})
export class RenameNodeComponent implements OnInit, OnDestroy {
  private formBuilder = inject(UntypedFormBuilder);
  private musicMaintenanceService = inject(MusicMaintenanceService);
  langData = languages;
  langSelected: number = 0;
  public isUserSpeaking: boolean = false;
  private toastr = inject(SnackService);
  private dialogRef = inject<MatDialogRef<RenameNodeComponent>>(MatDialogRef);
  data: RenameNodeDialogData = inject(MAT_DIALOG_DATA);
  private destroy$ = new Subject<void>();
  form!: UntypedFormGroup;
  submitted = false;
  submitting = false;

  get f(): any { return this.form.controls; }

  get isFolder(): boolean {
    return this.data.kind === 'folder';
  }

  ngOnInit() {
    this.form = this.formBuilder.group({
      toName: ['', Validators.required]
    });
    const initialValue = this.isFolder
      ? this.data.currentName
      : this.getFilenameWithoutExtension(this.data.currentName);
    this.form.patchValue({ toName: initialValue });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      return;
    }
    this.submitting = true;

    const newName = this.form.value.toName;
    const request$ = this.isFolder
      ? this.musicMaintenanceService.renameFolder(this.data.id, newName)
      : this.musicMaintenanceService.renameTrack(this.data.id, newName);

    request$.subscribe({
      next: (response: any) => {
        this.toastr.openSnackBar(response.message, 'Rename');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.toastr.openSnackBar(JSON.stringify(err.error), 'Renaming');
        this.submitting = false;
        this.submitted = false;
      }
    });
  }

  getFilenameWithoutExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex === -1 ? filename : filename.substring(0, lastDotIndex);
  }

  checkMic(): void {
    this.isUserSpeaking = !this.isUserSpeaking;
  }

  onVoiceInput(transcript: string | any) {
    const currentText = (this.form.value.toName ?? '') + ' ' + transcript;
    this.form.patchValue({ toName: currentText.trim() });
  }
}
