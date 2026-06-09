export type SliceEngine = "typescript" | "wasm";

export class Toolbar {
  private readonly fileInput: HTMLInputElement;
  private readonly fileLabel: HTMLSpanElement;
  private readonly statusLabel: HTMLSpanElement;
  private readonly sliceEngineToggle: HTMLButtonElement;
  private readonly sliceStepInput: HTMLInputElement;
  private readonly sliceStepValue: HTMLSpanElement;

  private sliceEngine: SliceEngine = "wasm";

  private loadStlCallback: ((file: File) => void | Promise<void>) | null = null;
  private createPlaneCallback: (() => void) | null = null;
  private makeVerticalCallback: (() => void) | null = null;
  private sliceCallback:
    | ((sliceStep: number, sliceEngine: SliceEngine) => void | Promise<void>)
    | null = null;

  constructor(app: HTMLDivElement) {
    this.fileInput = document.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.accept = ".stl";
    this.fileInput.style.display = "none";

    const loadButton = document.createElement("button");
    loadButton.textContent = "Load STL";

    const createPlaneButton = document.createElement("button");
    createPlaneButton.textContent = "Create Plane";

    const makeVerticalButton = document.createElement("button");
    makeVerticalButton.textContent = "Make Vertical";

    this.sliceEngineToggle = document.createElement("button");
    this.sliceEngineToggle.type = "button";
    this.sliceEngineToggle.style.minWidth = "130px";
    this.updateSliceEngineToggle();

    const sliceStepLabel = document.createElement("label");
    sliceStepLabel.textContent = "Slice step";

    this.sliceStepInput = document.createElement("input");
    this.sliceStepInput.type = "range";
    this.sliceStepInput.min = "0.2";
    this.sliceStepInput.max = "1";
    this.sliceStepInput.step = "0.1";
    this.sliceStepInput.value = "0.5";

    this.sliceStepValue = document.createElement("span");
    this.sliceStepValue.textContent = `${this.sliceStepInput.value} mm`;

    const sliceButton = document.createElement("button");
    sliceButton.textContent = "Slice";

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
    toolbar.appendChild(makeVerticalButton);
    toolbar.appendChild(this.sliceEngineToggle);
    toolbar.appendChild(sliceStepLabel);
    toolbar.appendChild(this.sliceStepInput);
    toolbar.appendChild(this.sliceStepValue);
    toolbar.appendChild(sliceButton);
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

    makeVerticalButton.addEventListener("click", () => {
      this.makeVerticalCallback?.();
    });

    this.sliceEngineToggle.addEventListener("click", () => {
      this.sliceEngine =
        this.sliceEngine === "typescript" ? "wasm" : "typescript";

      this.updateSliceEngineToggle();
    });

    this.sliceStepInput.addEventListener("input", () => {
      this.sliceStepValue.textContent = `${this.sliceStepInput.value} mm`;
    });

    sliceButton.addEventListener("click", () => {
      const sliceStep = Number(this.sliceStepInput.value);

      if (!Number.isFinite(sliceStep) || sliceStep <= 0) {
        this.setStatus("Slice step must be positive");
        return;
      }

      this.sliceCallback?.(sliceStep, this.sliceEngine);
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

  onMakeVertical(callback: () => void): void {
    this.makeVerticalCallback = callback;
  }

  onSlice(
    callback: (sliceStep: number, sliceEngine: SliceEngine) => void | Promise<void>
  ): void {
    this.sliceCallback = callback;
  }

  setFileLabel(text: string): void {
    this.fileLabel.textContent = text;
  }

  setStatus(text: string): void {
    this.statusLabel.textContent = text;
  }

  private updateSliceEngineToggle(): void {
    if (this.sliceEngine === "typescript") {
      this.sliceEngineToggle.textContent = "● TS | WASM";
      return;
    }

    this.sliceEngineToggle.textContent = "TS | WASM ●";
  }
}
