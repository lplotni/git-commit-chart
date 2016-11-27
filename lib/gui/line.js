var blessed = require('blessed')
   , Node = blessed.Node
   , Canvas = require('./canvas');

function getColorCode(color) {
  if (Array.isArray(color) && color.length == 3) {
    return x256(color[0],color[1],color[2]);
  } else {
    return color;
  }
}

function Line(options) {

  var self = this

  if (!(this instanceof Node)) {
    return new Line(options);
  }

  Canvas.call(this, options);
}

Line.prototype.calcSize = function() {
    this.canvasSize = {width: this.width*2-12, height: this.height*4-8}
}

Line.prototype.__proto__ = Canvas.prototype;

Line.prototype.type = 'line';

Line.prototype.setData = function(data) {

    if (!this.ctx) {
      throw "error: canvas context does not exist. setData() for line charts must be called after the chart has been added to the screen via screen.append()"
    }

    //compatability with older api
    if (!Array.isArray(data)) data = [data]

    var self = this
    var xLabelPadding = 5;
    var yLabelPadding = 3
    var xPadding = 10;
    var yPadding = 11
    var c = this.ctx
    var labels = data[0].x

    function addLegend() {
      if (!self.options.showLegend) return
      if (self.legend) self.remove(self.legend)
      var legendWidth = 15
      self.legend = blessed.box({
            height: data.length+2,
            top: 1,
            width: legendWidth,
            left: self.width-legendWidth-3,
            content: '',
            fg: "green",
            tags: true,
            border: {
              type: 'line',
              fg: 'black'
            },
            style: {
              fg: 'blue',
            },
            screen: self.screen
          });

      var legandText = ""
      var maxChars = legendWidth-2
      for (var i=0; i<data.length; i++) {
        var style = data[i].style || {}
        var color = getColorCode(style.line || 'yellow')
        legandText += '{'+color+'-fg}'+ data[i].title.substring(0, maxChars)+'{/'+color+'-fg}\r\n'
      }
      self.legend.setContent(legandText)
      self.append(self.legend)
    }

    function getMaxY() {

      var max = 0;
      var setMax = [];

      for(var i = 0; i < data.length; i++) {
        if (data[i].y.length)
          setMax[i] = Math.max(...data[i].y);

        for(var j = 0; j < data[i].y.length; j++) {
          if(data[i].y[j] > max) {
            max = data[i].y[j];
          }
        }
      }

      var m = Math.max(...setMax);

      max = m*1.2;
      max*=1.2
      if (self.options.maxY) {
        return Math.max(max, self.options.maxY)
      }

      return max;
    }

    function formatYLabel(value, max, min, numLabels, wholeNumbersOnly, abbreviate) {
      var fixed = (max/numLabels<1 && value!=0 && !wholeNumbersOnly) ? 2 : 0
      var res = value.toFixed(fixed)
      return res
    }

    function getMaxXLabelPadding(numLabels, wholeNumbersOnly, abbreviate, min) {
      var max = getMaxY()

      return formatYLabel(max, max, min, numLabels, wholeNumbersOnly, abbreviate).length * 2;
    }

    var maxPadding = getMaxXLabelPadding(5, true, this.options.abbreviate, 0)
    if (xLabelPadding < maxPadding) {
      xLabelPadding = maxPadding;
    };

    if ((xPadding - xLabelPadding) < 0) {
      xPadding = xLabelPadding;
    }

    function getMaxX() {
      var maxLength = 0;

      for(var i = 0; i < labels.length; i++) {
        if(labels[i] === undefined) {
          console.log("label[" + i + "] is undefined");
        } else if(labels[i].length > maxLength) {
          maxLength = labels[i].length;
        }
      }

      return maxLength;
    }

    function getXPixel(val) {
        return ((self.canvasSize.width - xPadding) / labels.length) * val + (xPadding * 1.0) + 2;
    }

    function getYPixel(val, minY) {
        var res = self.canvasSize.height - yPadding - (((self.canvasSize.height - yPadding) / (getMaxY()-minY)) * (val-minY));
        res-=2 //to separate the baseline and the data line to separate chars so canvas will show separate colors
        return res
    }

    // Draw the line graph
    function drawLine(values, style, minY) {
      style = style || {}
      var color = 'yellow';
      c.strokeStyle = style.line || color

      c.moveTo(0, 0)
      c.beginPath();
      c.lineTo(getXPixel(0), getYPixel(values[0], minY));

      for(var k = 1; k < values.length; k++) {
          c.lineTo(getXPixel(k), getYPixel(values[k], minY));
      }

      c.stroke();
    }

    addLegend()

    c.fillStyle = 'green';

    c.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);


    var yLabelIncrement = getMaxY()/5;
    if (true) yLabelIncrement = Math.floor(yLabelIncrement)
    //if (getMaxY()>=10) {
    //  yLabelIncrement = yLabelIncrement + (10 - yLabelIncrement % 10)
    //}

    //yLabelIncrement = Math.max(yLabelIncrement, 1) // should not be zero

    if (yLabelIncrement==0) yLabelIncrement = 1

    // Draw the Y value texts
    var maxY = getMaxY()
    for(var i = 0; i < maxY; i += yLabelIncrement) {
        c.fillText(formatYLabel(i, maxY, 0, 5, true, this.options.abbreviate), xPadding - xLabelPadding, getYPixel(i, 0));
    }

    for (var h=0; h<data.length; h++) {
      drawLine(data[h].y, data[h].style, 0)
    }


    c.strokeStyle = 'white';

    // Draw the axises
    c.beginPath();

    c.lineTo(xPadding, 0);
    c.lineTo(xPadding, this.canvasSize.height - yPadding);
    c.lineTo(this.canvasSize.width, this.canvasSize.height - yPadding);

    c.stroke();

    // Draw the X value texts
    var charsAvailable = (this.canvasSize.width - xPadding) / 2;
    var maxLabelsPossible = charsAvailable / (getMaxX() + 2);
    var pointsPerMaxLabel = Math.ceil(data[0].y.length / maxLabelsPossible);
    var showNthLabel = 1;
    if (showNthLabel < pointsPerMaxLabel) {
      showNthLabel = pointsPerMaxLabel;
    }

    for(var i = 0; i < labels.length; i += showNthLabel) {
      if((getXPixel(i) + (labels[i].length * 2)) <= this.canvasSize.width) {
        c.fillText(labels[i], getXPixel(i), this.canvasSize.height - yPadding + yLabelPadding);
      }
    }

}

Line.prototype.getOptionsPrototype = function() {
  return { width: 80
         , height: 30
         , left: 15
         , top: 12
         , xPadding: 5
         , label: 'Title'
         , showLegend: true
         , legend: {width: 12}
         , data: [ { title: 'us-east',
                   x: ['t1', 't2', 't3', 't4'],
                   y: [5, 1, 7, 5],
                   style: {
                    line: 'red'
                   }
                 }
               , { title: 'us-west',
                   x: ['t1', 't2', 't3', 't4'],
                   y: [2, 4, 9, 8],
                   style: {line: 'yellow'}
                 }
                , {title: 'eu-north-with-some-long-string',
                   x: ['t1', 't2', 't3', 't4'],
                   y: [22, 7, 12, 1],
                   style: {line: 'blue'}
                 }]

         }
}

module.exports = Line