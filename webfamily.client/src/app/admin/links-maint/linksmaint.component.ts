import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { AbstractControlOptions, FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { SnackService } from '../../shared/services/snack.service';
import { LinksService, linksErrorText } from './links.service';

import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { languages } from '../../../app/models/languages';
import { MatFormFieldModule } from '@angular/material/form-field';
import { VoiceDirective } from '../../shared/directives/voice.directive';

// Duplicate of the Todo add/edit dialog, reduced to the two fields a link
// has: Title (dictation supported, like Todo's Note/Assigned) and URL.
// Dictation is offered on Title only - a spoken URL isn't practical.
@Component({
  selector: 'app-links-maint',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatSelectModule,
    MatDialogModule,
    MatInputModule,
    VoiceDirective,
    MatFormFieldModule],
  templateUrl: './linksmaint.component.html',
  styleUrls: ['./linksmaint.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinksMaintComponent implements OnInit {
  public isTitleUserSpeaking: boolean = false;
  private formBuilder = inject(UntypedFormBuilder);
  private linksService = inject(LinksService);
  private snackService = inject(SnackService);
  private dialogRef = inject<MatDialogRef<LinksMaintComponent>>(MatDialogRef);
  // null when adding, { id, title, param } when editing
  data = inject(MAT_DIALOG_DATA);
  langData = languages;
  langSelected: number = 0;
  fldform!: UntypedFormGroup;
  submitted = false;
  saving = false;

  ngOnInit() {
    this.fldform = this.formBuilder.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      // Mirrors the server's rule (LinksController.Validate): a full
      // http(s) address, no spaces.
      param: ['', [Validators.required, Validators.maxLength(2000), Validators.pattern(/^https?:\/\/\S+$/i)]]
    } as AbstractControlOptions);
    if (this.data) {
      this.fldform.patchValue({ title: this.data.title, param: this.data.param });
    }
  }

  // convenience getter for easy access to form fields
  get f(): any { return this.fldform.controls; }

  onSubmit() {
    this.submitted = true;

    if (this.fldform.invalid || this.saving) {
      return;
    }

    const title = (this.fldform.get('title')!.value as string).trim();
    const param = (this.fldform.get('param')!.value as string).trim();
    this.saving = true;

    const request$ = this.data
      ? this.linksService.updateLink({ id: this.data.id, title, param })
      : this.linksService.addLink({ title, param });

    request$.pipe(first()).subscribe({
      next: () => {
        this.snackService.openSnackBar(this.data ? 'Link updated' : 'Link added', this.data ? 'Update' : 'Add New');
        this.dialogRef.close(true);
      },
      error: (error: any) => {
        this.saving = false;
        this.snackService.openSnackBar(linksErrorText(error), 'Error');
      }
    });
  }

  checkMic(): void {
    this.isTitleUserSpeaking = !this.isTitleUserSpeaking;
  }
  onVoiceInput(transcript: string | any) {
    if (this.isTitleUserSpeaking) {
      const currentText = (this.fldform.get('title')?.value ?? '') + ' ' + transcript;
      this.fldform.get('title')?.setValue(currentText.trim());
    }
  }
}
