import { Component, input, output, effect, Input, signal, OnInit } from '@angular/core';
import { BaseOptionComponent } from '../base/base-option.component'
import { NgClass } from '@angular/common';
import {TimeConversionPipe } from '../../shared/pipes/time-conversion.pipe'
import { audioInterface } from '../model/audio.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-thai-audio',
  imports: [ NgClass, TimeConversionPipe, FormsModule],
  templateUrl: './thai-audio.component.html',
  styleUrl: './thai-audio.component.scss'
})
export class ThaiAudioComponent extends BaseOptionComponent implements OnInit {  
  seekEvent = output<number>();
  currentAudioIndex = 0;
  nextEvent = output();
  previousEvent = output();
  stateEvent = output<string>();

  selectedAudio = signal<audioInterface | undefined>(undefined);
  artist = input<string>();
  isError = false;
  audioEffect = effect(() => {
    this.initiateAudioPlayer();
  })
  ngOnInit() {
    this.audioPlayer().nativeElement.autoplay = this.autoPlay();
     this.options();
    this.initiateAudioPlayer();
    //check audio is ended for next song
    this.isAudioEnded.subscribe((data: any) => {
      if (!(this.isRepeat()) && (this.audioList().length > 0) && this.isAudioAutoPlay()) {
        this.nextAudio();
      }
    })
  }
  constructor() {
    super();
  }
  initiateAudioPlayer() {
    if (this.audioList()?.length <= 0) {
      this.isError = true;
    } else {
      this.selectedAudio.set( this.audioList()[this.currentAudioIndex]);
      const audioPlayer = this.audioPlayer();
      audioPlayer.nativeElement.autoplay = this.autoPlay();
      audioPlayer.nativeElement.volume = this.audioVolume() / 100;
      this.play();
    }
  }

  seekAudio(seekAudioValue: any) {
    this.audioPlayer().nativeElement.currentTime = seekAudioValue.target.value;
    this.seekEvent.emit(seekAudioValue.target.value);
  }
  nextAudio() {
    /*debugger;*/
    if (this.audioList().length - 1 != this.currentAudioIndex) {
      this.currentAudioIndex += 1;
      this.selectedAudio.set(this.audioList()[this.currentAudioIndex]);
      this.getAudioLength();
      if (this.isAudioPlaying()) {
        this.play();
      }
      this.nextEvent.emit();
    } else {
      this.pause();
      this.stateEvent.emit("next");
    }
  }
  previousAudio() {
    if (this.currentAudioIndex != 0) {
      this.currentAudioIndex -= 1;
      this.selectedAudio.set(this.audioList()[this.currentAudioIndex]);
      this.getAudioLength();
      if (this.isAudioPlaying()) {
        this.play();
      }
      this.previousEvent.emit();
    }
    this.stateEvent.emit("previous");
  }
  playAudio() {
    if (this.isAudioPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }
  autoplay_switch() {
    this.auto();
  }
  repeatAudio() {
    this.repeat();
  }
  muteAudio() {
    this.mute();
  }
  volumeChange(volume: any) {
    this.audioPlayer().nativeElement.volume = volume.target.value / 100;
    this.audioVolumeChange.emit(volume.target.value);
  }
}
