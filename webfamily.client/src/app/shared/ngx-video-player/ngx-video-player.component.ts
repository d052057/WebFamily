/* eslint-disable @angular-eslint/no-output-native */
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChange, SimpleChanges, input, viewChild, output } from '@angular/core';
import { BehaviorSubject, MonoTypeOperatorFunction, Observable, Subject, combineLatest, debounceTime, fromEvent, merge, takeUntil, tap, throttleTime } from 'rxjs';
import { VideoEventTypes } from './video-event-types.model';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { ClickOutsideDirective } from '../directives/click-outside.directive';
import { TimePipe } from '../pipes/time.pipe';
import { ChapterPipe } from '../pipes/chapter.pipe';
import { SortPipe } from '../pipes/sort.pipe';
export interface ISourceAttribute {
  src: string;
  type: string;
}

export interface ITrackAttribute {
  src: string;
  kind: string;
  srclang: string;
  default?: boolean;
  label: string;
}

export interface IChapterAttribute {
  title: string,
  time: number,
  duration?: number
}

function throunceTime<T>(duration: number): MonoTypeOperatorFunction<T> {
  return (source: Observable<T>) =>
    merge(source.pipe(throttleTime(duration)), source.pipe(debounceTime(duration)))
      .pipe(throttleTime(0, undefined, { leading: true, trailing: false }));
}

/**
 * A video player component for Angular
 */
@Component({
    selector: 'ngx-video-player',
    templateUrl: './ngx-video-player.component.html',
    styleUrls: ['./ngx-video-player.component.scss'],
    imports: [NgClass, NgFor, NgIf, ClickOutsideDirective, TimePipe, ChapterPipe, SortPipe]
})
export class NgxVideoPlayerComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  //#region INPUTS

  /** The source of the poster that will be used for the video */
  readonly posterSrc = input('');
  /** The chapters for the video */
  @Input() chapters: IChapterAttribute[] = [{ title: '', time: 0 }];
  //chapters = input<IChapterAttribute[]>([{ title: '', time: 0 }], {alias: 'chapters'});
  /** The tracks for the video */
  /*@Input() tracks: ITrackAttribute[] = [];*/
  tracks = input<ITrackAttribute[]>([]);
  /** The sources for the video */
  @Input() set sources(sources: ISourceAttribute[]) {
      this._videoSources = sources;
      const video = this.video();
      if (video) {
        video.nativeElement.load();
      }
  }
  readonly controls = input<boolean | string>(false);
  /** Autoplay the video */
  readonly autoplay = input(false);
  // TODO Implement Controlslist attribute
  /** Expose video crossOrigin attribute */
  readonly crossOrigin = input<'anonymous' | 'use-credentials' | ''>();
  /** Expose video height attribute */
  readonly height = input<number>();
  /** Expose video width attribute */
  readonly width = input<number>();
  /** Expose video loop attribute */
  readonly loop = input<boolean | string>(false);
  public _src?: string;
  /** Use optionally to add a single source to the video */
  readonly src = input<any>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['src'] && !changes['src'].isFirstChange()) {
      const val: SimpleChange = changes['src'];
      this._src = val.currentValue;
      console.warn(val.currentValue);
      const video = this.video();
      if (video) {
        video.nativeElement.src = val.currentValue;
      }
    }
  }
  /** The volume of the video */
  readonly volume = input(0.5);
  /** Play/Pause the video */
  @Input() set play(value: boolean) {
    if (value) {
      this.video().nativeElement.play();
    } else {
      this.video().nativeElement.pause();
    }
  }
  //#endregion

  //#region VIEWCHILDREN
  /** The video element */
  readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  /** The progress bar element */
  readonly progress = viewChild.required<ElementRef<HTMLElement>>('progress');
  /** The figure element (container to video and controls) */
  readonly figure = viewChild.required<ElementRef<HTMLElement>>('figure');
  //#endregion

  //#region PUBLIC PROPERTIES
  /** Does the browser support video */
  readonly browserSupportsVideo: boolean = !!document.createElement('video').canPlayType;
  /** Is fullScreen enabled */
  readonly fullScreenEnabled: boolean = !!document.fullscreenEnabled;
  /** The video sources (Used only internaly. Use [sources] to update video sources when interacting with the component) */
  _videoSources: ISourceAttribute[] = [];
  /** The source for the progress thumbnail */
  thumbnailSrc?: string;
  /** The time at which the progress cursor is currently pointing to */
  thumbnailTime?: number;
  /** The chapter that the progress cursor is currently pointing to */
  thunmnailChapter?: string;
  /** Is the track menu open */
  trackMenuOpen = false;
  /** Is the mouse moving (will be set to false only after specified delay) */
  mouseMoving = false;
  /** Expose the video buffered attribute */
  get buffered(): TimeRanges {
    return this.video().nativeElement.buffered;
  }
  isNaN = isNaN;
  //#endregion

  //#region PRIVATE PROPERTIES
  /** The unsubscribe subject emits and complete on destroy */
  private unsubscribe$ = new Subject<void>();
  /** The update Thumbnail subject */
  private updateThumbnail$ = new Subject<number>();
  /** The reset Thumbnail subject */
  private resetThumbnail$ = new BehaviorSubject<boolean>(false);
  //#endregion

  //#region LIFECYCLE HOOKS
  ngOnInit(): void {
    this.handleThumbnailDisplay();
  }

  ngAfterViewInit(): void {
    this.handleMouseMovement();

    const height = this.height();
    const video = this.video();
    if (height) {
      video.nativeElement.height = height;
    }
    const width = this.width();
    if (width) {
      video.nativeElement.width = width;
    }
    if (this._src) {
      video.nativeElement.src = this._src;
      video.nativeElement.load();
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    this.video().nativeElement.removeEventListener(VideoEventTypes.Ended, this.videoEventHandler);
    this.video().nativeElement.removeEventListener(VideoEventTypes.Play, this.videoEventHandler);
  }
  //#endregion

  //#region PUBLIC METHODS
  /**
   * Toggles the video play/pause state
   */
  toggleVideoPlayPause(): void {
    const video = this.video();
    if (video.nativeElement.paused || video.nativeElement.ended) {
      video.nativeElement.play();
    } else {
      video.nativeElement.pause();
    }
  }

  /**
   * Stops the video and resets the time to 0
   */
  stopVideo(): void {
    this.video().nativeElement.pause();
    this.video().nativeElement.currentTime = 0;
  }

  /**
   * Sets the video time to the specified number of seconds
   * @param seconds The number of seconds to set the video time to
   */
  setVideoTime(seconds: number): void {
    this.video().nativeElement.currentTime = seconds;
  }

  /**
   * Sets the video volume to the specified number
   * @param volume The volume to set the video to
   */
  setVideoVolume(volume: number): void {
    this.video().nativeElement.volume = volume;
  }

  /**
   * Sets the video subtitle track to use if any was selected
   * @param track The track to select
   */
  selectSubtitles(track: ITrackAttribute | null): void {
    for (let i = 0; i< this.video().nativeElement.textTracks.length; i++) {
      const video = this.video();
      if (track === null) {
        this.video().nativeElement.textTracks[i].mode = 'hidden';
      } else if (video.nativeElement.textTracks[i].language === track.srclang) {
        video.nativeElement.textTracks[i].mode = 'showing';
      } else {
        video.nativeElement.textTracks[i].mode = 'hidden';
      }
    }
    this.trackMenuOpen = false;
  }

  /**
   * Toggle the fullScreen mode
   */
  toggleFullScreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.figure().nativeElement.requestFullscreen();
    }
  }

  /**
   * Advances the video by the specified number of seconds
   * @param seconds The number of seconds to advance the video by
   */
  advanceVideoBy(seconds: number): void {
    this.setVideoTime(this.video().nativeElement.currentTime + seconds);
  }
  //#endregion

  //#region PRIVATE METHODS
  /**
   * Handles the display of the progress thumbnail
   */
  private handleThumbnailDisplay(): void {
    let video: HTMLVideoElement;
    let canvas: HTMLCanvasElement;
    let chapters: { title: string, time: number }[];
    
    combineLatest([this.updateThumbnail$, this.resetThumbnail$]).pipe(
      throunceTime(10),
      takeUntil(this.unsubscribe$),
    ).subscribe(([seconds, resetThumbnail]) => {
      if (!video || resetThumbnail) {
        video = this.video().nativeElement.cloneNode(true) as HTMLVideoElement;
        const videoValue = this.video();
        videoValue.nativeElement.onended = this.videoEventHandler.bind(this);
        videoValue.nativeElement.onplay = this.videoEventHandler.bind(this);
        video.muted = true;
        video.autoplay = false;
        video.crossOrigin = 'anonymous'

        video.addEventListener('seeked', () => {
          try {
            canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
            canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
            this.thumbnailSrc = canvas.toDataURL();
          } catch (error) {
            console.error("Error drawing thumbnail. It's likely that CORS headers are not present on the video", error);
            this.thumbnailSrc = '';
          }
        });
      }

      if (!canvas || resetThumbnail) {
        canvas = document.createElement("canvas");
        const ratio = this.video().nativeElement.videoWidth / this.video().nativeElement.videoHeight;
        canvas.width = 160;
        canvas.height = Math.floor(160 / ratio);
      }

      if (!chapters || resetThumbnail) {
        chapters = this.chapters ? [...this.chapters].sort((a, b) => b.time - a.time) : [];
      }

      this.thunmnailChapter = chapters.find((chapter) => chapter.time <= seconds)?.title;
      this.thumbnailTime = seconds;

      if (video && video.readyState >= 2) {
        video.currentTime = seconds;
      }

      if (resetThumbnail) {
        this.resetThumbnail$.next(false);
      }
    })
  }

  /**
   * Handles the display of the video controls on mouse movement
   */
  private handleMouseMovement(): void {
    fromEvent(this.figure().nativeElement, 'mousemove').pipe(
      tap(() => {
        this.mouseMoving = true;
      }),
      debounceTime(1500),
      tap(() => {
        this.mouseMoving = false;
      }),
      takeUntil(this.unsubscribe$)
    ).subscribe();
  }
  //#endregion


  /**
   * Coerces a data-bound value (typically a string) to a boolean.
   * @param value The value to coerce
   * @returns The coerced value
   */
  _coerceBooleanProperty(value: boolean | string): boolean {
    return value != null && `${value}` !== 'false';
  }

  //#region EVENT HANDLERS
  /**
   * Called when the value of volume input is changed
   * @param event The event
   */
  onVolumeChange(event: Event): void {
    const volume = (event.target as HTMLInputElement).value;
    this.setVideoVolume(+volume);
  }

  /**
   * Called when the metadata of the video is loaded
   */
  onMetadataLodaded(): void {
    // Sort chapters by time and calculate duration
    this.chapters = this.chapters
      .sort((a, b) => a.time - b.time)
      .map((chapter, index) => ({
        ...chapter,
        duration: (this.chapters[index + 1]?.time  || this.video().nativeElement.duration) - chapter.time
      }));
    this.resetThumbnail$.next(true);
  }

  /**
   * Called when the user hovers over the progress bar
   * @param event The mouse event
   * @returns void
   */
  onProgressHover(event?: MouseEvent): void {
    if (!event) return
    const rect = this.progress().nativeElement.getBoundingClientRect();
    const pos = (event.clientX - rect.left) / rect.width;
    this.progress().nativeElement.parentElement?.style.setProperty('--hover-x', `${event.clientX - rect.left}px`);
    this.updateThumbnail$.next(Math.floor(pos * this.video().nativeElement.duration));
  }

  /**
   * Sets the video time based on the progress bar position
   * @param event The mouse event
   */
  onProgressBarClick(event: MouseEvent): void {
    const rect = this.progress().nativeElement.getBoundingClientRect();
    const pos = (event.clientX - rect.left) / rect.width;
    this.setVideoTime(pos * this.video().nativeElement.duration);
  }
  //#endregion

  videoEventHandler(ev: Event): void {
    switch (ev.type) {
      case VideoEventTypes.Ended:
        this.endEvent(true);
        break;
      case VideoEventTypes.Play:
        this.playEvent(true);
        break;
    }
  }
  private endEvent(isNextEvent: boolean): void {
    if (isNextEvent) {
      this.stateEvent.emit("ended");
    }
  }
  private playEvent(isPlayingEvent: boolean): void {
    if (isPlayingEvent) {
      this.stateEvent.emit("playing");
    }
  }
  public readonly stateEvent = output<any>();
}
