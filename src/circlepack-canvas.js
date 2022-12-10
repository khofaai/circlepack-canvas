import d3 from 'd3'

const defaultOptions = {
  padding: 1,
  colorRange: ['#bfbfbf','#838383','#4c4c4c','#1c1c1c'],
  value: (d) => d.size,
  sort: (d) => d.ID,
  dataset: []
}

export default (selector, options = {}) => {
  const $options = Object.assign({}, defaultOptions, options )
  const domElement = document.querySelector(selector)
  const width = Math.max(domElement.clientWidth, 350) - 20;
  const height = (window.innerWidth < 768 ? width : window.innerHeight - 20);

  const centerX = width / 2;
  const centerY = height / 2;

  //Create the visible canvas and context
  const canvas  = d3.select(selector).append('canvas')
                    .attr('id', 'canvas')
                    .attr('width', width)
                    .attr('height', height);

  const context = canvas.node().getContext('2d');
  context.clearRect(0, 0, width, height);

  //Create a hidden canvas in which each circle will have a different color
  //We can use this to capture the clicked on circle
  const hiddenCanvas  = d3.select(selector).append('canvas')
    .attr('id', 'hiddenCanvas')
    .attr('width', width)
    .attr('height', height)
    .style('display','none');
  const hiddenContext = hiddenCanvas.node().getContext('2d');
  hiddenContext.clearRect(0, 0, width, height);

  //Create a custom element, that will not be attached to the DOM, to which we can bind the data
  const detachedContainer = document.createElement('custom');
  d3.select(detachedContainer);

  const colorCircle = d3.scale.ordinal().domain([]).range($options.colorRange);

  const diameter = Math.min(width*0.9, height*0.9)

  const zoomInfo = {
    centerX: width / 2,
    centerY: height / 2,
    scale: 1
  };

  //Dataset to swtich between color of a circle (in the hidden canvas) and the node data
  const colToCircle = {};

  const pack = d3.layout.pack()
    .padding($options.padding)
    .size([diameter, diameter])
    .value($options.value)
    .sort($options.sort);

  const nodes = pack.nodes($options.dataset),
    root = $options.dataset,
    focus = root;

  const cWidth = canvas.attr('width');
  const cHeight = canvas.attr('height');
  const nodeCount = nodes.length;

  const getNodeColor = (node) => {
    // hiddenContext.fillStyle = grd;
    // hiddenContext.fillRect(20, 20, 150, 100);
    if (node.highlight) return node.highlight
    return node.children ? colorCircle(node.depth) : 'white';
  }

  //The draw function of the canvas that gets called on each frame
  function drawCanvas(chosenContext, hidden) {

    //Clear canvas
    chosenContext.fillStyle = '#fff';
    chosenContext.rect(0,0,cWidth,cHeight);
    chosenContext.fill();

    //Select our dummy nodes and draw the data to canvas.
    var node = null;
    // It's slightly faster than nodes.forEach()
    for (var i = 0; i < nodeCount; i++) {
      node = nodes[i];

      //If the hidden canvas was send into this function and it does not yet have a color, generate a unique one
      if(hidden) {
        if(node.color == null) {
          // If we have never drawn the node to the hidden canvas get a new color for it and put it in the dictionary.
          node._id = i + 1
          node.color = genColor();
          colToCircle[node.color] = node;
        }//if
        // On the hidden canvas each rectangle gets a unique color.
        chosenContext.fillStyle = node.color;
      } else {
        chosenContext.fillStyle = getNodeColor(node)
      }//else

      //Draw each circle
      chosenContext.beginPath();
      chosenContext.arc(((node.x - zoomInfo.centerX) * zoomInfo.scale) + centerX,
                ((node.y - zoomInfo.centerY) * zoomInfo.scale) + centerY,
                node.r * zoomInfo.scale, 0,  2 * Math.PI, true);
      chosenContext.fill();

    }//for i

  }
  //function drawCanvas

  const canvasDom = document.getElementById('canvas')
  // Listen for clicks on the main canvas
  canvasDom.addEventListener('click', (e) => {
    // We actually only need to draw the hidden canvas when there is an interaction.
    // This sketch can draw it on each loop, but that is only for demonstration.
    drawCanvas(hiddenContext, true);

    //Figure out where the mouse click occurred.
    const node = getNode(e)

    if(node) {
      if (focus !== node) zoomToCanvas(node); else zoomToCanvas(root);
    } else {
      zoomToCanvas(root);
    }
  });

  canvasDom.addEventListener('mousemove', (e) => {
    // We actually only need to draw the hidden canvas when there is an interaction.
    // This sketch can draw it on each loop, but that is only for demonstration.
    drawCanvas(hiddenContext, true);

    //Figure out where the mouse click occurred.
    const node = getNode(e)

    for (var i = 0; i < nodeCount; i++) {
      const _node = nodes[i];
      _node.highlight = null
    }
    const span = document.getElementById('tooltip')
    if(node) {
      node.highlight = '#f00'
      if (node.name !== '') {
        span.style.display = 'block'
        span.style.left = (e.layerX - 20) + 'px'
        span.style.top = (e.layerY - 50) + 'px'
      }
      if (focus !== node) {
        span.innerText = node.name
      } else {
        span.innerText = ''
        span.style.display = 'none'
      }
    } else {
      span.style.display = 'none'
    }
  });

  //Based on the generous help by Stephan Smola
  //http://bl.ocks.org/smoli/d7e4f9199c15d71258b5

  const ease = d3.ease('cubic-in-out');
  let duration = 2000;
  let timeElapsed = 0;
  let interpolator = null;
  let vOld = [focus.x, focus.y, focus.r * 2.05];

  //Create the interpolation function between current view and the clicked on node
  const zoomToCanvas = (focusNode) => {
    const focus = focusNode;
    const v = [focus.x, focus.y, focus.r * 2.05]; //The center and width of the new 'viewport'

    interpolator = d3.interpolateZoom(vOld, v); //Create interpolation between current and new 'viewport'

    duration = 	interpolator.duration; //Interpolation gives back a suggested duration
    timeElapsed = 0; //Set the time elapsed for the interpolateZoom function to 0
    vOld = v; //Save the 'viewport' of the next state as the next 'old' state
  }
  //function zoomToCanvas

  //Perform the interpolation and continuously change the zoomInfo while the 'transition' occurs
  const interpolateZoom = (dt) => {
    if (interpolator) {
      timeElapsed += dt;
      const t = ease(timeElapsed / duration);

      zoomInfo.centerX = interpolator(t)[0];
      zoomInfo.centerY = interpolator(t)[1];
      zoomInfo.scale = diameter / interpolator(t)[2];

      if (timeElapsed >= duration) interpolator = null;
    }//if
  }//function zoomToCanvas

  //Generates the next color in the sequence, going from 0,0,0 to 255,255,255.
  //From: https://bocoup.com/weblog/2d-picking-in-canvas
  let nextCol = 1;
  const genColor = () => {
    const ret = [];
    // via http://stackoverflow.com/a/15804183
    if(nextCol < 16777215){
      ret.push(nextCol & 0xff); // R
      ret.push((nextCol & 0xff00) >> 8); // G
      ret.push((nextCol & 0xff0000) >> 16); // B

      nextCol += 100; // This is exagerated for this example and would ordinarily be 1.
    }
    const col = 'rgb(' + ret.join(',') + ')';
    return col;
  }
  //function genColor

  const getNode = (e) => {
    const mouseX = e.layerX;
    const mouseY = e.layerY;

    // Get the corresponding pixel color on the hidden canvas and look up the node in our map.
    // This will return that pixel's color
    const col = hiddenContext.getImageData(mouseX, mouseY, 1, 1).data;
    //Our map uses these rgb strings as keys to nodes.
    const colString = 'rgb(' + col[0] + ',' + col[1] + ','+ col[2] + ')';
    return colToCircle[colString];
  }

  //First zoom to get the circles to the right location
  zoomToCanvas(root);

  let dt = 0;
  d3.timer((elapsed) => {
    // stats.begin();
    interpolateZoom(elapsed - dt);
    dt = elapsed;
    // stats.end();
    drawCanvas(context);
  });
  drawCanvas(hiddenContext, true);


  return {
    zoomTo: zoomToCanvas,
    canvas: canvasDom,
    getNode
  }
}