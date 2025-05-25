import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "src/environments/environment";

@Injectable({
    providedIn: 'root'
  })
  export class MessageService {
    private http = inject(HttpClient);

    readonly BaseURI = environment.appUrl;
    getUserReceivedMessages(userId:string) {
        return this.http.get(this.BaseURI + 'api/message');
      }
      deleteMessage(message: any) {
        return this.http.post(this.BaseURI + 'api/message',message);
      }
  }