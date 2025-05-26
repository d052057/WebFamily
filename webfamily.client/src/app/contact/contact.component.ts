import { Component, VERSION } from '@angular/core';
import { JsonPrettyPipe } from '../shared/pipes/json-pretty.pipe';
import { fadeInOut } from '../shared/services/animations';
import { SocialMediaComponent } from '../shared/components/social-media/social-media.component';
@Component({
    selector: 'app-contact',
    templateUrl: './contact.component.html',
    styleUrls: ['./contact.component.scss'],
    animations: [fadeInOut],
    imports: [SocialMediaComponent]
})
export class ContactComponent {
  public code = 'New-SelfSignedCertificate -Subject "localhost" -TextExtension @("2.5.29.17={text}DNS=localhost&IPAddress=127.0.0.1&IPAddress=::1")'
  public contactInfo = {
    title: "Contact Me ☎️",
    subtitle: "Discuss a project or just want to say hi? My Inbox is open for all.",
    number: "+425-204-5255",
    email_address: "yitong.phou@gmail.com"
  };
  angularVersion = VERSION.full;
}
