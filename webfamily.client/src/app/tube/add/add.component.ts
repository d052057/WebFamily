import { Component, OnInit, computed, inject } from '@angular/core';
import { AbstractControlOptions, FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import urlParser from "js-video-url-parser";
import { finalize, map } from 'rxjs/operators';
import { SnackService } from '../../shared/services/snack.service';
import { TubeService } from './../services/tube.service';
import { Webtube } from './../models/webtubes.model';
import { CommonModule } from '@angular/common';
import { AddSeriesComponent } from './../add-series/add-series.component';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { Subscription } from 'rxjs';
import { languages } from '../../../app/models/languages';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { VoiceDirective } from '../../../app/shared/directives/voice.directive';
import { SvgIconService } from '../../shared/services/svg-icon.service';

@Component({
  selector: 'app-add',
  imports: [CommonModule, VoiceDirective, MatIconModule, MatSelectModule, FormsModule, ReactiveFormsModule, AddSeriesComponent, MatDialogModule, MatInputModule],
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss']
})
export class AddComponent implements OnInit {
  private formBuilder = inject(UntypedFormBuilder);
  public webtubesService = inject(TubeService);
  private snackService = inject(SnackService);
  tubedata = inject<Webtube>(MAT_DIALOG_DATA);
  private dialogRef = inject<MatDialogRef<AddComponent>>(MatDialogRef);
  private svgIconService = inject(SvgIconService);
  voiceSubscription!: Subscription;
  langData = languages;
  langSelected: number = 0;
  langSearch: string = this.langData[this.langSelected].search;

  fldform!: UntypedFormGroup;
  submitted: boolean = false;

  isReadOnly: boolean = false;
  isNoteUserSpeaking: boolean = false;
  isTitleUserSpeaking: boolean = false;
  ngOnInit() {

    this.fldform = this.formBuilder.group({
      webTubeLink: ['', Validators.required],
      videoId: ['', Validators.required],
      videoListId: new FormControl(),
      note: new FormControl(),
      webTubeTitle: ['', Validators.required],
      thumbnailDefaultUrl: new FormControl(),
      thumbnailMediumUrl: new FormControl(),
      thumbnailHighUrl: new FormControl(),
      thumbnailStandardUrl: new FormControl(),
      thumbnailMaxresUrl: new FormControl(),

      thumbnailDefaultWidth: new FormControl(),
      thumbnailMediumWidth: new FormControl(),
      thumbnailHighWidth: new FormControl(),
      thumbnailStandardWidth: new FormControl(),
      thumbnailMaxresWidth: new FormControl(),

      thumbnailDefaultHeight: new FormControl(),
      thumbnailMediumHeight: new FormControl(),
      thumbnailHighHeight: new FormControl(),
      thumbnailStandardHeight: new FormControl(),
      thumbnailMaxresHeight: new FormControl(),
      webTubeSeries: []
    } as AbstractControlOptions);
    this.isReadOnly = false;
    if (this.tubedata) {
      this.isReadOnly = true;
      this.fldform.patchValue(this.tubedata);
    }
  }

  // convenience getter for easy access to form fields
  get f(): any { return this.fldform.controls; }

  onSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.fldform.valid) {
      if (this.tubedata) {
        this.updateWebTube();
      } else {
        this.createWebTube();
      }
    }
  }

  private createWebTube() {

    var webtubeRecord: any = {
      recordId: '',
      webTubeLink: this.fldform.value.webTubeLink,
      videoId: this.fldform.value.videoId,
      videoListId: this.fldform.value.videoListId,
      note: this.fldform.value.note,
      webTubeTitle: this.fldform.value.webTubeTitle,
      category: this.fldform.value.category,
      thumbnailDefaultUrl: this.fldform.value.thumbnailDefaultUrl,
      thumbnailMediumUrl: this.fldform.value.thumbnailMediumUrl,
      thumbnailHighUrl: this.fldform.value.thumbnailHighUrl,
      thumbnailStandardUrl: this.fldform.value.thumbnailStandardUrl,
      thumbnailMaxresUrl: this.fldform.value.thumbnailMaxresUrl,

      thumbnailDefaultWidth: this.fldform.value.thumbnailDefaultWidth,
      thumbnailMediumWidth: this.fldform.value.thumbnailMediumWidth,
      thumbnailHighWidth: this.fldform.value.thumbnailHighWidth,
      thumbnailStandardWidth: this.fldform.value.thumbnailStandardWidth,
      thumbnailMaxresWidth: this.fldform.value.thumbnailMaxresWidth,

      thumbnailDefaultHeight: this.fldform.value.thumbnailDefaultHeight,
      thumbnailMediumHeight: this.fldform.value.thumbnailMediumHeight,
      thumbnailHighHeight: this.fldform.value.thumbnailHighHeight,
      thumbnailStandardHeight: this.fldform.value.thumbnailStandardHeight,
      thumbnailMaxresHeight: this.fldform.value.thumbnailMaxresHeight,

      webTubeSeries: []
    }
    if (this.fldform.value.webTubeSeries) {
      webtubeRecord.webTubeSeries = this.fldform.value.webTubeSeries;
    }
  
    this.webtubesService.createWebtube(webtubeRecord)
      .pipe(finalize(() => {
        this.f.reset();
      }))
      .subscribe({
        next: () => {
          this.snackService.openSnackBar('New Webtube created successfully', 'Update');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.snackService.openSnackBar(JSON.stringify(err), 'Error');
        }
      });
  }

  private updateWebTube() {

    var data: any = {
      recordId: this.tubedata.recordId,
      webTubeLink: this.fldform.value.webTubeLink,
      videoId: this.fldform.value.videoId,
      videoListId: this.fldform.value.videoListId,
      note: this.fldform.value.note,
      webTubeTitle: this.fldform.value.webTubeTitle,
      dateTime: this.tubedata.dateTime,
      category: this.tubedata.category,
      webTubeSeries: [],
      thumbnailDefaultUrl: this.fldform.value.thumbnailDefaultUrl,
      thumbnailMediumUrl: this.fldform.value.thumbnailMediumUrl,
      thumbnailHighUrl: this.fldform.value.thumbnailHighUrl,
      thumbnailStandardUrl: this.fldform.value.thumbnailStandardUrl,
      thumbnailMaxresUrl: this.fldform.value.thumbnailMaxresUrl,

      thumbnailDefaultWidth: this.fldform.value.thumbnailDefaultWidth,
      thumbnailMediumWidth: this.fldform.value.thumbnailMediumWidth,
      thumbnailHighWidth: this.fldform.value.thumbnailHighWidth,
      thumbnailStandardWidth: this.fldform.value.thumbnailStandardWidth,
      thumbnailMaxresWidth: this.fldform.value.thumbnailMaxresWidth,

      thumbnailDefaultHeight: this.fldform.value.thumbnailDefaultHeight,
      thumbnailMediumHeight: this.fldform.value.thumbnailMediumHeight,
      thumbnailHighHeight: this.fldform.value.thumbnailHighHeight,
      thumbnailStandardHeight: this.fldform.value.thumbnailStandardHeight,
      thumbnailMaxresHeight: this.fldform.value.thumbnailMaxresHeight

    }

    this.webtubesService.updateWebtube(data)
      .pipe(
        finalize(() => {
          this.f.reset();
        }))

      .subscribe({
        next: () => {
          this.snackService.openSnackBar('Webtube Update successful', 'Update');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.snackService.openSnackBar(JSON.stringify(err), 'Error Update');
        }
      });
  }
  // query video list from youtube
  parseVideoLink(): void {
    this.f.webTubeSeries.setValue('');
    let parsedURL: any = urlParser.parse(this.fldform.value.webTubeLink);

    if (parsedURL.id) {
      this.f.videoId.setValue(parsedURL.id);
      this.f.videoListId.setValue('');
      this.getThumbnail(parsedURL.id);
      if (parsedURL.list) {
        this.webtubesService.videoListId.set(parsedURL.list);
        this.f.videoListId.setValue(parsedURL.list);
      }
      
      this.isReadOnly = true;
    } else {
      this.f.videoId.setValue('');
      this.f.videoListId.setValue('');
      this.f.webTubeSeries.setValue('');
      this.f.thumbnailDefaultUrl.setValue('');
      this.f.thumbnailMediumUrl.setValue('');
      this.f.thumbnailHighUrl.setValue('');
      this.f.thumbnailStandardUrl.setValue('');
      this.f.thumbnailMaxresUrl.setValue('');

      this.f.thumbnailDefaultWidth.setValue('');
      this.f.thumbnailMediumWidth.setValue('');
      this.f.thumbnailHighWidth.setValue('');
      this.f.thumbnailStandardWidth.setValue('');
      this.f.thumbnailMaxresWidth.setValue('');

      this.f.thumbnailDefaultHeight.setValue('');
      this.f.thumbnailMediumHeight.setValue('');
      this.f.thumbnailHighHeight.setValue('');
      this.f.thumbnailStandardHeight.setValue('');
      this.f.thumbnailMaxresHeight.setValue('');
    }
  }
  getThumbnail(id: string): void {
    this.webtubesService.getYoutubeVideoById(id)
      .pipe(
        map((data: any) => {
          let val = data.items[0].snippet;
          this.f.note.setValue(val.description);
          this.f.webTubeTitle.setValue(val.title);

          let t = data.items[0].snippet.thumbnails;
          this.f.thumbnailDefaultUrl.setValue(t.default.url);
          this.f.thumbnailMediumUrl.setValue(t.medium.url);
          this.f.thumbnailHighUrl.setValue(t.high.url);
          this.f.thumbnailStandardUrl.setValue(t.standard.url);
          
          this.f.thumbnailDefaultWidth.setValue(t.default.width);
          this.f.thumbnailMediumWidth.setValue(t.medium.width);
          this.f.thumbnailHighWidth.setValue(t.high.width);
          this.f.thumbnailStandardWidth.setValue(t.standard.width);
          this.f.thumbnailMaxresWidth.setValue(t['maxres']?.width ?? '');

          this.f.thumbnailDefaultHeight.setValue(t.default.height);
          this.f.thumbnailMediumHeight.setValue(t.medium.height);
          this.f.thumbnailHighHeight.setValue(t.high.height);
          this.f.thumbnailStandardHeight.setValue(t.standard.height);
          this.f.thumbnailMaxresHeight.setValue(t['maxres']?.height ?? '');
          if (t['maxres']?.url) {
            this.f.thumbnailMaxresUrl.setValue(t.maxres.url);
          } else {
            this.f.thumbnailMaxresUrl.setValue('');
          }
          return data;
        })
      )
      .subscribe(
        (data: any) => { data },
      )
    }
 
  onLangSelectChange(event: any) {
    this.langSearch = this.langData[this.langSelected].search;
  }
  checkMic(field: string): void {
    switch (field) {
      case 'webTubeTitle':
        this.isTitleUserSpeaking = !this.isTitleUserSpeaking;
        if (this.isTitleUserSpeaking) {
          this.isNoteUserSpeaking = false;
        }
        break;
      case 'note':
        this.isNoteUserSpeaking = !this.isNoteUserSpeaking;
        if (this.isNoteUserSpeaking) {
          this.isTitleUserSpeaking = false;
        }
        break;
    }
  }

  onVoiceInput(transcript: string | any) {
    if (this.isTitleUserSpeaking || this.isNoteUserSpeaking) {
      if (this.isTitleUserSpeaking) {
        let currentText = this.fldform.value.webTubeTitle ?? '' + ' ' + transcript;
        this.f.webTubeTitle.setValue(currentText.trim());
      };
      if (this.isNoteUserSpeaking) {
        let currentText = this.fldform.value.note ?? '' + ' ' + transcript;
        this.f.note.setValue(currentText.trim());
      }
    }

  }
  getSeries = computed(() => {
    this.f.webTubeSeries.setValue(this.webtubesService.youtube.value());
    return this.webtubesService.youtube.value() ?? [];
  })

}

