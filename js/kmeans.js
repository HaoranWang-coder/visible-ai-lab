(function () {
  'use strict';

  var colors = ['#ef4444', '#2563eb', '#14b8a6', '#f59e0b', '#8b5cf6'];
  var points = [];
  var centers = [];
  var centerTrails = [];
  var iteration = 0;
  var autoTimer = null;
  var canvasPack;
  var canvas;
  var ctx;
  var width;
  var height;

  function setupCanvas() {
    canvasPack = LabUtils.getCanvasAndContext('kmeansCanvas');
    canvas = canvasPack.canvas;
    ctx = canvasPack.ctx;
    width = canvasPack.width;
    height = canvasPack.height;
  }

  function getK() {
    return Number(document.getElementById('kValue').value);
  }

  function getPointCount() {
    return Number(document.getElementById('pointCount').value);
  }

  function updateKText() {
    LabUtils.setText('kValueText', getK());
  }

  function updatePointCountText() {
    LabUtils.setText('pointCountText', getPointCount());
  }

  function stopAutoRun() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
      LabUtils.setText('autoRunBtn', '自动运行');
    }
  }

  function generateData() {
    stopAutoRun();
    setupCanvas();
    points = [];
    centers = [];
    centerTrails = [];
    iteration = 0;

    var dataCenters = [
      { x: width * 0.25, y: height * 0.32 },
      { x: width * 0.68, y: height * 0.32 },
      { x: width * 0.43, y: height * 0.72 },
      { x: width * 0.78, y: height * 0.72 },
      { x: width * 0.18, y: height * 0.72 }
    ];

    for (var i = 0; i < getPointCount(); i++) {
      var base = dataCenters[i % dataCenters.length];
      points.push({
        x: LabUtils.clamp(base.x + LabUtils.randomBetween(-70, 70), 24, width - 24),
        y: LabUtils.clamp(base.y + LabUtils.randomBetween(-58, 58), 24, height - 24),
        cluster: -1
      });
    }

    updateIteration();
    updateMetrics();
    LabUtils.updateExplanation('explanationText', '已生成随机数据点。下一步请点击“初始化中心”。');
    draw();
  }

  function initializeCenters() {
    stopAutoRun();
    setupCanvas();
    if (points.length === 0) {
      generateData();
    }

    centers = [];
    centerTrails = [];
    var usedIndexes = {};
    var k = getK();

    for (var i = 0; i < k; i++) {
      var index = LabUtils.randomInt(0, points.length - 1);
      while (usedIndexes[index]) {
        index = LabUtils.randomInt(0, points.length - 1);
      }
      usedIndexes[index] = true;
      centers.push({
        x: points[index].x,
        y: points[index].y,
        color: colors[i]
      });
      centerTrails.push([{ x: points[index].x, y: points[index].y }]);
    }

    for (var p = 0; p < points.length; p++) {
      points[p].cluster = -1;
    }

    iteration = 0;
    updateIteration();
    updateMetrics();
    LabUtils.updateExplanation('explanationText', '已初始化聚类中心。中心点用更大的圆点和黑色描边表示。');
    draw();
  }

  function assignPointsToCenters() {
    for (var i = 0; i < points.length; i++) {
      var nearestIndex = 0;
      var nearestDistance = Infinity;

      for (var c = 0; c < centers.length; c++) {
        var currentDistance = LabUtils.distance(points[i], centers[c]);
        if (currentDistance < nearestDistance) {
          nearestDistance = currentDistance;
          nearestIndex = c;
        }
      }

      points[i].cluster = nearestIndex;
    }
  }

  function updateCenters() {
    for (var c = 0; c < centers.length; c++) {
      var count = 0;
      var sumX = 0;
      var sumY = 0;

      for (var i = 0; i < points.length; i++) {
        if (points[i].cluster === c) {
          count++;
          sumX += points[i].x;
          sumY += points[i].y;
        }
      }

      if (count > 0) {
        centers[c].x = sumX / count;
        centers[c].y = sumY / count;
      }
    }
  }

  function recordCenterTrails() {
    for (var i = 0; i < centers.length; i++) {
      if (!centerTrails[i]) {
        centerTrails[i] = [];
      }
      centerTrails[i].push({ x: centers[i].x, y: centers[i].y });
      if (centerTrails[i].length > 14) {
        centerTrails[i].shift();
      }
    }
  }

  function runOneIteration() {
    if (points.length === 0) {
      generateData();
    }

    if (centers.length === 0) {
      initializeCenters();
      return;
    }

    LabUtils.updateExplanation('explanationText', '正在将每个点分配给最近的中心。');
    assignPointsToCenters();
    draw();

    window.setTimeout(function () {
      updateCenters();
      recordCenterTrails();
      iteration++;
      updateIteration();
      updateMetrics();
      LabUtils.updateExplanation('explanationText', '正在更新每个聚类的中心位置。已完成第 ' + iteration + ' 次迭代。');
      draw();
    }, 220);
  }

  function autoRun() {
    if (autoTimer) {
      stopAutoRun();
      LabUtils.updateExplanation('explanationText', '自动运行已暂停。');
      return;
    }

    if (points.length === 0) {
      generateData();
    }
    if (centers.length === 0) {
      initializeCenters();
    }

    LabUtils.setText('autoRunBtn', '暂停运行');
    LabUtils.updateExplanation('explanationText', '自动运行中：算法会连续执行分配与更新。');
    autoTimer = window.setInterval(function () {
      if (iteration >= 12) {
        stopAutoRun();
        LabUtils.updateExplanation('explanationText', '自动运行结束。聚类中心已经基本稳定。');
        return;
      }
      assignPointsToCenters();
      updateCenters();
      recordCenterTrails();
      iteration++;
      updateIteration();
      updateMetrics();
      draw();
    }, 650);
  }

  function reset() {
    stopAutoRun();
    points = [];
    centers = [];
    centerTrails = [];
    iteration = 0;
    updateIteration();
    updateMetrics();
    LabUtils.updateExplanation('explanationText', '已重置。点击“生成数据”重新开始。');
    draw();
  }

  function updateIteration() {
    LabUtils.setText('iterationText', iteration);
  }

  function computeSse() {
    if (points.length === 0 || centers.length === 0) {
      return 0;
    }

    var sse = 0;
    for (var i = 0; i < points.length; i++) {
      if (points[i].cluster >= 0) {
        var d = LabUtils.distance(points[i], centers[points[i].cluster]);
        sse += d * d;
      }
    }
    return sse;
  }

  function updateMetrics() {
    var counts = [];
    for (var c = 0; c < centers.length; c++) {
      counts.push(0);
    }

    for (var i = 0; i < points.length; i++) {
      if (points[i].cluster >= 0 && counts[points[i].cluster] !== undefined) {
        counts[points[i].cluster]++;
      }
    }

    var countText = counts.length ? counts.map(function (count, index) {
      return 'C' + (index + 1) + ':' + count;
    }).join('  ') : '等待运行';

    LabUtils.setText('sseText', computeSse().toFixed(1));
    LabUtils.setText('clusterCountText', countText);
  }

  function draw() {
    setupCanvas();
    LabUtils.clearCanvas(ctx, canvas, '#ffffff');

    drawGrid();

    if (document.getElementById('showKMeansLinks').checked) {
      drawPointLinks();
    }

    drawCenterTrails();

    for (var i = 0; i < points.length; i++) {
      var clusterIndex = points[i].cluster;
      var pointColor = clusterIndex >= 0 ? centers[clusterIndex].color : '#94a3b8';
      LabUtils.drawCircle(ctx, points[i].x, points[i].y, 5.5, pointColor, '#ffffff', 1.5);
    }

    for (var c = 0; c < centers.length; c++) {
      LabUtils.drawCircle(ctx, centers[c].x, centers[c].y, 13, centers[c].color, '#111827', 3);
      ctx.fillStyle = '#111827';
      ctx.font = '700 13px Microsoft YaHei, Arial';
      ctx.fillText('C' + (c + 1), centers[c].x + 16, centers[c].y - 14);
    }
  }

  function drawPointLinks() {
    for (var i = 0; i < points.length; i++) {
      if (points[i].cluster >= 0 && centers[points[i].cluster]) {
        LabUtils.drawLine(ctx, points[i].x, points[i].y, centers[points[i].cluster].x, centers[points[i].cluster].y, '#94a3b8', 1, 0.22);
      }
    }
  }

  function drawCenterTrails() {
    for (var c = 0; c < centerTrails.length; c++) {
      var trail = centerTrails[c];
      for (var i = 1; i < trail.length; i++) {
        LabUtils.drawLine(ctx, trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y, centers[c].color, 2, 0.55);
      }
      for (var j = 0; j < trail.length; j++) {
        LabUtils.drawCircle(ctx, trail[j].x, trail[j].y, 3.2, centers[c].color, null, 0, 0.5);
      }
    }
  }

  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = '#edf2f7';
    ctx.lineWidth = 1;
    for (var x = 40; x < width; x += 40) {
      LabUtils.drawLine(ctx, x, 0, x, height, '#edf2f7', 1);
    }
    for (var y = 40; y < height; y += 40) {
      LabUtils.drawLine(ctx, 0, y, width, y, '#edf2f7', 1);
    }
    ctx.restore();
  }

  function handleKChange() {
    updateKText();
    stopAutoRun();
    centers = [];
    centerTrails = [];
    for (var i = 0; i < points.length; i++) {
      points[i].cluster = -1;
    }
    iteration = 0;
    updateIteration();
    updateMetrics();
    LabUtils.updateExplanation('explanationText', 'K 值已改变。请重新初始化聚类中心。');
    draw();
  }

  function handlePointCountChange() {
    updatePointCountText();
    stopAutoRun();
    LabUtils.updateExplanation('explanationText', '数据点数量已改变。点击“生成数据”会使用新的数量。');
  }

  window.addEventListener('load', function () {
    setupCanvas();
    updateKText();
    updatePointCountText();
    updateIteration();
    updateMetrics();
    draw();

    document.getElementById('kValue').addEventListener('input', handleKChange);
    document.getElementById('pointCount').addEventListener('input', handlePointCountChange);
    document.getElementById('showKMeansLinks').addEventListener('change', draw);
    document.getElementById('generateDataBtn').addEventListener('click', generateData);
    document.getElementById('initCentersBtn').addEventListener('click', initializeCenters);
    document.getElementById('stepBtn').addEventListener('click', runOneIteration);
    document.getElementById('autoRunBtn').addEventListener('click', autoRun);
    document.getElementById('resetBtn').addEventListener('click', reset);
    window.addEventListener('resize', draw);
  });
})();
