let video;
let bodyPose;
let poses = [];
let connections;
let silhouetteGraphics;
let particles = [];
let lastPositions = [];
let colorPalette = [];

function preload() {
  bodyPose = ml5.bodyPose({flipped: true});
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Crear gráficos para la silueta
  silhouetteGraphics = createGraphics(width, height);
  silhouetteGraphics.clear();
  
  // Paleta de colores vibrantes
  colorPalette = [
    color(255, 0, 100),
    color(0, 200, 255),
    color(100, 255, 0),
    color(255, 150, 0),
    color(200, 0, 255)
  ];

  video = createCapture(VIDEO, {flipped: true});
  video.size(width, height);
  video.hide();

  bodyPose.detectStart(video, gotPoses);
  connections = bodyPose.getSkeleton();
}

function gotPoses(results) {
  poses = results;
}

function draw() {
  background(0);
  
  // Limpiar el gráfico de silueta cada frame con transparencia para efecto de desvanecimiento
  silhouetteGraphics.clear();
  silhouetteGraphics.fill(0, 10);
  silhouetteGraphics.rect(0, 0, width, height);
  
  // Dibujar silueta y efectos
  if (poses.length > 0) {
    let pose = poses[0];
    
    // Dibujar silueta del cuerpo
    drawBodySilhouette(pose);
    
    // Dibujar efectos en las articulaciones
    drawJointsEffects(pose);
  }
  
  // Mostrar el gráfico de silueta
  image(silhouetteGraphics, 0, 0);
  
  // Actualizar y dibujar partículas
  updateParticles();
}

function drawBodySilhouette(pose) {
  silhouetteGraphics.fill(0, 255, 255, 150);
  silhouetteGraphics.noStroke();
  
  // Crear un polígono aproximado del cuerpo
  let bodyPoints = [];
  
  // Puntos clave para la silueta (cabeza, hombros, codos, manos, caderas, rodillas, pies)
  let keyIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  
  silhouetteGraphics.beginShape();
  for (let i = 0; i < keyIndices.length; i++) {
    let kp = pose.keypoints[keyIndices[i]];
    if (kp.confidence > 0.2) {
      silhouetteGraphics.vertex(kp.x, kp.y);
      bodyPoints.push({x: kp.x, y: kp.y});
    }
  }
  silhouetteGraphics.endShape(CLOSE);
  
  // Dibujar conexiones del esqueleto con estilo más grueso
  silhouetteGraphics.stroke(0, 255, 255, 200);
  silhouetteGraphics.strokeWeight(3);
  
  for (let i = 0; i < connections.length; i++) {
    let a = pose.keypoints[connections[i][0]];
    let b = pose.keypoints[connections[i][1]];
    if (a.confidence > 0.2 && b.confidence > 0.2) {
      silhouetteGraphics.line(a.x, a.y, b.x, b.y);
    }
  }
  
  // Almacenar posiciones para efectos de rastro
  if (frameCount % 3 === 0) {
    lastPositions.unshift(bodyPoints);
    if (lastPositions.length > 10) {
      lastPositions.pop();
    }
  }
  
  // Dibujar rastro de la silueta
  for (let i = 0; i < lastPositions.length; i++) {
    let alpha = map(i, 0, lastPositions.length, 50, 10);
    silhouetteGraphics.fill(0, 255, 255, alpha);
    silhouetteGraphics.noStroke();
    
    silhouetteGraphics.beginShape();
    for (let j = 0; j < lastPositions[i].length; j++) {
      silhouetteGraphics.vertex(lastPositions[i][j].x, lastPositions[i][j].y);
    }
    silhouetteGraphics.endShape(CLOSE);
  }
}

function drawJointsEffects(pose) {
  // Dibujar efectos en las articulaciones principales
  let joints = [
    pose.keypoints[0],  // nariz
    pose.keypoints[5],  // hombro izquierdo
    pose.keypoints[6],  // hombro derecho
    pose.keypoints[9],  // mano izquierda
    pose.keypoints[10], // mano derecha
    pose.keypoints[13], // pie izquierdo
    pose.keypoints[14]  // pie derecho
  ];
  
  for (let i = 0; i < joints.length; i++) {
    let joint = joints[i];
    if (joint.confidence > 0.2) {
      // Círculo pulsante en la articulación
      let pulseSize = sin(frameCount * 0.1 + i) * 5 + 15;
      silhouetteGraphics.fill(255, 100, 100, 150);
      silhouetteGraphics.noStroke();
      silhouetteGraphics.ellipse(joint.x, joint.y, pulseSize);
      
      // Añadir partículas aleatorias
      if (frameCount % 5 === 0) {
        let col = colorPalette[i % colorPalette.length];
        particles.push({
          x: joint.x,
          y: joint.y,
          vx: random(-2, 2),
          vy: random(-2, 2),
          size: random(3, 8),
          color: col,
          life: random(50, 100)
        });
      }
    }
  }
  
  // Efecto especial entre las manos
  let leftHand = pose.keypoints[9];
  let rightHand = pose.keypoints[10];
  
  if (leftHand.confidence > 0.2 && rightHand.confidence > 0.2) {
    let handDist = dist(leftHand.x, leftHand.y, rightHand.x, rightHand.y);
    let energyCol = lerpColor(color(100, 255, 255), color(255, 100, 255), map(handDist, 0, 300, 0, 1));
    
    silhouetteGraphics.stroke(red(energyCol), green(energyCol), blue(energyCol), 100);
    silhouetteGraphics.strokeWeight(map(handDist, 0, 300, 1, 5));
    silhouetteGraphics.line(leftHand.x, leftHand.y, rightHand.x, rightHand.y);
    
    // Arco de energía entre manos
    let midX = (leftHand.x + rightHand.x) / 2;
    let midY = (leftHand.y + rightHand.y) / 2;
    
    silhouetteGraphics.noFill();
    silhouetteGraphics.stroke(red(energyCol), green(energyCol), blue(energyCol), 150);
    silhouetteGraphics.strokeWeight(2);
    silhouetteGraphics.ellipse(midX, midY, handDist * 0.8, handDist * 0.3);
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    
    silhouetteGraphics.noStroke();
    silhouetteGraphics.fill(red(p.color), green(p.color), blue(p.color), map(p.life, 0, 100, 0, 200));
    silhouetteGraphics.ellipse(p.x, p.y, p.size * (p.life / 100));
    
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  video.size(width, height);
  silhouetteGraphics = createGraphics(width, height);
}