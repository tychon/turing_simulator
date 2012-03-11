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
      content: machine.blank_symbol,
      head_pos: 0
    })
  }
  
  var input = document.getElementById('sim_input').value
  input = input.replace(new RegExp('[^'+machine.alphabet.join()+']', 'g'), '');
  if (input.length == '') input = machine.blank_symbol
  sim.tapes[0].content = input
  // document.getElementById('sim_input').value = input
  
  loadResizedCanvas();
  showTapes()
  
  sim.info = 'start'
  var config = copyOfConfiguration()
  sim.configurations.push(config)
  updateInfoField()
}
function loadResizedCanvas() {
  var BOX_SIZE = +document.getElementById('tape_size_slider').value
    , container = document.getElementById('canvas_container')
  container.innerHTML = '<canvas id="tape_canvas" width="500" height="'+((machine.tape_count+1)*(BOX_SIZE+TAPE_DISTANCE)-TAPE_DISTANCE)+'">Der Browser unterstuetzt kein HTML5!</canvas>'
  tape_ccontext = document.getElementById('tape_canvas').getContext('2d');
  tape_canvas = tape_ccontext.canvas;
}

function sim_step(callback) {
  if (sim.info != 'ok' && sim.info != 'start') {
    if (callback) callback()
    return
  }
  sim.info = 'running'
  updateInfoField()
  
  var next = findNextTransition()
    , transition = next? next.transition : null
    , total_time = document.getElementById('speed_slider').value
    , parallel = document.getElementById('parallel_tape_processing').checked
  
  if (next) {
    if (parallel) {
      sim.state = transition.dest
      var oldpos = calculateTapePositions()
        , tape, newpos
      for (var i = 0; i < sim.tapes.length; i++) {
        tape = sim.tapes[i]
        tape.content = setCharAt(tape.content, tape.head_pos, transition.write[i])
        if (transition.move[i] == 'L') {
            if (tape.head_pos == 0) {
              tape.content = machine.blank_symbol+tape.content
              oldpos[i] -= +document.getElementById('tape_size_slider').value
            }
            else tape.head_pos --
          } else if (transition.move[i] == 'R') {
            if (tape.head_pos == tape.content.length-1) tape.content = tape.content+machine.blank_symbol
            tape.head_pos ++
          }
      }
      moveTapes(oldpos, calculateTapePositions(), total_time/2, function() {
        if (sim.state == machine.final_state) sim.info = 'finished'
        else if (sim.info != 'pause') sim.info = 'ok'
        var config = copyOfConfiguration()
        config.lastTrans = next
        sim.configurations.push(config)
        updateInfoField()
        showTapes()
        if (callback) callback()
      })
    } else {
      //TODO support sequencely tape processing
      /*
      sim.state = transition.dest // state
      processTape = function (index, transition) {
        var positions, newpositions
          , tape = sim.tapes[index]
        tape.content = setCharAt(tape.content, tape.head_pos, transition.write[index])
        showTapes()
        setTimeout(function() {
          oldpos = calculateTapePositions()
          
          if (transition.move[index] == 'L') {
            if (tape.head_pos == 0) {
              tape.head_pos ++
              oldpos = calculateTapePositions()
              tape.content = machine.blank_symbol+tape.content
              tape.head_pos --
            }
            else tape.head_pos --
          } else if (transition.move[index] == 'R') {
            if (tape.head_pos == tape.content.length-1) tape.content = tape.content+machine.blank_symbol
            tape.head_pos ++
          }
          
          newpos = calculateTapePositions()
          moveTapes(oldpos, newpos, 500, function() {
            if (index+1 < sim.tapes.length) {
              setTimeout(function(){processTape(index+1, transition)}, 500)
            } else {
              if (sim.state == machine.final_state) sim.info = 'finished'
              else sim.info = 'ok'
              
              updateInfoField()
              showTapes()
              disableGui = false
            }
          })
        }, total_time/2) //TODO
      }
      processTape(0, transition)
      */
    }
  } else {
    sim.info = 'broken'
    sim.infotext = 'No matching transition found'
    updateInfoField()
    showTapes()
    if (callback) callback()
  }
}

function sim_run() {
  //TODO pause
  disableGui()
  document.getElementById('runpause').innerHTML = 'PAUSE'
  sim_step(function() {
    if (sim.info == 'ok') { setTimeout(function(){ sim_run() }, 500) }
    else {
      if (sim.info == 'pause') sim.info = 'ok'
      enableGui()
      document.getElementById('runpause').innerHTML = 'RUN'
    }
  })
}

function updateInfoField() {
  document.getElementById('sim_info').style.color = 'green'
  if (sim.info == 'start') {
    document.getElementById('sim_info').innerHTML = 'ready to start'
  } else {
    document.getElementById('sim_info').innerHTML = sim.info
    if (sim.info == 'broken') {
      document.getElementById('sim_info').style.color = 'red'
    }
  }
  
  if (sim.infotext) document.getElementById('sim_info_text').innerHTML = sim.infotext
  else document.getElementById('sim_info_text').innerHTML = ''
  
  // configuration field
  var configs_field = document.getElementById('configurations')
    , html = '', t
  if (machine.tape_count == 1) {
    sim.configurations.forEach(function(val) {
      t = val.tapes[0]
      html += '<span class="conf">'
      if (t.head_pos > 0) html += t.content.substring(0, t.head_pos)
      html += '<span class="conf_head"><span class="conf_state">'+val.state+'</span>'+t.content.charAt(t.head_pos)+'</span>'
      if (t.head_pos != t.content.length-1) html += t.content.substr(t.head_pos+2)+'</span>'
      html += '<br>\n'
    })
  } else {
    sim.configurations.forEach(function(val) {
      html += '<span style="margin-right:10px">'+JSON.stringify(val)+'</span><br>\n'
    })
  }
  configs_field.innerHTML = html
}
function copyOfConfiguration() {
  copy = {
    info: sim.info,
    infotext: sim.infotext,
    state: sim.state,
    tapes: []
  }
  for (var i = 0; i < sim.tapes.length; i++) {
    copy.tapes.push({
      content: sim.tapes[i].content.substr(0),
      head_pos: sim.tapes[i].head_pos
    })
  }
  return copy
}

/* Calculates the positions in pixels for all tapes and
 * returns them as an array.
 * You CAN give an array with head positions differing from the
 * 'real' positions.
 */
function calculateTapePositions(heads) {
  var pos = []
    , BOX_SIZE = +document.getElementById('tape_size_slider').value
  for (var i = 0; i < sim.tapes.length; i++) {
    if (heads) pos.push(-BOX_SIZE / 2 - heads[i] * BOX_SIZE)
    else pos.push(-BOX_SIZE / 2 - sim.tapes[i].head_pos * BOX_SIZE)
  }
  return pos;
}
var TAPE_DISTANCE = 4
/* Draws the tapes into the appropriate canvas.
 * pos must be an array with the position of the tapes in pixels.
 */
function showTapes(pos) {
  if (pos == undefined) pos = calculateTapePositions()
  
  var FONT_SIZE = 16
    , BOX_SIZE = +document.getElementById('tape_size_slider').value
    , width  = tape_canvas.width
    , height = tape_canvas.height
    , text_dim, tape, shift, xpos, ypos
  
  tape_ccontext.save();
  
  // draw border
  tape_ccontext.clearRect(0, 0, width, height);
  tape_ccontext.strokeStyle = "black"
  tape_ccontext.strokeRect(0, 0, width, height)
  tape_ccontext.translate(width/2, BOX_SIZE)
  // initialise font
  tape_ccontext.textBaseline = "middle"
  tape_ccontext.font = FONT_SIZE+"pt sans-serif"
  
  // draw state
  text_dim = tape_ccontext.measureText(sim.state)
  tape_ccontext.fillText(sim.state, -text_dim.width/2, -BOX_SIZE/2)
  
  // draw tapes (independent from pos, because they fill the whole width)
  ypos = 0
  for (var i = 0; i < sim.tapes.length; i++) {
    tape = sim.tapes[i];
    shift = (pos[i] + BOX_SIZE/2) % BOX_SIZE
    xpos = shift + (Math.floor((-width/2) / BOX_SIZE)-1) * BOX_SIZE - BOX_SIZE/2
    while (xpos < width/2) {
      tape_ccontext.strokeRect(xpos, ypos, BOX_SIZE, BOX_SIZE)
      xpos += BOX_SIZE
    }
    ypos += BOX_SIZE + TAPE_DISTANCE
  }
  
  // fill tapes
  ypos = 0
  for (var i = 0; i < sim.tapes.length; i++) {
    tape = sim.tapes[i]
    xpos = pos[i]
    for (var j = 0; j < tape.content.length; j++) {
      if (tape.content[j] != machine.blank_symbol) {
        text_dim = tape_ccontext.measureText(tape.content[j])
        tape_ccontext.fillText(tape.content[j],
                               xpos+BOX_SIZE/2 - text_dim.width/2 - 1,
                               ypos+BOX_SIZE/2)
      }
      xpos += BOX_SIZE
    }
    ypos += BOX_SIZE + 4
  }
  
  // draw red box markin the heads
  tape_ccontext.strokeStyle = 'red'
  tape_ccontext.strokeRect(-BOX_SIZE/2-1, -3, BOX_SIZE+2, machine.tape_count*(BOX_SIZE+TAPE_DISTANCE)+7)
  
  tape_ccontext.restore()
}
var SIM_MOTION_STEP_MS = 50 // time for one step
/* Move the tapes fluently from pos1 to pos2 in the given time.
 * pos1 are the starting positions and pos2 the end positions as arrays.
 * time_ms gives the time for the whole motions.
 * The callback is called when the motions finished.
 */
function moveTapes(pos1, pos2, time_ms, callback) {
  var step_num = time_ms/SIM_MOTION_STEP_MS // number of steps at all
    , steps = []
    , variation = false
    , tmp
  for (var i = 0; i < pos1.length; i++) {
    tmp = (pos2[i]-pos1[i]) / step_num
    steps.push( (pos2[i]-pos1[i]) / step_num )
    if (tmp != 0) variation = true;
  }
  
  if (variation) _moveTapes(pos1.slice(), pos2, steps, callback)
  else {
    showTapes(pos2);
    if (callback) callback();
  }
}
/* Perform one step of the motion */
function _moveTapes(pos, endpos, steps, callback) {
  // test for end (if one pos reached the end)
  for (var i = 0; i < pos.length; i++) {
    if (steps[i] > 0 && pos[i] >= endpos[i] || steps[i] < 0 && pos[i] <= endpos[i]) {
      showTapes(endpos);
      if (callback) callback();
      return;
    }
  }
  
  // show tapes
  showTapes(pos)
  
  // do one step
  for (var i = 0; i < pos.length; i++) {
    pos[i] += steps[i];
  }
  
  // initiate next step
  setTimeout(function(){_moveTapes(pos, endpos, steps, callback)}, SIM_MOTION_STEP_MS)
}

