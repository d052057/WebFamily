import { Component, VERSION } from '@angular/core';
import * as packageJson from '../../../package.json';
import { SocialMediaComponent } from '../shared/components/social-media/social-media.component';
@Component({
    selector: 'app-contact',
    templateUrl: './contact.component.html',
    styleUrls: ['./contact.component.scss'],
    imports: [SocialMediaComponent]
})
export class ContactComponent {
  public contactInfo = {
    title: "Contact Me ☎️",
    subtitle: "Discuss a project or just want to say hi? My Inbox is open for all.",
    number: "+425-204-5255",
    email_address: "yitong.phou@gmail.com"
  };
  boostrapIconVersion: string = packageJson.dependencies['bootstrap-icons'] || 'N/A';;
  bootstrapVersion: string = packageJson.dependencies.bootstrap || 'N/A';;
  angularVersion = VERSION.full;
  //ngOnInit() {
  //  this.bootstrapVersion = packageJson.dependencies.bootstrap || packageJson.devDependencies.bootstrap || 'N/A';
  //}
}
