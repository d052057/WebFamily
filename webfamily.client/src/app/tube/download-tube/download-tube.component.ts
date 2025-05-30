import { Component, inject, OnInit } from '@angular/core';
import { TubeService } from '../services/tube.service'
import { FormControl, FormGroup, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { NgClass, NgIf } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import urlParser from "js-video-url-parser";
import { SnackService } from '../../shared/services/snack.service';

@Component({
  selector: 'app-download-tube',
  imports: [NgClass, NgIf, ReactiveFormsModule, MatInputModule],
  templateUrl: './download-tube.component.html',
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
    let parsedURL: any = urlParser.parse(this.downloadform.value.tubeUrl);
    this.f.videoList.setValue('');
    if (parsedURL.list) {
      this.f.videoList.setValue(parsedURL.list)
    }
    if (!parsedURL.id) {
      this.downloadform.setErrors({ formInvalid: true });
    }
  }
}
