(function () {
  'use strict';

  var clusterColors = ['#ef4444', '#2563eb', '#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899'];
  var points = [];
  var clusterCount = 0;
  var scanIndex = 0;
  var autoTimer = null;
  var focusedPoint = null;
  var focusedNeighbors = [];
  var canvasPack;
  var canvas;
  var ctx;
  var width;
  var height;

  function setupCanvas() {
    canvasPack = LabUtils.getCanvasAndContext('dbscanCanvas');
    canvas = canvasPack.canvas;
    ctx = canvasPack.ctx;
    width = canvasPack.width;
    height = canvasPack.height;
  }

  function getEps() {
    return Number(document.getElementById('epsValue').value);
  }

  function getMinPts() {
    return Number(document.getElementById('minPtsValue').value);
  }

  function getPointCount() {
    return Number(document.getElementById('dbscanPointCount').value);
  }

  function updateControlText() {
    LabUtils.setText('epsValueText', getEps());
    LabUtils.setText('minPtsValueText', getMinPts());
    LabUtils.setText('dbscanPointCountText', getPointCount());
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
      LabUtils.setText('dbscanAutoBtn', '自动聚类');
    }
  }

  function generateData() {
    stopAuto();
    setupCanvas();
    points = [];
    clusterCount = 0;
    scanIndex = 0;
    focusedPoint = null;
    focusedNeighbors = [];

    var centers = [
      { x: width * 0.28, y: height * 0.34 },
      { x: width * 0.67, y: height * 0.38 },
      { x: width * 0.48, y: height * 0.72 }
    ];
    var count = getPointCount();
    var denseCount = Math.round(count * 0.82);

    for (var i = 0; i < denseCount; i++) {
      var base = centers[i % centers.length];
      points.push(createPoint(
        LabUtils.clamp(base.x + LabUtils.randomBetween(-58, 58), 18, width - 18),
        LabUtils.clamp(base.y + LabUtils.randomBetween(-48, 48), 18, height - 18)
      ));
    }

    while (points.length < count) {
      points.push(createPoint(
        LabUtils.randomBetween(28, width - 28),
        LabUtils.randomBetween(28, height - 28)
      ));
    }

    updateMetrics();
    LabUtils.updateExplanation('dbscanExplanationText', '已生成包含密集区域和少量离群点的数据。点击“下一步扫描”观察 DBSCAN 如何扩展簇。');
    draw();
  }

  function createPoint(x, y) {
    return {
      x: x,
      y: y,
      visited: false,
      cluster: 0,
      type: '未访问'
    };
  }

  function resetAlgorithm() {
    stopAuto();
    clusterCount = 0;
    scanIndex = 0;
    focusedPoint = null;
    focusedNeighbors = [];
    for (var i = 0; i < points.length; i++) {
      points[i].visited = false;
      points[i].cluster = 0;
      points[i].type = '未访问';
    }
    updateMetrics();
    LabUtils.updateExplanation('dbscanExplanationText', '算法状态已重置，数据点保留。');
    draw();
  }

  function getNeighbors(point) {
    var neighbors = [];
    for (var i = 0; i < points.length; i++) {
      if (LabUtils.distance(point, points[i]) <= getEps()) {
        neighbors.push(points[i]);
      }
    }
    return neighbors;
  }

  function expandCluster(point, neighbors) {
    clusterCount++;
    point.cluster = clusterCount;
    point.type = '核心';

    var queue = neighbors.slice();
    for (var i = 0; i < queue.length; i++) {
      var current = queue[i];

      if (!current.visited) {
        current.visited = true;
        var currentNeighbors = getNeighbors(current);

        if (currentNeighbors.length >= getMinPts()) {
          current.type = '核心';
          for (var n = 0; n < currentNeighbors.length; n++) {
            if (queue.indexOf(currentNeighbors[n]) === -1) {
              queue.push(currentNeighbors[n]);
            }
          }
        } else if (current.type !== '核心') {
          current.type = '边界';
        }
      }

      if (current.cluster <= 0) {
        current.cluster = clusterCount;
        if (current.type !== '核心') {
          current.type = '边界';
        }
      }
    }
  }

  function runStep() {
    if (points.length === 0) {
      generateData();
    }

    for (var i = scanIndex; i < points.length; i++) {
      if (!points[i].visited) {
        scanIndex = i + 1;
        var point = points[i];
        point.visited = true;
        focusedPoint = point;
        focusedNeighbors = getNeighbors(point);

        if (focusedNeighbors.length < getMinPts()) {
          point.cluster = -1;
          point.type = '噪声';
          LabUtils.updateExplanation('dbscanExplanationText', '当前点邻居数量不足，被暂时标记为噪声点。');
        } else {
          expandCluster(point, focusedNeighbors);
          LabUtils.updateExplanation('dbscanExplanationText', '当前点是核心点，算法从它开始扩展出一个密度相连的簇。');
        }

        updateMetrics();
        draw();
        return true;
      }
    }

    focusedPoint = null;
    focusedNeighbors = [];
    LabUtils.updateExplanation('dbscanExplanationText', '扫描完成。DBSCAN 已根据密度发现所有簇，并保留噪声点。');
    draw();
    return false;
  }

  function autoRun() {
    if (autoTimer) {
      stopAuto();
      LabUtils.updateExplanation('dbscanExplanationText', '自动聚类已暂停。');
      return;
    }

    if (points.length === 0) {
      generateData();
    }

    LabUtils.setText('dbscanAutoBtn', '暂停聚类');
    autoTimer = window.setInterval(function () {
      if (!runStep()) {
        stopAuto();
      }
    }, 420);
  }

  function updateMetrics() {
    var core = 0;
    var border = 0;
    var noise = 0;

    for (var i = 0; i < points.length; i++) {
      if (points[i].type === '核心') {
        core++;
      } else if (points[i].type === '边界') {
        border++;
      } else if (points[i].type === '噪声') {
        noise++;
      }
    }

    LabUtils.setText('dbscanClusterText', clusterCount);
    LabUtils.setText('corePointText', core);
    LabUtils.setText('borderPointText', border);
    LabUtils.setText('noisePointText', noise);
  }

  function draw() {
    setupCanvas();
    LabUtils.clearCanvas(ctx, canvas, '#ffffff');
    drawGrid();

    if (focusedPoint) {
      LabUtils.drawCircle(ctx, focusedPoint.x, focusedPoint.y, getEps(), 'rgba(37, 99, 235, 0.08)', '#2563eb', 2, 1);
      for (var n = 0; n < focusedNeighbors.length; n++) {
        LabUtils.drawLine(ctx, focusedPoint.x, focusedPoint.y, focusedNeighbors[n].x, focusedNeighbors[n].y, '#94a3b8', 1, 0.35);
      }
    }

    for (var i = 0; i < points.length; i++) {
      var point = points[i];
      var color = getPointColor(point);
      var radius = point.type === '核心' ? 7.5 : 5.8;
      var stroke = point === focusedPoint ? '#111827' : '#ffffff';
      var strokeWidth = point === focusedPoint ? 4 : 1.5;

      if (point.type === '噪声') {
        stroke = '#111827';
        strokeWidth = 2;
      }
      LabUtils.drawCircle(ctx, point.x, point.y, radius, color, stroke, strokeWidth);
    }
  }

  function getPointColor(point) {
    if (point.cluster > 0) {
      return clusterColors[(point.cluster - 1) % clusterColors.length];
    }
    if (point.cluster === -1) {
      return '#111827';
    }
    return '#94a3b8';
  }

  function drawGrid() {
    for (var x = 40; x < width; x += 40) {
      LabUtils.drawLine(ctx, x, 0, x, height, '#edf2f7', 1);
    }
    for (var y = 40; y < height; y += 40) {
      LabUtils.drawLine(ctx, 0, y, width, y, '#edf2f7', 1);
    }
  }

  window.addEventListener('load', function () {
    setupCanvas();
    updateControlText();
    updateMetrics();
    draw();

    document.getElementById('epsValue').addEventListener('input', function () {
      updateControlText();
      resetAlgorithm();
      LabUtils.updateExplanation('dbscanExplanationText', 'eps 已改变。算法状态已重置，请重新扫描。');
    });
    document.getElementById('minPtsValue').addEventListener('input', function () {
      updateControlText();
      resetAlgorithm();
      LabUtils.updateExplanation('dbscanExplanationText', 'minPts 已改变。算法状态已重置，请重新扫描。');
    });
    document.getElementById('dbscanPointCount').addEventListener('input', function () {
      updateControlText();
      LabUtils.updateExplanation('dbscanExplanationText', '数据点数量已改变。点击“生成数据”会使用新的数量。');
    });
    document.getElementById('dbscanGenerateBtn').addEventListener('click', generateData);
    document.getElementById('dbscanStepBtn').addEventListener('click', runStep);
    document.getElementById('dbscanAutoBtn').addEventListener('click', autoRun);
    document.getElementById('dbscanResetBtn').addEventListener('click', resetAlgorithm);
    window.addEventListener('resize', draw);
  });
})();
