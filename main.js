import MLController from './ml-controller.js'
class Circle {
    constructor(x, y, rad, stepX, stepY, color) {
        this.isOn = true;
        this.x = x;
        this.y = y;
        this.rad = rad;
        this.stepX = stepX;
        this.stepY = stepY;
        this.color = color;
    }
}

/*setup canvas and context*/
const canvas = document.getElementById('canvas');
canvas.style.visibility = 'hidden';
const levelChooser = document.getElementById('levels');
const ctx = canvas.getContext('2d');

canvas.height = 700;
canvas.width = 800;

/*define game constants*/
let nbCircles = 10;
let maxSpeed = 5;
let minSpeed = -5;

const accuracyLabel = document.getElementById('accuracy');

const hardLevelBut = document.getElementById('hardLevel');
const mediumLevelBut = document.getElementById('mediumLevel');
const easyLevelBut = document.getElementById('easyLevel');

const playButton = document.getElementById('play');

accuracyLabel.textContent = ' 0 ';

let level = 'none';

let nbClicks = 0;

hardLevelBut.addEventListener('click', () => {
    maxSpeed = 15;
    minSpeed = -15;
    nbCircles = 20;
    level = 'hard';
});

mediumLevelBut.addEventListener('click', () => {
    maxSpeed = 10;
    minSpeed = -10;
    nbCircles = 12;
    level = 'medium';
});

easyLevelBut.addEventListener('click', () => {
    maxSpeed = 5;
    minSpeed = -5;
    nbCircles = 7;
    level = 'easy';
});

const worker = new Worker('./detector.worker.js', { type: 'module' });

const mlController = new MLController({
    canvas,
    worker,
    level
});

worker.postMessage({
    type: 'LOAD_MODEL'
});

function drawCircle(circle) {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.rad, 0, 2 * Math.PI);
    ctx.fillStyle = `rgb(
        ${circle.color[0]},
        ${circle.color[1]},
        ${circle.color[2]})`;
    ctx.fill();
    ctx.stroke();
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

function generateCircles(nbCircles) {
    let circles = [];
    for (let i = 0; i < nbCircles; i++) {
        let rad = getRandomInt(40, 75);
        let stepX = getRandomInt(minSpeed, maxSpeed), stepY = getRandomInt(minSpeed, maxSpeed);

        while (stepX === 0 || stepY === 0) {
            stepX = getRandomInt(minSpeed, maxSpeed);
            stepY = getRandomInt(minSpeed, maxSpeed);
        }

        let x = getRandomInt(rad, canvas.width - rad);
        let y = getRandomInt(rad, canvas.height - rad);

        let color = [getRandomInt(0, 255), getRandomInt(0, 255), getRandomInt(0, 255)];

        circles.push(new Circle(x, y, rad, stepX, stepY, color));
    }

    return circles;
}

let circles = generateCircles(nbCircles);

function clickMouseEvent(event) {
    let rect = canvas.getBoundingClientRect();
    let posX = event.x - rect.x;
    let posY = event.y - rect.y;
    nbClicks += 1;

    for (let circle of circles) {
        if ((posX - circle.x) * (posX - circle.x) + (posY - circle.y) * (posY - circle.y) <= (circle.rad * circle.rad)) {
            circle.isOn = false;
        }
    }
}

function clamp(x, min , max) {
    return Math.min(Math.max(x, min), max);
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

canvas.addEventListener("click", clickMouseEvent, false);

function animate(circles) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawText(getNbCirclesOn(circles), canvas.width / 2, canvas.height / 2);
    if (nbClicks !== 0) {
        accuracyLabel.textContent = Math.round(((nbCircles - getNbCirclesOn(circles)) / nbClicks) * 100) + ' %';
    }

    for (let circle of circles) {
        if (circle.isOn) {
            let x = circle.x;
            let y = circle.y;
            let rad = circle.rad;
            let stepX = circle.stepX, stepY = circle.stepY;

            drawCircle(circle);

            /*Ball to ball collision*/
            for (let otherCircle of circles) {
                let dist = distance(circle.x, circle.y, otherCircle.x, otherCircle.y);
                if (dist !== 0 &&
                    dist <= circle.rad + otherCircle.rad) {
                    let nx = (otherCircle.x - circle.x) / dist;
                    let ny = (otherCircle.y - circle.y) / dist;

                    let p = 1;

                    circle.stepX = clamp(circle.stepX - p * nx, minSpeed, maxSpeed);
                    circle.stepY = clamp(circle.stepY - p * ny, minSpeed, maxSpeed);
                    otherCircle.stepX = clamp(otherCircle.stepX + p * nx, minSpeed, maxSpeed);
                    otherCircle.stepY = clamp(otherCircle.stepY + p * ny, minSpeed, maxSpeed);
                }
            }

            /*Collision with wall (canvas border)*/
            if (x + rad + 1>= canvas.width) {
                stepX = -stepX;
            }
            if (x - rad + 1<= 0) {
                stepX = -stepX;
            }
            if (y + rad + 1>= canvas.height) {
                stepY = -stepY;
            }
            if (y - rad + 1 <= 0) {
                stepY = -stepY;
            }

            circle.stepX = stepX;
            circle.stepY = stepY;

            circle.x += stepX;
            circle.y += stepY;
        }
    }
}

function getNbCirclesOn(circles) {
    let nbOn = 0;
    for (let i = 0; i < circles.length; i++) {
        if (circles[i].isOn)
            nbOn += 1;
    }
    return nbOn;
}

function drawText(text, x, y) {
    let width = 100;
    ctx.font = width + 'px Arial';
    ctx.fillStyle = `rgb(
        ${92},
        ${92},
        ${92})`;
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
}

function Render() {
    if (getNbCirclesOn(circles) !== 0)
    {
        animate(circles);
        window.requestAnimationFrame(Render);
    } else {
        mlController.stop();
    }
}

function Play() {
    canvas.style.visibility = 'hidden';
    if (level !== 'none') {
        playButton.style.visibility = 'hidden';
        levelChooser.style.visibility = 'hidden';
        canvas.style.visibility = 'visible';

        circles = generateCircles(nbCircles);

        window.requestAnimationFrame(Render);
        mlController.start();
    }
    else {
        window.alert('Select Level First !');
    }
}

playButton.addEventListener('click', Play);