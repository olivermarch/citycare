import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicStorageModule } from '@ionic/storage-angular';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { UserGuard } from './services/user.guard';


@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule, HttpClientModule, IonicStorageModule.forRoot() ],
  providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }, UserGuard],
  bootstrap: [AppComponent]
})
export class AppModule {}
