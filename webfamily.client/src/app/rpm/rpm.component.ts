import { Component, computed, inject, signal } from '@angular/core';
import { NgFor } from '@angular/common';
import { Router, ActivatedRoute, RouterOutlet } from '@angular/router';
import { environment } from '../../environments/environment';
import { RpmService } from '../rpm/services/rpm.service';
import { NgxPaginationModule } from 'ngx-pagination';

@Component({
    selector: 'app-rpm',
    imports: [NgFor, RouterOutlet, NgxPaginationModule],
    templateUrl: './rpm.component.html',
    styleUrl: './rpm.component.scss'
})
export class RpmComponent {
  private router = inject(Router);
  private activatedRouter = inject(ActivatedRoute);
  private service = inject(RpmService);
  currentPage = signal(1);
  itemsPerPage = signal(10);
  mediaConfig = environment.mediaConfig;

  ngOnInit(): void {
    this.service.coverFolder.set(this.mediaConfig.AssetRpmCoverFolder)
  }
  dataResource = computed(() =>
    this.service.getRpmMenuRS.value() ?? []
  )
  loadRPM(rpmRow: any) {
    /*window.alert(JSON.stringify(rpmRow));*/
    this.router.navigate(['./rpmplayer', rpmRow.recordId, rpmRow.folder], { relativeTo: this.activatedRouter })
  }
}
