import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ThaiAudioComponent } from "../thai-audio/thai-audio.component";
import { CommonModule, JsonPipe } from '@angular/common';
import { environment } from '../../../environments/environment';
import { MediaService } from '../../shared/services/media.service';
import { finalize, map } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { RESOURCE_MODES } from '../../../app/models/index';
@Component({
  selector: 'app-thai-audio-player',
  imports: [CommonModule, ThaiAudioComponent],
  templateUrl: './thai-audio-player.component.html',
  styleUrl: './thai-audio-player.component.scss'
})
export class ThaiAudioPlayerComponent implements OnInit {
  processLoading: boolean = false;
  artist!: string;
  medias = environment.mediaConfig.medias;
  autoPlay: boolean = false;
  audioVolume: number = 20;
  private service = inject(MediaService);

  play() {
    console.log('play');
  }
  private activatedRoute = inject(ActivatedRoute);
  resourceMode = signal<any>('');
  menuSubFolder = signal<any>('');
  menuFolder = signal<any>('');
  fileFolder = signal<any>('');
  ngOnInit(): void {
    this.processLoading = true;
    this.activatedRoute.paramMap
      .subscribe(
        (params: any) => {
          this.menuFolder.set(params.get('menu'));
          this.menuSubFolder.set(decodeURIComponent(params.get('folder')));
          this.artist = params.get('artist');
          this.fileFolder.set(this.medias + "/" + this.menuFolder() + "/" + this.menuSubFolder());
          this.resourceMode.set(this.menuSubFolder().split("/")[0].toLowerCase());
          this.loadDataSource();
        }
      )
  }
  loadDataSource() {
    if (this.resourceMode() === 'americanmusics') {
      let arr = this.menuSubFolder().split('/');
      let americanSong = arr.shift();
      let songPath: string = arr.join("\\");
      this.service.rockFolder.set(songPath);
      this.service.rockFileFolder.set(this.fileFolder());
      //alert(songPath);
      //alert(this.fileFolder());
    }
    else {
      this.service.menu.set(this.menuFolder());
      this.service.fileFolder.set(this.fileFolder());
      this.service.folder.set(this.menuSubFolder());
    }
  }
  audioList = computed(() => {
    switch (this.resourceMode()) {
      case RESOURCE_MODES.ROCK:
        return this.service.getRockMediaRecordRS.value();
      default:
        return this.service.getMediaRecordRS.value();
    }
  });
 
  ngOnDestroy() {
    //this.audioList.next([]);
    //this.audioList.complete();
  }
}
