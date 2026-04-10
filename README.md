# Aim Trainer Bot with YOLO + TensorFlow.js

A browser-based computer vision experiment that uses YOLO + TensorFlow.js to automatically play an Aim Trainer game.

This project extends an open-source Aim Trainer by adding a real-time detection pipeline running entirely in the browser.

## Demo

https://vision-aim-bot.vercel.app/

## Tech Stack

- TensorFlow.js
- YOLO (converted to TFJS format)
- Web Workers
- HTML5 Canvas
- Vanilla JavaScript

## How it works

1. The game canvas is captured frame by frame  
2. Each frame is sent to a Web Worker  
3. The worker runs inference using YOLO + TensorFlow.js  
4. Predictions are processed (bounding boxes + confidence filtering)  
5. The best target is selected  
6. A click is simulated at the target position  

## Results

- ~80% accuracy on harder levels  
- Real-time inference fully running in the browser  
- Complete computer vision pipeline (capture → inference → decision → action)  

## Running the project

### 1. Clone the repository

git clone https://github.com/beatriztiosse/vision-aim-bot.git
cd vision-aim-bot

### 2. Start a local server

#### Option 1 (Python)

python3 -m http.server 5173

Open in browser:  
http://localhost:5173

#### Option 2 (Node)

npx serve .

### 3. Run the project

- Select a level  
- Click "Play"  
- The bot will start playing automatically  

## Project structure

/
index.html  
main.js  
ml-controller.js  
detector.worker.js  
/yolov5n_web_model  
  model.json  
  *.bin  
  labels.json  

## Important notes

- This project does not work via `file://` — a local server is required  
- Performance may vary depending on your machine  
- Accuracy is not 100% due to latency and moving targets  
- The model runs entirely in the browser (no backend required)  

## Base project

This project is based on:

https://github.com/sanassi/AimTrain

The original repository provides the base Aim Trainer implementation.

## What was added

- YOLO model integration using TensorFlow.js  
- Real-time inference inside a Web Worker  
- Image preprocessing and inference pipeline  
- Detection post-processing (confidence filtering and bounding boxes)  
- Target selection strategy based on confidence and size  
- Automated click system based on model predictions  
- Performance optimizations for browser execution  

## Key learnings

This project highlights that:

- AI is not just the model — it's the full pipeline  
- Latency directly impacts real-time decision-making  
- Running inference in a Web Worker is essential for performance  
- Post-processing and decision logic are as important as the model  
- Browser-based ML introduces unique constraints and trade-offs  

## Next steps

- Apply this architecture to real-world problems  
- Add object tracking  
- Improve accuracy with motion prediction  

## License

MIT
