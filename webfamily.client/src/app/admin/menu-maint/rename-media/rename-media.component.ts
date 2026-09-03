import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { SnackService } from '../../../shared/services/snack.service';
import { MenuService } from '../../../shared/services/menu.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { languages } from '../../../models/languages';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Subject } from 'rxjs';
import { VoiceDirective } from '../../../shared/directives/voice.directive';

@Component({
  selector: 'app-rename-media',
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
  templateUrl: './rename-media.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./rename-media.component.scss']
})
export class RenameMediaComponent implements OnInit, OnDestroy {
  private formBuilder = inject(UntypedFormBuilder);
  private menuService = inject(MenuService);
  langData = languages;
  langSelected: number = 0;
  public isUserSpeaking: boolean = false;
  private toastr = inject(SnackService);
  private dialogRef = inject<MatDialogRef<RenameMediaComponent>>(MatDialogRef);
  data = inject(MAT_DIALOG_DATA);
  private destroy$ = new Subject<void>();
  folderPath!: string;
  form!: UntypedFormGroup;
  submitted = false;
  submitting = false;

  get f(): any { return this.form.controls; }

  ngOnInit() {
    // ← removed 'title' from form group — it's read-only display data, not a form control
    this.form = this.formBuilder.group({
      toFile: ['', Validators.required]
    });
    this.folderPath = this.data.mediaPath;
    this.form.patchValue({ toFile: this.data.title });
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
    const record = {
      fromFolder: this.folderPath,
      recordId: this.data.recordId,
      toFile: this.form.value.toFile
    };
    this.menuService.RenameFile(record).subscribe({
      next: (response: any) => {
        this.toastr.openSnackBar(response.message, 'Rename');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.toastr.openSnackBar(JSON.stringify(err.error), 'Renaming');
      }
    });
    this.submitting = false;
    this.submitted = false;
  }

  checkMic(): void {
    this.isUserSpeaking = !this.isUserSpeaking;
  }

  onVoiceInput(transcript: string | any) {
    const currentText = (this.form.value.toFile ?? '') + ' ' + transcript;
    this.form.patchValue({ toFile: currentText.trim() });
  }
}
