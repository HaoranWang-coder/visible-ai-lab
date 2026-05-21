(function () {
  'use strict';

  function getCanvasAndContext(canvasId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) {
      throw new Error('找不到画布：' + canvasId);
    }

    var rect = canvas.getBoundingClientRect();
    var width = rect.width || canvas.width || 760;
    var height = rect.height || canvas.height || 520;
    var ratio = window.devicePixelRatio || 1;

    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }

    var ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    canvas.logicalWidth = width;
    canvas.logicalHeight = height;

    return {
      canvas: canvas,
      ctx: ctx,
      width: width,
      height: height
    };
  }

  function clearCanvas(ctx, canvas, color) {
    var width = canvas.logicalWidth || canvas.width;
    var height = canvas.logicalHeight || canvas.height;
    ctx.clearRect(0, 0, width, height);
    if (color) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function drawCircle(ctx, x, y, radius, fillColor, strokeColor, strokeWidth, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    if (strokeColor && strokeWidth) {
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLine(ctx, x1, y1, x2, y2, color, width, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = width || 1;
    ctx.strokeStyle = color || '#111827';
    ctx.stroke();
    ctx.restore();
  }

  function distance(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randomInt(min, max) {
    return Math.floor(randomBetween(min, max + 1));
  }

  function updateExplanation(elementId, message) {
    var element = document.getElementById(elementId);
    if (element) {
      element.textContent = message;
    }
  }

  function setText(elementId, value) {
    var element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  window.LabUtils = {
    getCanvasAndContext: getCanvasAndContext,
    clearCanvas: clearCanvas,
    drawCircle: drawCircle,
    drawLine: drawLine,
    distance: distance,
    randomBetween: randomBetween,
    randomInt: randomInt,
    updateExplanation: updateExplanation,
    setText: setText,
    clamp: clamp
  };
})();
