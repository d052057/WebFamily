import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { TubeService } from '../services/tube.service'
import { FormControl, FormGroup, ReactiveFormsModule, FormBuilder } from '@angular/forms';

import { MatInputModule } from '@angular/material/input';
import urlParser, { YouTubeParseResult } from "js-video-url-parser";
import { SnackService } from '../../shared/services/snack.service';

@Component({
  selector: 'app-download-tube',
  imports: [ReactiveFormsModule, MatInputModule],
  templateUrl: './download-tube.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './download-tube.component.scss'
})
export class DownloadTubeComponent implements OnInit {
  service = inject(TubeService);
  private formBuilder = inject(FormBuilder);
  private snackService = inject(SnackService);
  downloadform!: FormGroup;
  submitted = false;
  submitting = false;
  get f(): any { return this.downloadform.controls; }

  ngOnInit() {
    this.downloadform = this.formBuilder.group({
      tubeUrl: new FormControl(''),
      updatePath: new FormControl(''),
      videoList: new FormControl('')
    });
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.downloadform.invalid) {
      return;
    }
    this.submitting = true;
    var record = {
      youtubeUrl: this.downloadform.value.tubeUrl,
      updatePath: this.downloadform.value.updatePath,
      videoList: this.downloadform.value.videoList
    }

    this.service.downloadYoutube(record)
      .subscribe(
        (data: any) => {
          this.snackService.openSnackBar(data);
          this.downloadform.reset();
        }
      )

    this.submitting = false;
    this.submitted = false;
  };
  parseVideoLink(): void {
    const parsedURL = urlParser.parse(this.downloadform.value.tubeUrl) as YouTubeParseResult;
    this.f.videoList.setValue('');
    if (parsedURL?.list) {
      this.f.videoList.setValue(parsedURL.list)
    }
    if (!parsedURL?.id) {
      this.downloadform.setErrors({ formInvalid: true });
    }
  }
}
