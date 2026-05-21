(function () {
  'use strict';

  var samples = [];
  var w1 = 0.15;
  var w2 = -0.1;
  var b = 0;
  var epoch = 0;
  var cursor = 0;
  var lastUpdatedSample = null;
  var autoTimer = null;
  var canvasPack;
  var canvas;
  var ctx;
  var width;
  var height;
  var padding = 44;

  function setupCanvas() {
    canvasPack = LabUtils.getCanvasAndContext('perceptronCanvas');
    canvas = canvasPack.canvas;
    ctx = canvasPack.ctx;
    width = canvasPack.width;
    height = canvasPack.height;
  }

  function getRate() {
    return Number(document.getElementById('perceptronRate').value);
  }

  function getPointCount() {
    return Number(document.getElementById('perceptronPointCount').value);
  }

  function getGap() {
    return Number(document.getElementById('classGap').value);
  }

  function updateControlText() {
    LabUtils.setText('perceptronRateText', getRate().toFixed(2));
    LabUtils.setText('perceptronPointCountText', getPointCount());
    LabUtils.setText('classGapText', getGap().toFixed(2));
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
      LabUtils.setText('perceptronAutoBtn', '自动训练');
    }
  }

  function generateSamples() {
    stopAuto();
    samples = [];
    resetModel(false);

    var half = Math.floor(getPointCount() / 2);
    for (var i = 0; i < half; i++) {
      samples.push(makeSample(1));
      samples.push(makeSample(-1));
    }

    updateMetrics();
    LabUtils.updateExplanation('perceptronExplanationText', '已生成两类线性可分样本。点击“训练一步”观察决策边界如何调整。');
    draw();
  }

  function makeSample(label) {
    var x = LabUtils.randomBetween(-0.88, 0.88);
    var baseY = 0.45 * x - 0.05;
    var offset = getGap() + LabUtils.randomBetween(0.05, 0.42);
    var y = label === 1 ? baseY + offset : baseY - offset;
    y += LabUtils.randomBetween(-0.04, 0.04);
    return {
      x: LabUtils.clamp(x, -0.94, 0.94),
      y: LabUtils.clamp(y, -0.94, 0.94),
      label: label
    };
  }

  function resetModel(shouldDraw) {
    stopAuto();
    w1 = LabUtils.randomBetween(-0.25, 0.25);
    w2 = LabUtils.randomBetween(-0.25, 0.25);
    if (Math.abs(w1) + Math.abs(w2) < 0.08) {
      w1 = 0.12;
      w2 = -0.18;
    }
    b = 0;
    epoch = 0;
    cursor = 0;
    lastUpdatedSample = null;
    updateMetrics();
    LabUtils.updateExplanation('perceptronExplanationText', '模型参数已重置，样本保留。');
    if (shouldDraw !== false) {
      draw();
    }
  }

  function predict(sample) {
    return w1 * sample.x + w2 * sample.y + b >= 0 ? 1 : -1;
  }

  function trainOneStep() {
    if (samples.length === 0) {
      generateSamples();
    }

    for (var checked = 0; checked < samples.length; checked++) {
      var index = (cursor + checked) % samples.length;
      var sample = samples[index];
      if (predict(sample) !== sample.label) {
        w1 += getRate() * sample.label * sample.x;
        w2 += getRate() * sample.label * sample.y;
        b += getRate() * sample.label;
        cursor = (index + 1) % samples.length;
        lastUpdatedSample = sample;
        updateMetrics();
        LabUtils.updateExplanation('perceptronExplanationText', '找到一个分类错误的样本，并按它的真实类别更新 w1、w2 和 b。');
        draw();
        return true;
      }
    }

    epoch++;
    cursor = 0;
    lastUpdatedSample = null;
    updateMetrics();
    LabUtils.updateExplanation('perceptronExplanationText', '这一轮没有发现错误样本，说明当前直线已经能正确分开训练数据。');
    draw();
    return false;
  }

  function trainEpoch() {
    if (samples.length === 0) {
      generateSamples();
    }

    var updates = 0;
    for (var i = 0; i < samples.length; i++) {
      var sample = samples[i];
      if (predict(sample) !== sample.label) {
        w1 += getRate() * sample.label * sample.x;
        w2 += getRate() * sample.label * sample.y;
        b += getRate() * sample.label;
        lastUpdatedSample = sample;
        updates++;
      }
    }
    epoch++;
    cursor = 0;
    updateMetrics();
    LabUtils.updateExplanation('perceptronExplanationText', '已训练一轮，本轮修正了 ' + updates + ' 个错误样本。');
    draw();
  }

  function autoTrain() {
    if (autoTimer) {
      stopAuto();
      LabUtils.updateExplanation('perceptronExplanationText', '自动训练已暂停。');
      return;
    }

    if (samples.length === 0) {
      generateSamples();
    }

    LabUtils.setText('perceptronAutoBtn', '暂停训练');
    autoTimer = window.setInterval(function () {
      var changed = trainOneStep();
      var metrics = getMetrics();
      if (!changed || metrics.mistakes === 0 || epoch >= 40) {
        stopAuto();
      }
    }, 160);
  }

  function getMetrics() {
    var mistakes = 0;
    for (var i = 0; i < samples.length; i++) {
      if (predict(samples[i]) !== samples[i].label) {
        mistakes++;
      }
    }

    var accuracy = samples.length ? Math.round((samples.length - mistakes) / samples.length * 100) : 0;
    return {
      mistakes: mistakes,
      accuracy: accuracy
    };
  }

  function updateMetrics() {
    var metrics = getMetrics();
    LabUtils.setText('w1Text', w1.toFixed(3));
    LabUtils.setText('w2Text', w2.toFixed(3));
    LabUtils.setText('perceptronBText', b.toFixed(3));
    LabUtils.setText('perceptronEpochText', epoch);
    LabUtils.setText('accuracyText', metrics.accuracy + '%');
    LabUtils.setText('mistakeText', metrics.mistakes);
  }

  function toCanvasX(x) {
    return padding + (x + 1) / 2 * (width - padding * 2);
  }

  function toCanvasY(y) {
    return height - padding - (y + 1) / 2 * (height - padding * 2);
  }

  function draw() {
    setupCanvas();
    LabUtils.clearCanvas(ctx, canvas, '#ffffff');
    drawGrid();
    drawDecisionLine();

    for (var i = 0; i < samples.length; i++) {
      var sample = samples[i];
      var color = sample.label === 1 ? '#ef4444' : '#2563eb';
      var wrong = predict(sample) !== sample.label;
      var radius = sample === lastUpdatedSample ? 10 : 6;
      LabUtils.drawCircle(ctx, toCanvasX(sample.x), toCanvasY(sample.y), radius, color, wrong ? '#111827' : '#ffffff', wrong ? 3 : 1.5);
    }
  }

  function drawGrid() {
    for (var x = padding; x <= width - padding; x += 50) {
      LabUtils.drawLine(ctx, x, padding, x, height - padding, '#edf2f7', 1);
    }
    for (var y = padding; y <= height - padding; y += 50) {
      LabUtils.drawLine(ctx, padding, y, width - padding, y, '#edf2f7', 1);
    }
    LabUtils.drawLine(ctx, padding, height / 2, width - padding, height / 2, '#cbd5e1', 1.5);
    LabUtils.drawLine(ctx, width / 2, padding, width / 2, height - padding, '#cbd5e1', 1.5);
  }

  function drawDecisionLine() {
    if (Math.abs(w2) > 0.0001) {
      var x1 = -1;
      var x2 = 1;
      var y1 = -(w1 * x1 + b) / w2;
      var y2 = -(w1 * x2 + b) / w2;
      LabUtils.drawLine(ctx, toCanvasX(x1), toCanvasY(y1), toCanvasX(x2), toCanvasY(y2), '#111827', 4);
    } else if (Math.abs(w1) > 0.0001) {
      var x = -b / w1;
      LabUtils.drawLine(ctx, toCanvasX(x), padding, toCanvasX(x), height - padding, '#111827', 4);
    }
  }

  window.addEventListener('load', function () {
    setupCanvas();
    updateControlText();
    updateMetrics();
    draw();

    document.getElementById('perceptronRate').addEventListener('input', function () {
      updateControlText();
      LabUtils.updateExplanation('perceptronExplanationText', '学习率已调整，下一次训练会使用新的步长。');
    });
    document.getElementById('perceptronPointCount').addEventListener('input', function () {
      updateControlText();
      LabUtils.updateExplanation('perceptronExplanationText', '样本数量已调整。点击“生成样本”会使用新的数量。');
    });
    document.getElementById('classGap').addEventListener('input', function () {
      updateControlText();
      LabUtils.updateExplanation('perceptronExplanationText', '类别间隔已调整。点击“生成样本”会生成新的分布。');
    });
    document.getElementById('perceptronGenerateBtn').addEventListener('click', generateSamples);
    document.getElementById('perceptronTrainStepBtn').addEventListener('click', trainOneStep);
    document.getElementById('perceptronTrainEpochBtn').addEventListener('click', trainEpoch);
    document.getElementById('perceptronAutoBtn').addEventListener('click', autoTrain);
    document.getElementById('perceptronResetBtn').addEventListener('click', resetModel);
    window.addEventListener('resize', draw);
  });
})();
