import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { SnackService } from '../../shared/services/snack.service';
import { MediaService } from '../../shared/services/media.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { languages } from '../../../app/models/languages';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { VoiceDirective } from '../../../app/shared/directives/voice.directive';
import { SvgIconService } from '../../shared/services/svg-icon.service';

@Component({
  selector: 'app-rename-media',
  imports: [CommonModule, VoiceDirective, FormsModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatInputModule, MatSelectModule],
  templateUrl: './rename-media.component.html',
  styleUrls: ['./rename-media.component.scss']
})
export class RenameMediaComponent implements OnInit, OnDestroy {
  private formBuilder = inject(UntypedFormBuilder);
  private mediaService = inject(MediaService);
  private svgIconService = inject(SvgIconService);
  langData = languages;
  langSelected: number = 0;
  public isUserSpeaking: boolean = false;
  private toastr = inject(SnackService);
  private dialogRef = inject<MatDialogRef<RenameMediaComponent>>(MatDialogRef);
  data = inject(MAT_DIALOG_DATA);
  private destroy$ = new Subject<void>();
  id!: string;
  folderPath!: string;
  form!: UntypedFormGroup;
  submitted = false;
  submitting = false;
  get f(): any { return this.form.controls; }

  ngOnInit() {
    this.form = this.formBuilder.group({
      title: ['', Validators.required],
      toFile: ['', Validators.required]
    });
    this.folderPath = this.data.mediaPath;
    this.form.patchValue(this.data);
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
    let record = {
      fromFolder: this.folderPath,
      recordId: this.data.recordId,
      toFile: this.form.value.toFile
    }

    this.mediaService.RenameMediafile(record)
      .subscribe(
        {
          next: (data: any) => {
            this.toastr.openSnackBar("has been completed successfully", "Rename");
            this.dialogRef.close(true);
          },
          error: (err) => {
            this.toastr.openSnackBar(JSON.stringify(err), "Renaming");
          }
        })
    this.submitting = false;
    this.submitted = false;
  };

  checkMic(): void {
    this.isUserSpeaking = !this.isUserSpeaking;
  }
  onVoiceInput(transcript: string | any) {
    let currentText = this.form.value.toFile ?? '' + ' ' + transcript;
    this.form.patchValue({
      toFile: currentText.trim()
    })
  }
}
