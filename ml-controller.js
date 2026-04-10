export default class MLController {
  constructor({ canvas, worker }) {
    this.canvas = canvas;
    this.worker = worker;

    this.isEnabled = false;
    this.isProcessing = false;
    this.isModelReady = false;
    this.loopId = null;

    this.frameInterval = 120;
    this.clickCooldown = 70;
    this.lastClickAt = 0;

    this.confidenceThreshold = 0.75;
    this.targetLabel = "frisbee";
    this.detections = [];
    this.level = this.level;

    this.handleWorkerMessage = this.handleWorkerMessage.bind(this);

    this.worker.addEventListener("message", this.handleWorkerMessage);
  }

  start() {
    if (this.isEnabled) return;
    if (!this.isModelReady) {
      console.warn("Modelo ainda não está pronto.");
      return;
    }

    this.isEnabled = true;

    this.loopId = window.setInterval(() => {
      this.tick();
    }, this.frameInterval);
  }

  stop() {
    this.isEnabled = false;
    this.isProcessing = false;
    this.detections = [];

    if (this.loopId) {
      window.clearInterval(this.loopId);
      this.loopId = null;
    }
  }

  async tick() {
    if (!this.isEnabled) return;
    if (!this.isModelReady) return;
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      const bitmap = await createImageBitmap(this.canvas);

      this.worker.postMessage(
      {
        type: "DETECT",
        payload: {
          imageBitmap: bitmap,
          level: this.level
        }
      },
      [bitmap]
    );
    } catch (error) {
      console.error("Erro ao capturar frame:", error);
      this.isProcessing = false;
    }
  }

  handleWorkerMessage(event) {
    const { type, payload } = event.data || {};

    if (type === "MODEL_READY") {
      this.isModelReady = true;
      console.log("Modelo pronto.");
      return;
    }

    if (type === "DETECTIONS_RESULT") {
      this.isProcessing = false;
      this.detections = payload?.detections || [];

      const bestTarget = this.pickBestDetection(this.detections);
      if (!bestTarget) return;

      const now = Date.now();
      if (now - this.lastClickAt < this.clickCooldown) return;

      this.clickAt(bestTarget.centerX, bestTarget.centerY);
      this.lastClickAt = now;
      return;
    }

    if (type === "DETECTION_ERROR") {
      console.error("Erro no worker:", payload?.message || payload);
      this.isProcessing = false;
    }
  }

  pickBestDetection(detections) {
    if (!Array.isArray(detections) || detections.length === 0) {
      return null;
    }

    const validTargets = detections
      .filter(detection => {
        return (
          detection &&
          detection.className === this.targetLabel &&
          typeof detection.score === "number" &&
          detection.score >= this.confidenceThreshold &&
          typeof detection.centerX === "number" &&
          typeof detection.centerY === "number" &&
          typeof detection.width === "number" &&
          typeof detection.height === "number"
        );
      })
      .sort((a, b) => {
        const areaA = a.width * a.height;
        const areaB = b.width * b.height;

        if (areaB !== areaA) {
          return areaB - areaA;
        }

        return b.score - a.score;
      });

    return validTargets[0] || null;
  }

  clickAt(x, y) {
    const rect = this.canvas.getBoundingClientRect();

    const event = new MouseEvent("click", {
      clientX: rect.left + x,
      clientY: rect.top + y,
      bubbles: true,
      cancelable: true,
      view: window
    });

    this.canvas.dispatchEvent(event);
  }
}
