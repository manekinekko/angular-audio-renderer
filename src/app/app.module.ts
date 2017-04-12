import { BrowserModule } from '@angular/platform-browser';
import { NgModule, RendererFactory2, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { AudioRendererService, AUDIO_RENDERER_PROVIDERS } from './audio-renderer.service';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule
  ],
  providers: [
    AUDIO_RENDERER_PROVIDERS
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
