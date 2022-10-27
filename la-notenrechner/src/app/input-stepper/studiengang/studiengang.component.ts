import {Component, Output} from '@angular/core';
import {DegreeSpecsService, subject} from 'src/app/shared/degree-specs.service';

@Component({
  selector: 'app-studiengang',
  templateUrl: './studiengang.component.html',
  styleUrls: ['./studiengang.component.scss'],
})
export class StudiengangComponent {
  @Output()
  selectedDegree: string = '';
  @Output()
  selectedSubjects: string[] = [];

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

  uploadData(): void {
    let files: FileList | null = (<HTMLInputElement>document.getElementById("fileInput")).files;
    if (files === null || files.length === 0) return;

    if (!files[0].type || files[0].type !== "application/json") return;
    let reader = new FileReader();

    let progressDiv = document.getElementById("uploadProgress");
    reader.addEventListener("progress", (evt) => {
      if (progressDiv === null) return;

      progressDiv.innerText = `${Math.round(evt.loaded / evt.total * 100)}`;
    });
    reader.addEventListener("loadend", () => {
      if (typeof reader.result !== "string") return;
      let jsonData: any = JSON.parse(reader.result);

      this.selectedDegree = jsonData.degreeName;
      this.degSpec.degrees[this.selectedDegree] = jsonData.data;

      let dataSubjects: { [key: string]: subject } = jsonData.data.subjects;
      let i = 0;
      for (let key in dataSubjects) {
        this.selectedSubjects[i] = key;
        i++;
      }
      console.log(this.selectedSubjects);
      this.completed();
    });

    reader.readAsText(files[0]);
  }
}
