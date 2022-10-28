import {Component, EventEmitter, Output, AfterViewInit} from '@angular/core';
import {DegreeSpecsService, subject} from 'src/app/shared/degree-specs.service';

@Component({
  selector: 'app-studiengang',
  templateUrl: './studiengang.component.html',
  styleUrls: ['./studiengang.component.scss'],
})
export class StudiengangComponent implements AfterViewInit {
  @Output()
  selectedDegree: string = '';
  @Output()
  selectedSubjects: string[] = [];

  /**
   * Used to be able to communicate with the parent component (which has access to the stepper)
   * Primarely used to signal the stepper to go to the next step, after importing the file
   */
  @Output()
  eventEmitter: EventEmitter<string> = new EventEmitter<string>();

  getDegrees(): string[] {
    return this.degSpec.getDegreeNames();
  }

  getDegreeSubjectCount(degree: string): number {
    return this.degSpec.getDegreeSubjectCount(degree);
  }

  getSubjects(degree: string): string[] {
    return this.degSpec.getSubjectNames(degree);
  }

  getRemainingSubjects(degree: string, currentSelectPosition: number): string[] {
    return this.getSubjects(degree).filter(s => this.selectedSubjects.indexOf(s) === -1 || this.selectedSubjects.indexOf(s) === currentSelectPosition)
  }

  constructor(private degSpec: DegreeSpecsService) {
  }

  ngAfterViewInit() {
    //set drag and drop events
    let dndArea = document.getElementById("dnd-area");

    dndArea?.addEventListener('dragover', (e) => {
      e.stopPropagation();
      e.preventDefault();
      dndArea?.classList.add("dropping");
    });
    dndArea?.addEventListener("dragleave", (e) => {
      e.stopPropagation();
      e.preventDefault();
      dndArea?.classList.remove("dropping");
    })
    dndArea?.addEventListener('drop', (e) => {
      e.stopPropagation();
      e.preventDefault();
      dndArea?.classList.remove("dropping");

      //return, if no files available
      if (e.dataTransfer === null || e.dataTransfer.files.length === 0) {
        document.getElementById("uploadInfo")!.innerText = "Ein Fehler ist aufgetreten!";
        return;
      }

      this.uploadData(e.dataTransfer.files[0]);
    });
  }

  completed(): boolean {
    if (!this.selectedDegree) {
      return false;
    }
    let n = this.getDegreeSubjectCount(this.selectedDegree);
    if (this.selectedSubjects.length != n) {
      return false;
    }

    for (let i = 0; i < n; i++) {
      if (this.selectedSubjects[i] == '') {
        return false;
      }
    }
    if (this.duplicatedSubject()) return false;

    localStorage.setItem("degreeName", this.selectedDegree);
    return true;
  }

  range(start: number, end: number): number[] {
    var ans = [];
    for (let i = start; i <= end; i++) {
      ans.push(i);
    }
    return ans;
  }

  duplicatedSubject(): boolean {
    if (this.selectedSubjects.length == 0) {
      return false;
    }
    let n = this.getDegreeSubjectCount(this.selectedDegree);
    if (n <= 1) {
      return false;
    }
    let sub = this.selectedSubjects.filter(s => s !== "");
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (sub[i] == sub[j]) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Called from the import button, gets the file reference from the input element and starts uploading
   */
  uploadButton(): void {
    //get file list and check, if a file is available
    let files: FileList | null = (<HTMLInputElement>document.getElementById("fileInput")).files;
    if (files === null || files.length === 0) {
      document.getElementById("uploadInfo")!.innerText = "Ein Fehler ist aufgetreten!";
      return;
    }

    this.uploadData(files[0]);
  }

  /**
   * Reads the data from the given file, sets all required data and goes to next step in stepper.
   * @param file
   */
  uploadData(file: File): void {
    let infoDiv = document.getElementById("uploadInfo");

    //check for .json type
    if (!file.type || file.type !== "application/json") {
      infoDiv!.innerText = "Nur .json Dateien werden akzeptiert!";
      return;
    }

    //setup file reader with events
    let reader = new FileReader();
    reader.addEventListener("progress", (e) => {
      //displays file loading progress in percent
      infoDiv!.innerText = `${Math.round(e.loaded / e.total * 100)} / 100 %`;
    });
    reader.addEventListener("loadend", () => {
      //check that file data is not binary (array, blob etc.)
      if (typeof reader.result !== "string") {
        infoDiv!.innerText = "Fehler beim Laden der Datei!"
        return;
      }

      //decode data to json
      let jsonData: any;
      try {
        jsonData = JSON.parse(reader.result);
      } catch (e) {
        infoDiv!.innerText = "Datei ist nicht im json-Format!";
        return;
      }

      //set the degree name and override the degree spec with data from file
      this.selectedDegree = jsonData.degreeName;
      this.degSpec.degrees[this.selectedDegree] = jsonData.data;

      //set selected subjects (needed for dymnamic step loading)
      let dataSubjects: { [key: string]: subject } = jsonData.data.subjects;
      let i = 0;
      for (let key in dataSubjects) {
        this.selectedSubjects[i] = key;
        i++;
      }

      //emit data, which causes the stepper to go to the next step
      infoDiv!.innerText="Du wirst zum nächsten Schritt weitergeleitet, bitte warten...";
      this.eventEmitter.emit("next");//send data to parent (input-stepper)
    });

    //read file, which causes the above event to fire
    reader.readAsText(file);
  }
}
