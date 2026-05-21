(function () {
  'use strict';

  var dataPoints = [];
  var w = 0;
  var b = 0;
  var loss = 0;
  var epoch = 0;
  var lossHistory = [];
  var autoTimer = null;
  var canvasPack;
  var canvas;
  var ctx;
  var width;
  var height;
  var padding = 44;

  function setupCanvas() {
    canvasPack = LabUtils.getCanvasAndContext('regressionCanvas');
    canvas = canvasPack.canvas;
    ctx = canvasPack.ctx;
    width = canvasPack.width;
    height = canvasPack.height;
  }

  function generateData() {
    stopAutoTrain();
    dataPoints = [];
    w = LabUtils.randomBetween(-0.45, 0.45);
    b = LabUtils.randomBetween(-0.2, 0.2);
    epoch = 0;
    lossHistory = [];

    var trueW = LabUtils.randomBetween(0.95, 1.45);
    var trueB = LabUtils.randomBetween(-0.2, 0.15);
    var noiseLevel = getNoiseLevel();

    for (var i = 0; i < 48; i++) {
      var x = i / 47;
      var noise = LabUtils.randomBetween(-noiseLevel, noiseLevel);
      var y = trueW * x + trueB + noise;
      y = LabUtils.clamp(y, 0.05, 0.95);
      dataPoints.push({
        x: x,
        y: y
      });
    }

    updateLoss();
    addLossHistory();
    updateInfo();
    LabUtils.updateExplanation('regressionExplanationText', '已生成带噪声的线性散点。现在可以点击“训练一步”观察直线如何调整。');
    draw();
  }

  function getLearningRate() {
    return Number(document.getElementById('learningRate').value);
  }

  function getNoiseLevel() {
    return Number(document.getElementById('noiseLevel').value);
  }

  function updateLearningRateText() {
    LabUtils.setText('learningRateText', getLearningRate().toFixed(3));
  }

  function updateNoiseLevelText() {
    LabUtils.setText('noiseLevelText', getNoiseLevel().toFixed(2));
  }

  function trainOneStep() {
    if (dataPoints.length === 0) {
      generateData();
    }

    var gradW = 0;
    var gradB = 0;
    var n = dataPoints.length;

    for (var i = 0; i < n; i++) {
      var prediction = w * dataPoints[i].x + b;
      var error = prediction - dataPoints[i].y;
      gradW += 2 * error * dataPoints[i].x / n;
      gradB += 2 * error / n;
    }

    w -= getLearningRate() * gradW;
    b -= getLearningRate() * gradB;
    epoch++;
    updateLoss();
    addLossHistory();
    updateInfo();
    LabUtils.updateExplanation('regressionExplanationText', '已执行一次梯度下降：根据误差方向更新 w 和 b，使拟合直线更接近散点。');
    draw();
  }

  function trainManySteps() {
    if (dataPoints.length === 0) {
      generateData();
    }
    stopAutoTrain();
    for (var i = 0; i < 50; i++) {
      trainOneStep();
    }
    LabUtils.updateExplanation('regressionExplanationText', '已连续训练 50 步。观察 loss 曲线可以看到误差变化趋势。');
  }

  function autoTrain() {
    if (autoTimer) {
      stopAutoTrain();
      LabUtils.updateExplanation('regressionExplanationText', '自动训练已暂停。');
      return;
    }

    if (dataPoints.length === 0) {
      generateData();
    }

    LabUtils.setText('autoTrainBtn', '暂停训练');
    LabUtils.updateExplanation('regressionExplanationText', '自动训练中：loss 会随着多次梯度下降逐渐减小。');
    autoTimer = window.setInterval(function () {
      for (var i = 0; i < 4; i++) {
        trainOneStep();
      }
      if (epoch >= 220 || loss < 0.003) {
        stopAutoTrain();
        LabUtils.updateExplanation('regressionExplanationText', '自动训练结束。当前直线已经较好地拟合数据。');
      }
    }, 120);
  }

  function stopAutoTrain() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
      LabUtils.setText('autoTrainBtn', '自动训练');
    }
  }

  function resetModel() {
    stopAutoTrain();
    w = 0;
    b = 0;
    epoch = 0;
    lossHistory = [];
    updateLoss();
    addLossHistory();
    updateInfo();
    LabUtils.updateExplanation('regressionExplanationText', '模型参数已重置。数据保留，直线回到初始状态。');
    draw();
  }

  function updateLoss() {
    if (dataPoints.length === 0) {
      loss = 0;
      return;
    }

    var sum = 0;
    for (var i = 0; i < dataPoints.length; i++) {
      var error = w * dataPoints[i].x + b - dataPoints[i].y;
      sum += error * error;
    }
    loss = sum / dataPoints.length;
  }

  function addLossHistory() {
    lossHistory.push(loss);
    if (lossHistory.length > 120) {
      lossHistory.shift();
    }
  }

  function updateInfo() {
    LabUtils.setText('wText', w.toFixed(3));
    LabUtils.setText('bText', b.toFixed(3));
    LabUtils.setText('lossText', loss.toFixed(4));
    LabUtils.setText('epochText', epoch);
    LabUtils.setText('formulaText', 'y = ' + w.toFixed(3) + 'x + ' + b.toFixed(3));
    drawLossChart();
  }

  function toCanvasX(x) {
    return padding + x * (width - padding * 2);
  }

  function toCanvasY(y) {
    return height - padding - y * (height - padding * 2);
  }

  function draw() {
    setupCanvas();
    LabUtils.clearCanvas(ctx, canvas, '#ffffff');
    drawAxes();

    if (document.getElementById('showErrorLines').checked) {
      drawErrorLines();
    }

    for (var i = 0; i < dataPoints.length; i++) {
      LabUtils.drawCircle(ctx, toCanvasX(dataPoints[i].x), toCanvasY(dataPoints[i].y), 5.5, '#2563eb', '#ffffff', 1.5);
    }

    drawRegressionLine();
  }

  function drawErrorLines() {
    for (var i = 0; i < dataPoints.length; i++) {
      var predictedY = LabUtils.clamp(w * dataPoints[i].x + b, -0.25, 1.25);
      LabUtils.drawLine(ctx, toCanvasX(dataPoints[i].x), toCanvasY(dataPoints[i].y), toCanvasX(dataPoints[i].x), toCanvasY(predictedY), '#f59e0b', 1.5, 0.45);
    }
  }

  function drawAxes() {
    for (var x = padding; x <= width - padding; x += 50) {
      LabUtils.drawLine(ctx, x, padding, x, height - padding, '#edf2f7', 1);
    }
    for (var y = padding; y <= height - padding; y += 50) {
      LabUtils.drawLine(ctx, padding, y, width - padding, y, '#edf2f7', 1);
    }

    LabUtils.drawLine(ctx, padding, height - padding, width - padding, height - padding, '#94a3b8', 2);
    LabUtils.drawLine(ctx, padding, padding, padding, height - padding, '#94a3b8', 2);
  }

  function drawRegressionLine() {
    var x1 = 0;
    var x2 = 1;
    var y1 = LabUtils.clamp(w * x1 + b, -0.25, 1.25);
    var y2 = LabUtils.clamp(w * x2 + b, -0.25, 1.25);

    LabUtils.drawLine(ctx, toCanvasX(x1), toCanvasY(y1), toCanvasX(x2), toCanvasY(y2), '#ef4444', 4);
  }

  function drawLossChart() {
    var lossCanvas = document.getElementById('lossCanvas');
    if (!lossCanvas) {
      return;
    }

    var pack = LabUtils.getCanvasAndContext('lossCanvas');
    var lossCtx = pack.ctx;
    var chartWidth = pack.width;
    var chartHeight = pack.height;
    var chartPadding = 18;
    LabUtils.clearCanvas(lossCtx, lossCanvas, '#ffffff');

    LabUtils.drawLine(lossCtx, chartPadding, chartHeight - chartPadding, chartWidth - chartPadding, chartHeight - chartPadding, '#cbd5e1', 1.5);
    LabUtils.drawLine(lossCtx, chartPadding, chartPadding, chartPadding, chartHeight - chartPadding, '#cbd5e1', 1.5);

    if (lossHistory.length < 2) {
      lossCtx.fillStyle = '#64748b';
      lossCtx.font = '12px Microsoft YaHei, Arial';
      lossCtx.fillText('训练后显示曲线', chartPadding + 8, chartHeight / 2);
      return;
    }

    var maxLoss = Math.max.apply(null, lossHistory);
    maxLoss = Math.max(maxLoss, 0.0001);
    lossCtx.beginPath();
    for (var i = 0; i < lossHistory.length; i++) {
      var x = chartPadding + i / (lossHistory.length - 1) * (chartWidth - chartPadding * 2);
      var y = chartHeight - chartPadding - lossHistory[i] / maxLoss * (chartHeight - chartPadding * 2);
      if (i === 0) {
        lossCtx.moveTo(x, y);
      } else {
        lossCtx.lineTo(x, y);
      }
    }
    lossCtx.strokeStyle = '#14b8a6';
    lossCtx.lineWidth = 3;
    lossCtx.stroke();
  }

  window.addEventListener('load', function () {
    setupCanvas();
    updateLearningRateText();
    updateNoiseLevelText();
    updateLoss();
    updateInfo();
    draw();

    document.getElementById('learningRate').addEventListener('input', function () {
      updateLearningRateText();
      LabUtils.updateExplanation('regressionExplanationText', '学习率已调整为 ' + getLearningRate().toFixed(3) + '。');
    });
    document.getElementById('noiseLevel').addEventListener('input', function () {
      updateNoiseLevelText();
      LabUtils.updateExplanation('regressionExplanationText', '数据噪声已调整为 ' + getNoiseLevel().toFixed(2) + '。点击“生成数据”会使用新的噪声。');
    });
    document.getElementById('showErrorLines').addEventListener('change', draw);
    document.getElementById('generateRegressionDataBtn').addEventListener('click', generateData);
    document.getElementById('trainStepBtn').addEventListener('click', trainOneStep);
    document.getElementById('trainManyBtn').addEventListener('click', trainManySteps);
    document.getElementById('autoTrainBtn').addEventListener('click', autoTrain);
    document.getElementById('resetModelBtn').addEventListener('click', resetModel);
    window.addEventListener('resize', draw);
  });
})();
