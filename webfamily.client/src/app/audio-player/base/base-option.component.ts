import { Component, ElementRef, output, signal, viewChild, input, effect } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
    selector: 'app-base-option',
    template: `
    <p>
      base-option works!
    </p>
  `,
    styles: ``
})
export class BaseOptionComponent {
  audioList = input.required<any[]>();
  
  totalAudioLength: number = 0;
  currentAudioTime = 0;
  isAudioLoaded = signal(false);
  isAudioPlaying = signal(false);
  isAudioAutoPlay = signal(false);
  isRepeat = signal(false);
  audioVolume = input<number>(10);
  audioVolumeChange = output<number>();
  isAudioEnded = new Subject;
  isMute = signal(false);

  playEvent = output();
  pauseEvent = output();
  muteEvent = output();
  repeatEvent = output();
  autoPlay = input(false);
  autoPlayChange = output<boolean>();
  readonly audioPlayer = viewChild.required<ElementRef>('AngAudioPlayer');

  //get audio player events
  options(): void {
    //emit event when playing audio
    this.audioPlayer().nativeElement.addEventListener('playing', () => {
      this.isAudioPlaying.set(true);
    });
    this.audioPlayer().nativeElement.addEventListener('pause', () => {
      this.isAudioPlaying.set(false);
    });
    this.audioPlayer().nativeElement.addEventListener('repeat', () => {
    });
    //emit when intial loading of audio
    this.audioPlayer().nativeElement.addEventListener('loadeddata', () => {
      this.isAudioLoaded.set(true);
      this.getAudioLength();
    });
    // init autoplay from input autoplay
    this.audioPlayer().nativeElement.autoplay = this.autoPlay();
    this.isAudioAutoPlay.set(this.autoPlay());
   
    //emit time on playing audio
    this.audioPlayer().nativeElement.addEventListener('timeupdate', () => {
      //get current audio time
      this.currentAudioTime = Math.floor(this.audioPlayer().nativeElement.currentTime);
      //check if audio is ended for next song and pass data to component
      if (this.audioPlayer().nativeElement.ended) {
        this.isAudioEnded.next(true);
      }
    });

    this.audioPlayer().nativeElement.addEventListener('volumechange', () => {
      this.audioVolumeChange.emit(Math.floor(this.audioPlayer().nativeElement.volume * 100));
    })
  }
  repeat() {
    setTimeout(() => {
      const audioPlayer = this.audioPlayer();
      audioPlayer.nativeElement.loop = !audioPlayer.nativeElement.loop;
      this.isRepeat.set(audioPlayer.nativeElement.loop);
      this.repeatEvent.emit();
    }, 0);
  }
  mute() {
    setTimeout(() => {
      const audioPlayer = this.audioPlayer();
      audioPlayer.nativeElement.muted = !audioPlayer.nativeElement.muted;
      this.isMute.set(audioPlayer.nativeElement.muted);
      this.muteEvent.emit();
    }, 0);
  }
  play() {

    setTimeout(() => {
      this.audioPlayer().nativeElement.play();
      this.playEvent.emit();
    }, 0);
  }
  auto() {
    const audioPlayer = this.audioPlayer();
    audioPlayer.nativeElement.autoplay = !audioPlayer.nativeElement.autoplay;
    this.isAudioAutoPlay.set(audioPlayer.nativeElement.autoplay);
    this.autoPlayChange.emit(audioPlayer.nativeElement.autoplay);
  }
  pause() {
    setTimeout(() => {
      this.audioPlayer().nativeElement.pause();
      this.pauseEvent.emit();
    }, 0);
  }

  getAudioLength() {
    this.totalAudioLength = Math.floor(this.audioPlayer().nativeElement.duration);
  }
}
