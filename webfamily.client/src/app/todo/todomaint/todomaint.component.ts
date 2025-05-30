import { ChangeDetectionStrategy, Component, LOCALE_ID, OnInit, inject, signal } from '@angular/core';
import { AbstractControlOptions, FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { SnackService } from '../../shared/services/snack.service';
import { TodoService } from '../services/todo.service';
import { CommonModule, formatDate } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { languages } from '../../../app/models/languages';
import { Subject } from 'rxjs';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { VoiceDirective } from '../../shared/directives/voice.directive';
import { SvgIconService } from "../../shared/services/svg-icon.service"

@Component({
  selector: 'app-todo-maint',
  providers: [provideNativeDateAdapter()],
  imports: [CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatSelectModule,
    MatDialogModule,
    MatInputModule,
    MatDatepickerModule,
    MatTimepickerModule,
    MatNativeDateModule,
    VoiceDirective,
    MatFormFieldModule
  ],
  templateUrl: './todomaint.component.html',
  styleUrls: ['./todomaint.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoMaintComponent implements OnInit {
  public isNoteUserSpeaking: boolean = false;
  public isAssignedUserSpeaking: boolean = false;
  svgIconService = inject(SvgIconService);
  private formBuilder = inject(UntypedFormBuilder);
  private todoService = inject(TodoService);
  private snackService = inject(SnackService);
  private dialogRef = inject<MatDialogRef<TodoMaintComponent>>(MatDialogRef);
  data = inject(MAT_DIALOG_DATA);
  locale = inject(LOCALE_ID);
  langData = languages;
  langSelected: number = 0;
  fldform!: UntypedFormGroup;
  submitted = false;
  dateValue = new Date();
  private destroy$ = new Subject<void>();
  searchVal = signal('');
  ngOnInit() {
    this.fldform = this.formBuilder.group({
      dueDate: ['', Validators.required],
      note: ['', Validators.required],
      displayTime: [],
      assigned: ['', Validators.required]
    } as AbstractControlOptions
    );
    if (this.data) {
      this.data.displayTime = this.data.dueDate;
    }
    this.fldform.patchValue(this.data);
  }

  // convenience getter for easy access to form fields
  get f(): any { return this.fldform.controls; }

  onSubmit() {
    this.submitted = true;

    if (this.fldform.valid) {
      if (this.data) {
        this.updateTodo();
      } else {
        this.createTodo();
      }
    }
  }

  private createTodo() {
    this.fldform.patchValue({
      dueDate: this.setDateTime()
    })
    this.todoService.addTodo(this.fldform.value)
      .pipe(first())
      .subscribe({
        next: () => {
          this.snackService.openSnackBar('TodoList added successfully', 'Add New');
          this.dialogRef.close(true);
        },
        error: (error: any) => {
          this.snackService.openSnackBar(JSON.stringify(error), 'Error');
        }
      });
  }
  private setDateTime(): string {
    let valDate = this.fldform.get('dueDate')!.value;
    let valTime = this.fldform.get('displayTime')!.value;
    let displayDueDate = new Date(valDate).toLocaleDateString();
    let displayTime = new Date(valTime).toLocaleTimeString();
    let val = new Date(displayDueDate + ' ' + displayTime);
    return formatDate(val, 'yyyy-MM-dd HH:mm:ss', this.locale);
  }
  private updateTodo() {
    this.data.note = this.fldform.get('note')!.value;
    this.data.assigned = this.fldform.get('assigned')!.value;
    this.data.dueDate = this.setDateTime();
    this.todoService.updateTodo(this.data)
      .pipe(first())
      .subscribe({
        next: () => {
          this.snackService.openSnackBar('TodoList Updated successful', 'Update');
          this.dialogRef.close(true);
        },
        error: (error: any) => {
          this.snackService.openSnackBar(JSON.stringify(error), 'Error');
        }
      });
  }
  
  checkMic(field: string): void {

    switch (field) {
      case 'assigned':
        this.isAssignedUserSpeaking = !this.isAssignedUserSpeaking;
        this.isNoteUserSpeaking = false;
        break;
      case 'note':
        this.isNoteUserSpeaking = !this.isNoteUserSpeaking;
        this.isAssignedUserSpeaking = false;
        break;
    }
  }
  onVoiceInput(transcript: string | any) {
    if (this.isAssignedUserSpeaking) {
      let currentText = this.fldform.get('assigned')?.value + ' ' + transcript; 
      this.fldform.get('assigned')?.setValue(currentText.trim());

    } else {
      if (this.isNoteUserSpeaking) {
        let currentText = this.fldform.get('note')?.value + ' ' + transcript; 
        this.fldform.get('note')?.setValue(currentText.trim());

      }
    }
  }
}
