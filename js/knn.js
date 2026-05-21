(function () {
  'use strict';

  var samples = [];
  var testPoint = null;
  var canvasPack;
  var canvas;
  var ctx;
  var width;
  var height;
  var redColor = '#ef4444';
  var blueColor = '#2563eb';

  function setupCanvas() {
    canvasPack = LabUtils.getCanvasAndContext('knnCanvas');
    canvas = canvasPack.canvas;
    ctx = canvasPack.ctx;
    width = canvasPack.width;
    height = canvasPack.height;
  }

  function getK() {
    return Number(document.getElementById('knnKValue').value);
  }

  function getSampleCount() {
    return Number(document.getElementById('sampleCount').value);
  }

  function updateKText() {
    LabUtils.setText('knnKValueText', getK());
    LabUtils.setText('currentKText', getK());
  }

  function updateSampleCountText() {
    LabUtils.setText('sampleCountText', getSampleCount());
  }

  function generateSamples() {
    setupCanvas();
    samples = [];
    testPoint = null;

    for (var i = 0; i < getSampleCount(); i++) {
      samples.push({
        x: LabUtils.clamp(width * 0.34 + LabUtils.randomBetween(-115, 85), 24, width - 24),
        y: LabUtils.clamp(height * 0.5 + LabUtils.randomBetween(-145, 125), 24, height - 24),
        label: 'red'
      });
      samples.push({
        x: LabUtils.clamp(width * 0.68 + LabUtils.randomBetween(-85, 115), 24, width - 24),
        y: LabUtils.clamp(height * 0.5 + LabUtils.randomBetween(-125, 145), 24, height - 24),
        label: 'blue'
      });
    }

    updateResult(0, 0, '等待点击', 0);
    LabUtils.updateExplanation('knnExplanationText', '页面已生成两类样本点。请点击画布添加一个待分类点。');
    draw();
  }

  function calculateKnn(x, y) {
    var distances = [];
    var k = getK();

    for (var i = 0; i < samples.length; i++) {
      distances.push({
        point: samples[i],
        distance: LabUtils.distance({ x: x, y: y }, samples[i])
      });
    }

    distances.sort(function (a, b) {
      return a.distance - b.distance;
    });

    var neighbors = distances.slice(0, k).map(function (item) {
      return item.point;
    });

    var redCount = 0;
    var blueCount = 0;
    for (var n = 0; n < neighbors.length; n++) {
      if (neighbors[n].label === 'red') {
        redCount++;
      } else {
        blueCount++;
      }
    }

    var label = redCount >= blueCount ? 'red' : 'blue';
    var confidence = Math.round(Math.max(redCount, blueCount) / k * 100);

    return {
      label: label,
      neighbors: neighbors,
      redCount: redCount,
      blueCount: blueCount,
      confidence: confidence
    };
  }

  function classifyPoint(x, y) {
    var result = calculateKnn(x, y);
    testPoint = {
      x: x,
      y: y,
      label: result.label,
      neighbors: result.neighbors
    };

    updateResult(result.redCount, result.blueCount, result.label === 'red' ? '红色类别' : '蓝色类别', result.confidence);
    LabUtils.updateExplanation('knnExplanationText', '已计算测试点到所有样本点的距离，并选出最近的 ' + getK() + ' 个邻居进行多数投票。');
    draw();
  }

  function updateResult(redCount, blueCount, resultText, confidence) {
    LabUtils.setText('currentKText', getK());
    LabUtils.setText('redCountText', redCount);
    LabUtils.setText('blueCountText', blueCount);
    LabUtils.setText('classificationText', resultText);
    LabUtils.setText('confidenceText', (confidence || 0) + '%');
  }

  function clearTestPoint() {
    testPoint = null;
    updateResult(0, 0, '等待点击', 0);
    LabUtils.updateExplanation('knnExplanationText', '测试点已清除。请再次点击画布进行分类。');
    draw();
  }

  function draw() {
    setupCanvas();
    LabUtils.clearCanvas(ctx, canvas, '#ffffff');

    if (document.getElementById('showDecisionBoundary').checked) {
      drawDecisionBoundary();
    }

    drawGrid();

    if (testPoint && testPoint.neighbors) {
      for (var n = 0; n < testPoint.neighbors.length; n++) {
        LabUtils.drawLine(ctx, testPoint.x, testPoint.y, testPoint.neighbors[n].x, testPoint.neighbors[n].y, '#64748b', 1.5, 0.55);
      }
    }

    for (var i = 0; i < samples.length; i++) {
      var sampleColor = samples[i].label === 'red' ? redColor : blueColor;
      var isNeighbor = isHighlightedNeighbor(samples[i]);
      LabUtils.drawCircle(ctx, samples[i].x, samples[i].y, isNeighbor ? 8.5 : 5.8, sampleColor, isNeighbor ? '#111827' : '#ffffff', isNeighbor ? 3 : 1.5);
    }

    if (testPoint) {
      var testColor = testPoint.label === 'red' ? redColor : blueColor;
      LabUtils.drawCircle(ctx, testPoint.x, testPoint.y, 12, testColor, '#111827', 4);
      ctx.fillStyle = '#111827';
      ctx.font = '800 14px Microsoft YaHei, Arial';
      ctx.fillText('待分类点', testPoint.x + 16, testPoint.y - 14);
    }
  }

  function drawDecisionBoundary() {
    var step = 26;
    for (var x = 0; x < width; x += step) {
      for (var y = 0; y < height; y += step) {
        var result = calculateKnn(x + step / 2, y + step / 2);
        ctx.fillStyle = result.label === 'red' ? 'rgba(239, 68, 68, 0.09)' : 'rgba(37, 99, 235, 0.09)';
        ctx.fillRect(x, y, step, step);
      }
    }
  }

  function isHighlightedNeighbor(sample) {
    if (!testPoint || !testPoint.neighbors) {
      return false;
    }

    for (var i = 0; i < testPoint.neighbors.length; i++) {
      if (testPoint.neighbors[i] === sample) {
        return true;
      }
    }
    return false;
  }

  function drawGrid() {
    for (var x = 40; x < width; x += 40) {
      LabUtils.drawLine(ctx, x, 0, x, height, '#edf2f7', 1);
    }
    for (var y = 40; y < height; y += 40) {
      LabUtils.drawLine(ctx, 0, y, width, y, '#edf2f7', 1);
    }
  }

  function handleCanvasClick(event) {
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    classifyPoint(x, y);
  }

  function handleKChange() {
    updateKText();
    if (testPoint) {
      classifyPoint(testPoint.x, testPoint.y);
    } else {
      LabUtils.updateExplanation('knnExplanationText', '当前 K = ' + getK() + '。点击画布后将使用新的 K 值分类。');
    }
  }

  function handleSampleCountChange() {
    updateSampleCountText();
    generateSamples();
    LabUtils.updateExplanation('knnExplanationText', '每类样本数已调整，并已重新生成样本。点击画布查看新的分类结果。');
  }

  window.addEventListener('load', function () {
    setupCanvas();
    updateKText();
    updateSampleCountText();
    generateSamples();

    document.getElementById('knnKValue').addEventListener('input', handleKChange);
    document.getElementById('sampleCount').addEventListener('input', handleSampleCountChange);
    document.getElementById('showDecisionBoundary').addEventListener('change', draw);
    document.getElementById('regenerateSamplesBtn').addEventListener('click', generateSamples);
    document.getElementById('clearTestBtn').addEventListener('click', clearTestPoint);
    canvas.addEventListener('click', handleCanvasClick);
    window.addEventListener('resize', function () {
      draw();
    });
  });
})();
