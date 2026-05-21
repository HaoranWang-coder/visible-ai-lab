(function () {
  'use strict';

  var samples = [];
  var testPoint = null;
  var stats = null;
  var canvasPack;
  var canvas;
  var ctx;
  var width;
  var height;

  function setupCanvas() {
    canvasPack = LabUtils.getCanvasAndContext('bayesCanvas');
    canvas = canvasPack.canvas;
    ctx = canvasPack.ctx;
    width = canvasPack.width;
    height = canvasPack.height;
  }

  function getSampleCount() {
    return Number(document.getElementById('bayesSampleCount').value);
  }

  function getSpread() {
    return Number(document.getElementById('bayesSpread').value);
  }

  function updateControlText() {
    LabUtils.setText('bayesSampleCountText', getSampleCount());
    LabUtils.setText('bayesSpreadText', getSpread().toFixed(2));
  }

  function generateSamples() {
    setupCanvas();
    samples = [];
    testPoint = null;

    for (var i = 0; i < getSampleCount(); i++) {
      samples.push(createSample('red', 0.34, 0.42));
      samples.push(createSample('blue', 0.66, 0.58));
    }

    calculateStats();
    updateResult(0, 0, '等待点击');
    LabUtils.updateExplanation('bayesExplanationText', '已根据两类高斯分布生成样本。点击画布后会计算后验概率。');
    draw();
  }

  function createSample(label, centerX, centerY) {
    return {
      x: LabUtils.clamp(centerX + LabUtils.randomBetween(-getSpread(), getSpread()), 0.04, 0.96),
      y: LabUtils.clamp(centerY + LabUtils.randomBetween(-getSpread(), getSpread()), 0.04, 0.96),
      label: label
    };
  }

  function calculateStats() {
    stats = {
      red: buildStats('red'),
      blue: buildStats('blue')
    };
  }

  function buildStats(label) {
    var selected = samples.filter(function (sample) {
      return sample.label === label;
    });
    var meanX = average(selected, 'x');
    var meanY = average(selected, 'y');
    return {
      meanX: meanX,
      meanY: meanY,
      varX: variance(selected, 'x', meanX),
      varY: variance(selected, 'y', meanY),
      prior: selected.length / samples.length
    };
  }

  function average(list, key) {
    var sum = 0;
    for (var i = 0; i < list.length; i++) {
      sum += list[i][key];
    }
    return list.length ? sum / list.length : 0;
  }

  function variance(list, key, mean) {
    var sum = 0;
    for (var i = 0; i < list.length; i++) {
      var diff = list[i][key] - mean;
      sum += diff * diff;
    }
    return Math.max(sum / Math.max(1, list.length), 0.0025);
  }

  function gaussian(value, mean, varianceValue) {
    var diff = value - mean;
    return Math.exp(-(diff * diff) / (2 * varianceValue)) / Math.sqrt(2 * Math.PI * varianceValue);
  }

  function classify(x, y) {
    var redScore = stats.red.prior * gaussian(x, stats.red.meanX, stats.red.varX) * gaussian(y, stats.red.meanY, stats.red.varY);
    var blueScore = stats.blue.prior * gaussian(x, stats.blue.meanX, stats.blue.varX) * gaussian(y, stats.blue.meanY, stats.blue.varY);
    var total = redScore + blueScore || 1;
    var redProb = redScore / total;
    var blueProb = blueScore / total;
    return {
      label: redProb >= blueProb ? 'red' : 'blue',
      redProb: redProb,
      blueProb: blueProb
    };
  }

  function handleCanvasClick(event) {
    var rect = canvas.getBoundingClientRect();
    var x = (event.clientX - rect.left) / rect.width;
    var y = (event.clientY - rect.top) / rect.height;
    var result = classify(x, y);
    testPoint = {
      x: x,
      y: y,
      label: result.label,
      redProb: result.redProb,
      blueProb: result.blueProb
    };
    updateResult(result.redProb, result.blueProb, result.label === 'red' ? '红色类别' : '蓝色类别');
    LabUtils.updateExplanation('bayesExplanationText', '已计算测试点在红类和蓝类下的概率，并选择后验概率更大的类别。');
    draw();
  }

  function updateResult(redProb, blueProb, resultText) {
    LabUtils.setText('bayesRedProbText', Math.round(redProb * 100) + '%');
    LabUtils.setText('bayesBlueProbText', Math.round(blueProb * 100) + '%');
    LabUtils.setText('bayesResultText', resultText);
  }

  function clearTestPoint() {
    testPoint = null;
    updateResult(0, 0, '等待点击');
    LabUtils.updateExplanation('bayesExplanationText', '测试点已清除。点击画布可以重新分类。');
    draw();
  }

  function draw() {
    setupCanvas();
    LabUtils.clearCanvas(ctx, canvas, '#ffffff');

    if (document.getElementById('showBayesBoundary').checked && stats) {
      drawBoundary();
    }

    drawGrid();
    drawStatsMarks();

    for (var i = 0; i < samples.length; i++) {
      var color = samples[i].label === 'red' ? '#ef4444' : '#2563eb';
      LabUtils.drawCircle(ctx, toCanvasX(samples[i].x), toCanvasY(samples[i].y), 5.8, color, '#ffffff', 1.5);
    }

    if (testPoint) {
      var testColor = testPoint.label === 'red' ? '#ef4444' : '#2563eb';
      LabUtils.drawCircle(ctx, toCanvasX(testPoint.x), toCanvasY(testPoint.y), 12, testColor, '#111827', 4);
      ctx.fillStyle = '#111827';
      ctx.font = '800 14px Microsoft YaHei, Arial';
      ctx.fillText('测试点', toCanvasX(testPoint.x) + 16, toCanvasY(testPoint.y) - 14);
    }
  }

  function drawBoundary() {
    var step = 24;
    for (var x = 0; x < width; x += step) {
      for (var y = 0; y < height; y += step) {
        var result = classify((x + step / 2) / width, (y + step / 2) / height);
        var alpha = Math.max(result.redProb, result.blueProb) * 0.16;
        ctx.fillStyle = result.label === 'red' ? 'rgba(239, 68, 68, ' + alpha + ')' : 'rgba(37, 99, 235, ' + alpha + ')';
        ctx.fillRect(x, y, step, step);
      }
    }
  }

  function drawStatsMarks() {
    if (!stats) {
      return;
    }
    LabUtils.drawCircle(ctx, toCanvasX(stats.red.meanX), toCanvasY(stats.red.meanY), 13, '#ef4444', '#111827', 3);
    LabUtils.drawCircle(ctx, toCanvasX(stats.blue.meanX), toCanvasY(stats.blue.meanY), 13, '#2563eb', '#111827', 3);
  }

  function drawGrid() {
    for (var x = 40; x < width; x += 40) {
      LabUtils.drawLine(ctx, x, 0, x, height, '#edf2f7', 1);
    }
    for (var y = 40; y < height; y += 40) {
      LabUtils.drawLine(ctx, 0, y, width, y, '#edf2f7', 1);
    }
  }

  function toCanvasX(x) {
    return x * width;
  }

  function toCanvasY(y) {
    return y * height;
  }

  window.addEventListener('load', function () {
    setupCanvas();
    updateControlText();
    generateSamples();

    document.getElementById('bayesSampleCount').addEventListener('input', function () {
      updateControlText();
      generateSamples();
    });
    document.getElementById('bayesSpread').addEventListener('input', function () {
      updateControlText();
      generateSamples();
    });
    document.getElementById('showBayesBoundary').addEventListener('change', draw);
    document.getElementById('bayesGenerateBtn').addEventListener('click', generateSamples);
    document.getElementById('bayesClearBtn').addEventListener('click', clearTestPoint);
    canvas.addEventListener('click', handleCanvasClick);
    window.addEventListener('resize', draw);
  });
})();
