import d3 from 'd3'

const defaultOptions = {
  padding: 1,
  colorRange: ['#9677FF', '#CFC1FB', '#655E7A', '#765DC7', '#4A3A7A', '#A599C7', '#9475FA', '#FFFFFF'],
  value: node => node.size,
  sort: node => node.ID,
  dataset: [],
  initCirclesDuration: 2000,
}

export default (selector, options = {}) => {
  const $options = Object.assign({}, defaultOptions, options )
  //////////////////////////////////////////////////////////////
  ////////////////// Create Set-up variables  //////////////////
  //////////////////////////////////////////////////////////////
  const domElement = document.querySelector(selector)
  const width = Math.max(domElement.clientWidth, 350) - 20;
  const height = (window.innerWidth < 768 ? width : window.innerHeight - 20);

  const centerX = width / 2;
  const centerY = height / 2;
  //////////////////////////////////////////////////////////////
  /////////////////////// Create SVG  ///////////////////////
  //////////////////////////////////////////////////////////////

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
  const dataContainer = d3.select(detachedContainer);

  //////////////////////////////////////////////////////////////
  /////////////////////// Create Scales  ///////////////////////
  //////////////////////////////////////////////////////////////

  const colorCircle = d3.scale.ordinal().domain([]).range($options.colorRange);

  const diameter = Math.min(width * 0.9, height * 0.9)

  //Dataset to swtich between color of a circle (in the hidden canvas) and the node data
  const colToCircle = {};
  const pack = d3.layout.pack()
    .padding($options.padding)
    .size([diameter, diameter])
    .value($options.value)
    .sort($options.sort);

  //////////////////////////////////////////////////////////////
  ////////////////// Create Circle Packing /////////////////////
  //////////////////////////////////////////////////////////////

  const nodes = pack.nodes($options.dataset);
  const root = $options.dataset;
  const focus = root;

  console.log('NODES COUNT:', nodes.length)

  dataContainer.selectAll('.node')
    .data(nodes)
    .enter().append('circle')
    .attr('id', (d,i) => 'nodeCircle_' + i)
    .attr('class', (d/* , i */) => d.parent ? d.children ? 'node' : 'node node--leaf' : 'node node--root')
    .attr('r', (d) => d.r)
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('fill', (d) => d.children ? colorCircle(d.depth) : 'white');

  //////////////////////////////////////////////////////////////
  ///////////////// Canvas draw function ///////////////////////
  //////////////////////////////////////////////////////////////

  const cWidth = canvas.attr('width');
  const cHeight = canvas.attr('height');
  // const nodeCount = nodes.length;

  //The draw function of the canvas that gets called on each frame
  function drawCanvas(chosenContext, hidden) {

    //Clear canvas
    chosenContext.fillStyle = '#fff';
    chosenContext.rect(0,0,cWidth,cHeight);
    chosenContext.fill();

    const elements = dataContainer.selectAll('.node');
    elements.each(function() {
				const node = d3.select(this);
				//If the hidden canvas was send into this function
				//and it does not yet have a color, generate a unique one
				if(hidden) {
					if(node.attr('color') === null) {
            // If we have never drawn the node to the hidden canvas get a new color for it and put it in the dictionary.
            node.attr('color', genColor());
            colToCircle[node.attr('color')] = node;
					}//if
					// On the hidden canvas each rectangle gets a unique color.
					chosenContext.fillStyle = node.attr('color');
				} else {
					chosenContext.fillStyle = node.attr('fill');
				}//else

				//Draw each circle
				chosenContext.beginPath();
				chosenContext.arc((centerX + +node.attr('cx')), (centerY + +node.attr('cy')), node.attr('r'), 0,  2 * Math.PI, true);
				chosenContext.fill();
				chosenContext.closePath();
    })
  }
  //function drawCanvas

  //////////////////////////////////////////////////////////////
  /////////////////// Mouse functionality //////////////////////
  //////////////////////////////////////////////////////////////

  const canvasDom = document.getElementById('canvas')
  // Listen for clicks on the main canvas
  // canvasDom.addEventListener('click', (e) => {
  //   // We actually only need to draw the hidden canvas when there is an interaction.
  //   // This sketch can draw it on each loop, but that is only for demonstration.
  //   drawCanvas(hiddenContext, true);

  //   const node = getNode(e)
  //   if (focus !== node) zoomToCanvas(node);
  //   else zoomToCanvas(root);
  // });

  // canvasDom.addEventListener('mousemove', (e) => {
  //   // We actually only need to draw the hidden canvas when there is an interaction.
  //   // This sketch can draw it on each loop, but that is only for demonstration.
  //   drawCanvas(hiddenContext, true);

  //   //Figure out where the mouse click occurred.
  //   const node = getNode(e)
  //   if(node) {
  //     const span = document.getElementById('tooltip')
  //     span.innerText = focus !== node ? node.name : ''
  //   }//if
  // });

  //////////////////////////////////////////////////////////////
  ///////////////////// Zoom Function //////////////////////////
  //////////////////////////////////////////////////////////////

  //Based on the generous help by Stephan Smola
  //http://bl.ocks.org/smoli/d7e4f9199c15d71258b5

  const zoomToCanvas = (focusNode) => {
    const focus = focusNode;
    const v = [focus.x, focus.y, focus.r * 2.05]; //The center and width of the new 'viewport'
    const k = diameter / v[2]
    // interpolator = d3.interpolateZoom(vOld, v); //Create interpolation between current and new 'viewport'
    dataContainer.selectAll('.node')
      .transition()
      .duration($options.initCirclesDuration)
      .attr('cx', d => (d.x - v[0]) * k)
      .attr('cy', d => (d.y - v[1]) * k)
      .attr('r', d => d.r * k);
  }

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

  const getCircle = (e) => {
    //Figure out where the mouse click occurred.
    const mouseX = e.layerX;
    const mouseY = e.layerY;

    // Get the corresponding pixel color on the hidden canvas and look up the node in our map.
    // This will return that pixel's color
    const col = hiddenContext.getImageData(mouseX, mouseY, 1, 1).data;
    //Our map uses these rgb strings as keys to nodes.
    const colString = 'rgb(' + col[0] + ',' + col[1] + ','+ col[2] + ')';
    return colToCircle[colString]
  }

  const getNode = (e) => {
    const node = getCircle(e)
    if (node) {
      return dataContainer.selectAll(`#${node.attr('id')}`)[0][0].__data__;
    }
    return null;
  }

  const addEvent = (eventName, callback = () => {}) => {
    canvasDom.addEventListener(eventName, (e) => {
        // We actually only need to draw the hidden canvas when there is an interaction.
      // This sketch can draw it on each loop, but that is only for demonstration.
      drawCanvas(hiddenContext, true);

      //Figure out where the mouse click occurred.
      const node = getNode(e)
      if (node && callback) {
        callback(node, e)
      }
    })
  }

  addEvent('click', (node) => {
    if (focus !== node) zoomToCanvas(node);
    else zoomToCanvas(root);
  })

  addEvent('mousemove', (node) => {
    const span = document.getElementById('tooltip')
    span.innerText = focus !== node ? node.name : ''
  })

  //////////////////////////////////////////////////////////////
  /////////////////////// Initiate /////////////////////////////
  //////////////////////////////////////////////////////////////

  //First zoom to get the circles to the right location
  zoomToCanvas(root);
  const animate = () => {
    drawCanvas(context);
    window.requestAnimationFrame(animate);
  }
  window.requestAnimationFrame(animate);

  return {
    zoomTo: zoomToCanvas,
    zoomReset() {
      zoomToCanvas(root)
    },
    hiddenCanvas,
    canvas: canvasDom,
    getNode,
    getCircle,
    drawCanvas,
    addEvent,
  }
}
