/* Functions for simulation.
 */

//TODO
  //match = /\s*(\w*)/.exec(document.getElementById('input').value)
  //machine.tape = machine.input = match? match[1] || ''
  //document.getElementById('input').value = machine.input
  //machine.head_pos = 0

function resetSimulation() {
  if (! machine) return;
  sim = {
    state: machine.initial_state,
    tapes: [],
    configurations: []
  }
  for (var i = 0; i < machine.tape_count; i++) {
    sim.tapes.push({
      content: '',
      head_pos: 0
    })
  }
  
  var input = document.getElementById('sim_input').value
  input = input.replace(new RegExp('[^'+machine.alphabet.join()+']', 'g'), '');
  sim.tapes[0].content = input
  // document.getElementById('sim_input').value = input
  
  loadResizedCanvas();
  showTape()
}

function moveTape(pos1, pos2, time_ms, callback, pospx) {
  var BOX_SIZE = +document.getElementById('tape_size_slider').value
    , pos1px = -BOX_SIZE / 2 - (+pos1) * BOX_SIZE
    , pos2px = -BOX_SIZE / 2 - (+pos2) * BOX_SIZE
    , time_step = Math.abs((+time_ms) / ((+pos1px)-(+pos2px)))
    , pos = pospx
    , diff
  
  if (pos == undefined) pos = pos1px
  if (pos1px <= pos2px) diff = 1;
  if (pos1px >= pos2px) diff = -1;
  
  if (diff ==  1 && pos2px <= pos
   || diff == -1 && pos2px >= pos) {
     showTape(pos2px);
     if (callback) callback()
     return
  }
  
  showTape(pos)
  setTimeout("moveTape("+pos1+", "+pos2+", "+time_ms+", "+callback+", "+(pos+diff)+")", time_step);
}
/* Draws the tape into the appropriate canvas.
 * pos_px is optional and gives the position of the tape in pixel
 */
function showTape(pos_px) {
  var width  = tape_canvas.width
    , height = tape_canvas.height
    , BOX_SIZE = +document.getElementById('tape_size_slider').value
    , FONT_SIZE = 16
    , text_dim, tape, ypos = 0, xpos
  
  tape_ccontext.save();
  
  tape_ccontext.clearRect(0, 0, width, height);
  tape_ccontext.strokeStyle = "black"
  tape_ccontext.strokeRect(0, 0, width, height)
  tape_ccontext.translate(width/2, BOX_SIZE)
  
  tape_ccontext.textBaseline = "middle"
  tape_ccontext.font = FONT_SIZE+"pt sans-serif"
  
  // state
  text_dim = tape_ccontext.measureText(sim.state)
  tape_ccontext.fillText(sim.state, -text_dim.width/2, -BOX_SIZE/2)
  
  // draw tapes
  for (var i = 0; i < sim.tapes.length; i++) {
    tape = sim.tapes[i];
    xpos = pos_px? pos_px[i] : (Math.floor((-width/2) / BOX_SIZE)-1) * BOX_SIZE - BOX_SIZE/2
    while (xpos < width/2) {
      tape_ccontext.strokeRect(xpos, ypos, BOX_SIZE, BOX_SIZE)
      xpos += BOX_SIZE
    }
    ypos += BOX_SIZE
  }
  // fill tapes
  ypos = 0
  for (var i = 0; i < sim.tapes.length; i++) {
    tape = sim.tapes[i];
    xpos = pos_px? pos_px[i] : -BOX_SIZE / 2 - tape.head_pos * BOX_SIZE
    for (var j = 0; j < tape.content.length; j++) {
      if (tape.content[j] != machine.blank_symbol) {
        text_dim = tape_ccontext.measureText(tape.content[j])
        tape_ccontext.fillText(tape.content[j],
                               xpos+BOX_SIZE/2 - text_dim.width/2 - 1,
                               ypos+BOX_SIZE/2)
      }
      xpos += BOX_SIZE
    }
    ypos += BOX_SIZE
  }
  
  tape_ccontext.strokeStyle = "red"
  tape_ccontext.strokeRect(-BOX_SIZE/2-1, -3, BOX_SIZE+2, machine.tape_count*BOX_SIZE+7)
  
  tape_ccontext.restore()
}
function loadResizedCanvas() {
  var BOX_SIZE = +document.getElementById('tape_size_slider').value
    , container = document.getElementById('canvas_container')
  container.innerHTML = '<canvas id="tape_canvas" width="500" height="'+((machine.tape_count+1)*BOX_SIZE)+'">Der Browser unterstuetzt kein HTML5!</canvas>'
  tape_ccontext = document.getElementById('tape_canvas').getContext('2d');
  tape_canvas = tape_ccontext.canvas;
}

