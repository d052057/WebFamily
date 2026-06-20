import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-social-media',
    templateUrl: './social-media.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./social-media.component.scss']
})
export class SocialMediaComponent implements OnInit {

  socialMediaLinks = {

    github: "https://github.com/d052057",
    linkedin: "https://www.linkedin.com/in/yitong-phou-730829a6/",
    gmail: "yitong.phou@gmail.com",
    facebook: "https://www.facebook.com/profile.php?id=61553591944681"
  };
  constructor() { }

  ngOnInit(): void {
  }

}
