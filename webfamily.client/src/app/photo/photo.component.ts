import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { environment } from '../../environments/environment';
import { ActivatedRoute } from '@angular/router';
import { MediaService } from '../shared/services/media.service';
import { PhotoGallery } from '../shared/photo-gallery/photo-gallery';
import { map } from 'rxjs';
import { rxResource } from '@angular/core/rxjs-interop';

export interface Iphoto {
  fileFolder: string,
  photoFolder: string
}

@Component({
  selector: 'app-photo',
  imports: [PhotoGallery],
  templateUrl: './photo.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './photo.component.scss',
})
export class PhotoComponent {
  private activatedRoute = inject(ActivatedRoute);
  private mediaService = inject(MediaService);
  readonly mediaConfig = environment.mediaConfig;
  fileFolder!: string | any;
    val: any = {
      photoFolder: '',
      fileFolder: ''
    };

  dataResource = this.mediaService.getMediaRecordRS;

  // Direct resource that sets service signals
  routeParamsResource = rxResource({
    stream: () => this.activatedRoute.paramMap.pipe(
      map(params => {
        const folder = params.get('folder');
        const menu = this.activatedRoute.snapshot.url[0]?.path;
        const fileFolder = this.mediaConfig.AssetPhotoFolder + "/" + folder + "/";
        // Set service signals directly in the stream
        if (folder && menu && fileFolder) {
          this.mediaService.folder.set(folder);
          this.mediaService.menu.set(menu);
          this.mediaService.fileFolder.set(fileFolder);
          this.val.photoFolder = folder;
          this.val.fileFolder = fileFolder;
          this.fileFolder = fileFolder;
        }

        return { folder, menu, fileFolder };
      })
    )
  });
}
