import "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";

const tf = globalThis.tf;

const MODEL_URL = "./yolov5n_web_model/model.json";
const LABELS_URL = "./yolov5n_web_model/labels.json";
const CONFIDENCE_BY_LEVEL = {
  easy: 0.35,
  medium: 0.65,
  hard: 0.75
};


let _model = null;
let _labels = [];

async function loadModelAndLabels() {
  if (!tf) {
    throw new Error("TensorFlow.js não foi carregado no worker.");
  }

  await tf.ready();

  _labels = await (await fetch(LABELS_URL)).json();
  _model = await tf.loadGraphModel(MODEL_URL);

  const warmupShape = _model.inputs[0].shape.map(dim => dim ?? 1);
  const dummyInput = tf.ones(warmupShape);
  await _model.executeAsync(dummyInput);
  tf.dispose(dummyInput);

  postMessage({ type: "MODEL_READY" });
}

function preprocessImage(input) {
  return tf.tidy(() => {
    let imgTensor = tf.browser.fromPixels(input);
    imgTensor = tf.image.resizeBilinear(imgTensor, [640, 640]);
    imgTensor = imgTensor.expandDims(0);
    imgTensor = imgTensor.div(255.0);
    return imgTensor;
  });
}

async function runInference(input) {
  const output = await _model.executeAsync(input);
  tf.dispose(input);

  const [boxes, scores, classes] = output.slice(0, 3)
  const [boxesData, scoresData, classesData] = await Promise.all([
    boxes.data(),
    scores.data(),
    classes.data()
  ]);

  output.forEach(t => t.dispose());

  return {
    boxes: boxesData,
    scores: scoresData,
    classes: classesData
  }
}

function* processPredictions({ boxes, scores, classes }, width, height, threshold) {
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] < threshold) continue;
    
    const classIndex = Math.round(classes[i]);
    const label = _labels[classIndex];
    if (label !== "frisbee") continue;

    let [x1, y1, x2, y2] = boxes.slice(i * 4, i * 4 + 4);
    x1 *= width;
    y1 *= height;
    x2 *= width;
    y2 *= height;

    const boxWidth = x2 - x1;
    const boxHeight = y2 - y1;
    const centerX = x1 + boxWidth / 2;
    const centerY = y1 + boxHeight / 2;
    const radius = Math.max(boxWidth, boxHeight) / 2;

    yield {
      className: label,
      score: scores[i],
      centerX,
      centerY,
      x1,
      y1,
      x2,
      y2,
      width: boxWidth,
      height: boxHeight,
      radius
    }
  }
}

self.addEventListener("message", async event => {
  const { type, payload } = event.data || {};
  if (type === "LOAD_MODEL") {
    await loadModelAndLabels();
    return;
  }

  if (type === "DETECT") {
    if (!_model || !_labels.length) {
      self.postMessage({
        type: "DETECTION_ERROR",
        payload: { message: "Modelo ainda não carregado." }
      });
      return;
    }

    const { imageBitmap, level } = payload;
    const threshold = CONFIDENCE_BY_LEVEL[level] ?? 0.5;

    const input = preprocessImage(imageBitmap);
    const { width, height } = imageBitmap;

    const inferenceResults = await runInference(input);

    if (imageBitmap && typeof imageBitmap.close === "function") {
      imageBitmap.close();
    }

    const detections = Array.from(processPredictions(inferenceResults, width, height, threshold));

    console.log("Detecções processadas:", detections);

    self.postMessage({
      type: "DETECTIONS_RESULT",
      payload: { detections }
    });
  }
});
