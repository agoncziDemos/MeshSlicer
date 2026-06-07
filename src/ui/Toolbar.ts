export class Toolbar {
  private readonly fileInput: HTMLInputElement;
  private readonly fileLabel: HTMLSpanElement;
  private readonly statusLabel: HTMLSpanElement;

  private loadStlCallback: ((file: File) => void | Promise<void>) | null = null;
  private createPlaneCallback: (() => void) | null = null;

  constructor(app: HTMLDivElement) {
    this.fileInput = document.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.accept = ".stl";
    this.fileInput.style.display = "none";

    const loadButton = document.createElement("button");
    loadButton.textContent = "Load STL";

    const createPlaneButton = document.createElement("button");
    createPlaneButton.textContent = "Create Plane";

    this.fileLabel = document.createElement("span");
    this.fileLabel.id = "file-label";
    this.fileLabel.textContent = "No file loaded";

    this.statusLabel = document.createElement("span");
    this.statusLabel.id = "status-label";
    this.statusLabel.textContent = "";

    const toolbar = document.createElement("div");
    toolbar.id = "toolbar";
    toolbar.appendChild(loadButton);
    toolbar.appendChild(createPlaneButton);
    toolbar.appendChild(this.fileLabel);
    toolbar.appendChild(this.statusLabel);
    toolbar.appendChild(this.fileInput);

    app.appendChild(toolbar);

    loadButton.addEventListener("click", () => {
      this.fileInput.click();
    });

    createPlaneButton.addEventListener("click", () => {
      this.createPlaneCallback?.();
    });

    this.fileInput.addEventListener("change", () => {
      const file = this.fileInput.files?.[0];

      if (!file) {
        return;
      }

      this.loadStlCallback?.(file);
    });
  }

  onLoadStl(callback: (file: File) => void | Promise<void>): void {
    this.loadStlCallback = callback;
  }

  onCreatePlane(callback: () => void): void {
    this.createPlaneCallback = callback;
  }

  setFileLabel(text: string): void {
    this.fileLabel.textContent = text;
  }

  setStatus(text: string): void {
    this.statusLabel.textContent = text;
  }
}
