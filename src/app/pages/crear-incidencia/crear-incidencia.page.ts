import { Component, OnInit } from '@angular/core';
import { IncidenciasService } from '../../services/incidencias.service';
import { LoadingController, NavController, Platform } from '@ionic/angular';
import { Observable } from 'rxjs';
import { DataService } from '../../services/data.service';
import { Municipio } from 'src/app/interfaces/interfaces';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UserService } from 'src/app/services/user.service';
import { finalize } from 'rxjs/operators';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';



const IMAGE_DIR = 'store-images';

interface LocalFile {
  name: string;
  path: string;
  data: string;
  up: string;
}

declare let window: any;
@Component({
  selector: 'app-crear-incidencia',
  templateUrl: './crear-incidencia.page.html',
  styleUrls: ['./crear-incidencia.page.scss'],
})

export class CrearIncidenciaPage implements OnInit {

 // temporalImages: string[] = [];

  images: LocalFile[] = [];

  loadingGPS = false;
  municipios: Observable<Municipio[]>;


  incidencia = {
    mensaje: '',
    title: '',
    coordinates: '',
    municipio: '',
    toggle: false
  };

  constructor(
    private incidenciaService: IncidenciasService,
    private navController: NavController,
    private dataService: DataService,
    private geolocation: Geolocation,
    private platform: Platform,
    private loadingController: LoadingController,
    private httpClient: HttpClient,
    private user: UserService
  ) { }

  ngOnInit() {
    //this.loadFiles();
    this.municipios = this.dataService.getLocation();
  }

  getGPS(){

    if(!this.incidencia.toggle){
        this.incidencia.coordinates = null;
        return;
    }
    this.loadingGPS = true;

    this.geolocation.getCurrentPosition().then((resp) => {
      // resp.coords.latitude
      // resp.coords.longitude
      this.loadingGPS = false;
      const coordinates = `${resp.coords.latitude},${resp.coords.longitude}`;
      console.log(coordinates);
      this.incidencia.coordinates = coordinates;

     }).catch((error) => {
       console.log('Error getting location', error);
       this.loadingGPS = false;
     });
    console.log(this.incidencia);
  }



  //Method to take photos from camara device
  // takePhoto(){

  //   const options: CameraOptions = {
  //     quality: 75,
  //     destinationType: this.camera.DestinationType.FILE_URI,
  //     encodingType: this.camera.EncodingType.JPEG,
  //     mediaType: this.camera.MediaType.PICTURE,
  //     sourceType: this.camera.PictureSourceType.CAMERA
  //   };

  //   this.camera.getPicture(options).then((imageData) => {
  //    // imageData is either a base64 encoded string or a file URI
  //    // If it's base64 (DATA_URL):

  //     const image = window.Ionic.WebView.convertFileSrc(imageData);
  //     this.incidenciaService.uploadFile(imageData);
  //     this.temporalImages.push(image);
  //     console.log(imageData);


  //   }, (err) => {
  //    // Handle error
  //   });
  // }

  // getFromGalery(){

  //   const options: CameraOptions = {
  //     quality: 75,
  //     destinationType: this.camera.DestinationType.FILE_URI,
  //     encodingType: this.camera.EncodingType.JPEG,
  //     mediaType: this.camera.MediaType.PICTURE,
  //     sourceType: this.camera.PictureSourceType.PHOTOLIBRARY
  //   };

  //   this.camera.getPicture(options).then((imageData) => {
  //    // imageData is either a base64 encoded string or a file URI
  //    // If it's base64 (DATA_URL):

  //     const image = window.Ionic.WebView.convertFileSrc(imageData);
  //     this.incidenciaService.uploadFile(imageData);
  //     this.temporalImages.push(image);
  //     console.log(imageData);

  //   }, (err) => {
  //    // Handle error
  //   });

  // }

    async createNewIncident(){


    const creat = await this.incidenciaService.postIncidencia( this.incidencia );


    this.incidencia = {
      mensaje: '',
      title: '',
      coordinates: '',
      municipio: '',
      toggle: false
    };

    //this.incidenciaService.postIncidencia(this.incidencia);
    this.navController.navigateRoot('/incidencias', {animated: true});
  }

  async selectImageFromCamera(){
    const image = await Camera.getPhoto({
      quality: 75,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera
    });



    //photo info
    console.log('HOLA: ', image.dataUrl);
    if(image){
      this.saveImage(image);
    }
  }

  async selectImageFromDevice(){
    const image = await Camera.getPhoto({
      quality: 75,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos
    });
    //photo info
    console.log(image);
    if(image){
      this.saveImage(image);
    }
  }

  async saveImage(photo: Photo){

    const base64Data = await this.readAsBase64(photo);
    console.log(base64Data);

    const fileName = new Date().getTime() + '.jpeg';
    const saveFile = await Filesystem.writeFile({
      directory: Directory.Data,
      path: `${IMAGE_DIR}/${fileName}`,
      data: base64Data

    });

    console.log('saved', saveFile);
    this.loadFiles();
  }

   async readAsBase64(photo: Photo) {
    if (this.platform.is('hybrid')) {
        const file = await Filesystem.readFile({
            path: photo.path
        });

        return file.data;
    }
    else {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();

        return await this.convertBlobToBase64(blob) as string;
    }
}


  convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader(); //esto puede estar mal los ()
    reader.onerror = reject;
    reader.onload = () => {
        resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });

  async loadFiles(){

    this.images = [];

    const loading = await this.loadingController.create({
      message: 'Cargando archivos',
    });
    await loading.present();

    Filesystem.readdir({
      directory: Directory.Data,
      path: IMAGE_DIR
    }).then( result => {
      console.log('AQUI: ', result);
      this.loadFileData(result.files);

    }, async (err) => {
      console.log('err', err);
      // la primera vez que se llame a esta funcion, no existira el directorio asi que hay que crearlo previamente asi
      //directorio vacio
      await Filesystem.mkdir({
        directory: Directory.Data,
        path: IMAGE_DIR
      });
    }).then(_ => {
      loading.dismiss();
    });
  }

  async loadFileData(fileNames: string[]) {
    for (const file of fileNames) {
      const filePath = `${IMAGE_DIR}/${file}`;

      const readFile = await Filesystem.readFile({
        path: filePath,
        directory: Directory.Data,
      });
      console.log('READ: ', readFile);


      this.images.push({
        name: file,
        path: filePath,
        data: `data:image/jpeg;base64,${readFile.data}`,
        up: readFile.data,
      });
      console.log(readFile);
      //aqui tengo el dato bueno
      //console.log(this..);
      //this.subirya(readFile.data);
    }
  }

  async deleteImage(file: LocalFile){
  await Filesystem.deleteFile({
    directory: Directory.Data,
    path: file.path
  });
  this.loadFiles();
  }

  async uploadFile(file: LocalFile){
    const response = await fetch(file.data);
    const blob= await response.blob();

    const formData = new FormData();
    formData.append('file', blob, file.name);
    this.uploadData(formData);
  }

  async uploadData(formData: FormData){

    const loading = await this.loadingController.create({
      message: 'Subiendo imagen...',
    });
    await loading.present();

    const headers = new HttpHeaders({
      'x-token': this.user.token
    });

    this.httpClient.post(`${URL}/incidencia/upload`, formData, {headers}).pipe(
      finalize(() => {
          loading.dismiss();
      })
  )
  .subscribe(res => {
      console.log(res);
  });

  }

  async subirya(datos: string){

    const loading = await this.loadingController.create({
      message: 'Subiendo imagen...',
    });
    await loading.present();

    const headers = new HttpHeaders({
      'x-token': this.user.token
    });

    this.httpClient.post(`${URL}/incidencia/upload`, datos, {headers}).pipe(
      finalize(() => {
          loading.dismiss();
      })
  )
  .subscribe(res => {
      console.log(res);
  });

  }


}
