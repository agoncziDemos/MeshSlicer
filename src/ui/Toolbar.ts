export type SliceEngine = "typescript" | "wasm";

export type SampleStlOption = {
  label: string;
  path: string;
};

export class Toolbar {
  private readonly fileInput: HTMLInputElement;
  private readonly fileLabel: HTMLSpanElement;
  private readonly statusLabel: HTMLSpanElement;
  private readonly sliceEngineToggle: HTMLButtonElement;
  private readonly sliceStepInput: HTMLInputElement;
  private readonly sliceStepValue: HTMLSpanElement;

  private sliceEngine: SliceEngine = "wasm";

  private loadStlCallback: ((file: File) => void | Promise<void>) | null = null;
  private loadSampleCallback:
    | ((sample: SampleStlOption) => void | Promise<void>)
    | null = null;
  private createPlaneCallback: (() => void) | null = null;
  private makeVerticalCallback: (() => void) | null = null;
  private sliceCallback:
    | ((sliceStep: number, sliceEngine: SliceEngine) => void | Promise<void>)
    | null = null;

  constructor(app: HTMLDivElement, sampleOptions: SampleStlOption[] = []) {
    this.fileInput = document.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.accept = ".stl";
    this.fileInput.style.display = "none";

    const loadButton = document.createElement("button");
    loadButton.textContent = "Load STL";

    const sampleMenu = createSampleMenu(sampleOptions, (sample) => {
      this.loadSampleCallback?.(sample);
    });

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
    toolbar.appendChild(sampleMenu);
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
    app.appendChild(createHelpTooltip());

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

  onLoadSample(
    callback: (sample: SampleStlOption) => void | Promise<void>
  ): void {
    this.loadSampleCallback = callback;
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

function createSampleMenu(
  sampleOptions: SampleStlOption[],
  onSampleSelected: (sample: SampleStlOption) => void
): HTMLDivElement {
  const container = document.createElement("div");
  container.id = "sample-menu";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Load Sample STL";

  const panel = document.createElement("div");
  panel.id = "sample-menu-panel";

  for (const sample of sampleOptions) {
    const sampleButton = document.createElement("button");
    sampleButton.type = "button";
    sampleButton.textContent = sample.label;

    sampleButton.addEventListener("click", () => {
      panel.style.display = "none";
      onSampleSelected(sample);
    });

    panel.appendChild(sampleButton);
  }

  button.addEventListener("click", (event) => {
    event.stopPropagation();

    panel.style.display = panel.style.display === "block" ? "none" : "block";
  });

  panel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", () => {
    panel.style.display = "none";
  });

  container.appendChild(button);
  container.appendChild(panel);

  applySampleMenuStyles(container, panel);

  return container;
}

function applySampleMenuStyles(
  container: HTMLDivElement,
  panel: HTMLDivElement
): void {
  container.style.position = "relative";
  container.style.display = "inline-flex";

  panel.style.display = "none";
  panel.style.position = "absolute";
  panel.style.left = "0";
  panel.style.top = "34px";
  panel.style.minWidth = "170px";
  panel.style.padding = "6px";
  panel.style.borderRadius = "8px";
  panel.style.background = "rgba(255, 255, 255, 0.98)";
  panel.style.border = "1px solid #cccccc";
  panel.style.boxShadow = "0 4px 14px rgba(0, 0, 0, 0.22)";
  panel.style.zIndex = "30";

  for (const child of Array.from(panel.children)) {
    if (!(child instanceof HTMLButtonElement)) {
      continue;
    }

    child.style.display = "block";
    child.style.width = "100%";
    child.style.textAlign = "left";
    child.style.margin = "0";
    child.style.padding = "6px 10px";
    child.style.border = "none";
    child.style.borderRadius = "6px";
    child.style.background = "transparent";
    child.style.color = "#222222";
    child.style.cursor = "pointer";
    child.style.font = "13px system-ui, sans-serif";

    child.addEventListener("mouseenter", () => {
      child.style.background = "rgba(0, 0, 0, 0.08)";
    });

    child.addEventListener("mouseleave", () => {
      child.style.background = "transparent";
    });
  }
}

function createHelpTooltip(): HTMLDivElement {
  const container = document.createElement("div");
  container.id = "help-tooltip";

  const button = document.createElement("button");
  button.id = "help-tooltip-button";
  button.type = "button";
  button.textContent = "i";
  button.setAttribute("aria-label", "Show MeshSlicer instructions");

  const tooltip = document.createElement("div");
  tooltip.id = "help-tooltip-panel";
  tooltip.innerHTML = [
    "<strong>How to use MeshSlicer</strong>",
    "1. Load an STL file or choose a sample.",
    "2. Click Create Plane.",
    "3. Click two points on the mesh to create the slicing plane.",
    "4. Move or rotate the plane to update the cross-section preview.",
    "5. Choose TS or WASM, adjust the slice step, then click Slice.",
    "6. Download the generated PNG slice stack.",
  ].join("<br />");

  container.appendChild(button);
  container.appendChild(tooltip);

  applyHelpTooltipStyles(container, button, tooltip);

  return container;
}

function applyHelpTooltipStyles(
  container: HTMLDivElement,
  button: HTMLButtonElement,
  tooltip: HTMLDivElement
): void {
  container.style.position = "fixed";
  container.style.left = "18px";
  container.style.top = "64px";
  container.style.zIndex = "20";

  button.style.width = "26px";
  button.style.height = "26px";
  button.style.padding = "0";
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.borderRadius = "50%";
  button.style.border = "1px solid #aaaaaa";
  button.style.background = "rgba(255, 255, 255, 0.92)";
  button.style.color = "#333333";
  button.style.fontFamily = "Georgia, serif";
  button.style.fontSize = "16px";
  button.style.fontStyle = "italic";
  button.style.fontWeight = "700";
  button.style.lineHeight = "1";
  button.style.cursor = "help";
  button.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.15)";

  tooltip.style.display = "none";
  tooltip.style.position = "absolute";
  tooltip.style.left = "0";
  tooltip.style.top = "34px";
  tooltip.style.width = "300px";
  tooltip.style.padding = "10px 12px";
  tooltip.style.borderRadius = "8px";
  tooltip.style.background = "rgba(255, 255, 255, 0.96)";
  tooltip.style.border = "1px solid #cccccc";
  tooltip.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.22)";
  tooltip.style.color = "#222222";
  tooltip.style.font = "13px system-ui, sans-serif";
  tooltip.style.lineHeight = "1.45";
  tooltip.style.pointerEvents = "auto";
  tooltip.style.userSelect = "text";

  let hideTooltipTimeout: number | undefined;

  const showTooltip = (): void => {
    if (hideTooltipTimeout !== undefined) {
      window.clearTimeout(hideTooltipTimeout);
      hideTooltipTimeout = undefined;
    }

    tooltip.style.display = "block";
  };

  const scheduleHideTooltip = (): void => {
    hideTooltipTimeout = window.setTimeout(() => {
      tooltip.style.display = "none";
      hideTooltipTimeout = undefined;
    }, 120);
  };

  button.addEventListener("mouseenter", showTooltip);
  button.addEventListener("mouseleave", scheduleHideTooltip);
  tooltip.addEventListener("mouseenter", showTooltip);
  tooltip.addEventListener("mouseleave", scheduleHideTooltip);
}
