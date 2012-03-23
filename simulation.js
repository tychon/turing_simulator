/* Functions for simulation.
sim = {
  input : ([string]) // input given by user with symbols not in the alphabet filtered out
  info : (string)
    // "start"     the machine is ready to start
    // "ok"        the machine reached a consistent state that is not 
    // "running"   a step is performed
    // "pause"     the running simulation is asked to pause and switch to "ok" / "finished"
    // "finished"  when the tm reached qf
    // "loop"      if the simulator found a loop, no more steps required
    // "broken"    something went wrong, e.g. missing transitions
  infotext : (string) // additional information
  state : (string)    // state of the machine
  steps : (int)       // number of steps since last reset
  max_storage_occupancy : (int) = max( configurations.storage_occupancy )
  tapes : [{          // configuration
    head_pos : (int)  // the current head_pos relateive to beginning of 'content'
    content : ([string])  // the symbols on the tape
    diff : (int)      // the current head_pos relative to the beginning
    max_diff : (int)  // the maximum diff
    min_diff : (int)  // the minimum diff
  }]
  min_diff : (int) // this minimum head pos, used for checking for linear bounded restriction
  max_diff : (int) // the maximum head pos, used for checking for linear bounded restriction
  configurations : [{
    info, infotext, state : (string)
    steps : (int)
    tapes : [{
      head_pos : (int)
      content : ([string])
      max_storage_occupancy : (int) = max_diff-min_diff+1
    }]
    lastTrans : (object) // last transition or undefined if this is the first configuration
    max_storage_occupancy : (int) = max ( tpes.storage_occupancy )
  }] // list of configurations passed in the current run
}
 */

function resetSimulation() {
  if (! machine) return // no compiled machine, should not occurr
  
  sim = {
    info: 'start',
    infotext: '',
    state: machine.initial_state,
    steps: 0,
    max_storage_occupancy: 1,
    tapes: [],
    min_diff: 0,
    max_diff: 0,
    configurations: []
  }
  
  // prepare tapes
  for (var i = 0; i < machine.tape_count; i++) {
    sim.tapes.push({
      content: machine.blank_symbol,
      head_pos: 0,
      diff: 0,
      max_diff: 0,
      min_diff: 0
    })
  }
  
  // load input
  var input = document.getElementById('sim_input').value
    , filtered = []
  if (machine.multi_character_symbols) {
    document.getElementById('multi_char_symbols_tip').style.display = 'inline'
    var symbols = input.split(/\s+/)
    symbols.forEach(function (sym) {
      if (machine.alphabet.indexOf(sym) != -1) filtered.push(sym)
    })
  } else {
    document.getElementById('multi_char_symbols_tip').style.display = 'none'
    input = input.replace(new RegExp('[^'+machine.alphabet.join('')+']', 'g'), '')
    for (var i = 0; i < input.length; i++)
      if (machine.alphabet.indexOf(input[i]) != -1) filtered.push(input[i])
  }
  if (filtered.length == '') filtered = [machine.blank_symbol]
  sim.input = filtered
  sim.tapes[0].content = filtered
  
  // update gui
  loadResizedCanvas();
  showTapes()
  
  sim.info = 'start'
  sim.configurations.push(generateConfiguration())
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
    , total_time = sim_speed()
    , parallel = document.getElementById('parallel_tape_processing').checked
  
  if (next) {
    sim.steps ++
    
    if (parallel) {
      sim.state = transition.dest
      var oldpos = calculateTapePositions()
        , box_size = +document.getElementById('tape_size_slider').value
        , tape, newpos
      sim.tapes.forEach(function(tape, i) {
        //TODO handle type: multi-track
        
        // INFO:
        // shift: remove first element
        // unshift: add elements in the beginning
        // pop: remove last element
        // push: append elements at the end
        
        tape = sim.tapes[i]
        tape.content[tape.head_pos] = transition.write[i]
        if (transition.move[i] == 'L') {
          if (tape.head_pos == 0) {
            if (tape.content.length > 1 || tape.content[0] != machine.blank_symbol)
              tape.content.unshift(machine.blank_symbol)
            
            oldpos[i] -= box_size
          } else {
            if (tape.head_pos == tape.content.length-1 && tape.content[tape.head_pos] == machine.blank_symbol) {
             // shorten tape if it ends with blanks
             if (tape.content.length > 1) {
               tape.content.pop()
               tape.head_pos --
             } else ; // tape is empty
            } else tape.head_pos --
          }
          
          tape.diff --
          if (tape.diff < tape.min_diff) tape.min_diff = tape.diff
        } else if (transition.move[i] == 'R') {
          if (tape.head_pos == 0 && tape.content[0] == machine.blank_symbol) {
            // shorten tape if it begins with blanks
            if (tape.content.length > 1) tape.content.shift()
            else ; // tape is empty
            oldpos[i] += box_size
          } else {
            if (tape.head_pos == tape.content.length-1)
              tape.content.push(machine.blank_symbol)
            tape.head_pos ++
          }
          
          tape.diff ++
          if (tape.diff > tape.max_diff) tape.max_diff = tape.diff
        }
        
        if (tape.min_diff < sim.min_diff) sim.min_diff = tape.min_diff
        if (tape.max_diff > sim.max_diff) sim.max_diff = tape.max_diff
      })
      moveTapes(oldpos, calculateTapePositions(), total_time/2, function() {
        var config = generateConfiguration(next)
        sim.configurations.push(config)
        if (config.max_storage_occupancy > sim.max_storage_occupancy)
          sim.max_storage_occupancy = config.max_storage_occupancy
        
        // look for loops
        var loopIndex = checkForLoop()
        if (loopIndex >= 0) {
          // loop found
          sim.info = 'loop'
          if (machine.purpose == 'decider') {
            sim.infotext = '<span class="sim_undef_result; font-size: small">A decider must not loop!</span>'
          } else if (machine.purpose == 'acceptor') {
            sim.infotext = '<span class="sim_rejected">word rejected</span>'
          } else if (machine.purpose == 'calculator') {
            sim.infotext = '<span class="sim_undef_result; font-size: small">A calculator must not loop!</span>'
          }
        } else {
          // check restriction: linear bounded
          if (machine.linear_bounded && (sim.min_diff < -1 || sim.max_diff > sim.input.length)) {
            // ! restriction violated
            sim.info = 'broken'
            sim.infotext = 'Restriction violated:<br><span class="sim_undef_result; font-size: small">Doesn\'t work in linear bounded space!</span>'
          } else { // restriction not violated
            if (sim.state == machine.final_state) {
              sim.info = 'finished'
              if (machine.purpose == 'decider') {
                // halts with 1 or 0
                if (sim.tapes[0].content[sim.tapes[0].head_pos] == '1') sim.infotext = '<span class="sim_accepted">word accepted</span>'
                else if (sim.tapes[0].content[sim.tapes[0].head_pos] == '0') sim.infotext = '<span class="sim_rejected">word rejected</span>'
                else sim.infotext = '<span class="sim_undef_result; font-size: small">A decider must halt with 1 or 0</span>'
              } else if (machine.purpose == 'acceptor') {
                // halt or loop
                sim.infotext = '<span class="sim_accepted">word accepted</span>'
              } else if (machine.purpose == 'calculator') {
                // calculate a partial function
                // everything right of the head is the result
                sim.infotext = 'result: <span class="sim_calculated">'+sim.tapes[0].content.slice(sim.tapes[0].head_pos).join(machine.multi_character_symbols? ' ' : '')+'</span>'
              }
            } else if (sim.info != 'pause') {
              sim.info = 'ok'
            }
          }
        }
        
        updateInfoField()
        showTapes() // 
        if (callback) callback() // ! step finished !
      })
    } else {
      // TODO? process tapes sequencially
    }
  } else {
    sim.info = 'broken'
    sim.infotext = 'No matching transition found'
    updateInfoField()
    showTapes()
    if (callback) callback() // ! step finished !
  }
}
function sim_run() {
  disableGui()
  document.getElementById('runpause').innerHTML = 'PAUSE'
  sim_step(function() {
    if (sim.info == 'ok') { setTimeout(function(){ sim_run() }, sim_speed()/2) }
    else {
      if (sim.info == 'pause') sim.info = 'ok'
      enableGui()
      document.getElementById('runpause').innerHTML = 'RUN'
    }
  })
}

/* Returns the speed to use for simulation.
 */
function sim_speed() {
  var speed = document.getElementById('speed_slider').value
  if (speed < 50) return 50;
  else return speed;
}

function updateInfoField() {
  // sim status
  document.getElementById('sim_status').style.color = 'green'
  if (sim.info == 'start') {
    document.getElementById('sim_status').innerHTML = 'ready to start'
  } else {
    document.getElementById('sim_status').innerHTML = sim.info
    if (sim.info == 'broken') {
      document.getElementById('sim_status').style.color = 'red'
    } else if (sim.info == 'loop') {
      document.getElementById('sim_status').style.color = 'blue'
    }
  }
  
  if (sim.infotext) document.getElementById('sim_info_text').innerHTML = sim.infotext
  else document.getElementById('sim_info_text').innerHTML = ''
  
  // short sim info 
  document.getElementById('sim_info').innerHTML = 'Steps: <strong>'+sim.steps+'</strong><br>'
      + 'Max storage occupancy: '+sim.max_storage_occupancy+'*'+machine.tape_count+' = <strong>'+(sim.max_storage_occupancy*machine.tape_count)+'</strong><br>'
  
  // configuration field
  var configs_field = document.getElementById('configurations')
    , html = '', t
  if (machine.tape_count == 1) {
    sim.configurations.forEach(function(val) {
      t = val.tapes[0]
      if (val.lastTrans) {
        html += ' <span class="conf_trans">-('
        html += val.lastTrans.index
        html += ')&#062;</span>'
      }
      html += ' <span class="conf">'
      if (t.head_pos > 0) html += t.content.slice(0, t.head_pos).join(machine.multi_character_symbols? ' ' : '')
      html += '<span class="conf_head"><span class="conf_state">'+val.state+'</span>'+t.content[t.head_pos]+'</span>'
      if (t.head_pos != t.content.length-1) html += t.content.slice(t.head_pos+2).join(machine.multi_character_symbols? ' ' : '')+'</span>'
      html += '\n'
    })
  } else {
    sim.configurations.forEach(function(val) {
      if (val.lastTrans) {
        html += ' <span class="conf_trans">-('
        html += val.lastTrans.index
        html += ')&#062;</span> '
      }
      html += '<table border="1" class="conf"><tbody>'
      val.tapes.forEach(function(t) {
        html += '<tr><td style="text-align: right">'
        if (t.head_pos > 0) html += t.content.slice(0, t.head_pos).join(machine.multi_character_symbols? ' ' : '')
        html += '</td><td><span class="conf_head"><span class="conf_state">'+val.state+'</span>'+t.content[t.head_pos]+'</span></td><td style="text-align: left">'
        if (t.head_pos != t.content.length-1) html += t.content.slice(t.head_pos+2).join(machine.multi_character_symbols? ' ' : '')+'</span>'
        html += '</td></tr>'
      })
      html += '</tbody></table>\n'
      //html += '<span style="margin-right:10px">'+JSON.stringify(val)+'</span><br>\n'
    })
  }
  configs_field.innerHTML = html
}

function generateConfiguration(lastTrans) {
  copy = {
    info: sim.info,
    infotext: sim.infotext,
    state: sim.state,
    steps: sim.steps,
    tapes: [],
    lastTrans: lastTrans
  }
  
  // copy tapes
  var occupancy, max_occupancy = 0
  sim.tapes.forEach(function (tape) {
    occupancy = tape.max_diff - tape.min_diff + 1
    if (occupancy > max_occupancy) max_occupancy = occupancy
    copy.tapes.push({
      content: tape.content.slice(),
      head_pos: tape.head_pos,
      max_storage_occupancy: occupancy
    })
  })
  
  copy.max_storage_occupancy = max_occupancy
  return copy
}

/* Compare the current configuration with all previous configurations and
 * find first equal configuration.
 * Returns the index of the fist configuration that is equal to
 * this one returns or -1.
 */
function checkForLoop() {
  if (sim.configurations.length < 2) return -1
  
  var curr = sim.configurations[sim.configurations.length-1]
  for (var i = 0; i < sim.configurations.length-1; i++) {
    if (confEqual(curr, sim.configurations[i])) return i
  }
  
  return -1
}
/* Checks if two configurations are equal.
 */
function confEqual(conf1, conf2) {
  if (conf1.state != conf2.state
   || conf1.tapes.length != conf2.tapes.length) return false
 
 for (var i = 0; i < conf1.tapes.length; i++) {
   var t1 = conf1.tapes[i]
     , t2 = conf2.tapes[i]
   if (t1.head_pos != t2.head_pos
    || !arrayEqu(t1.content, t2.content)) return false
 }
 
 return true
}

/* ================================= graphics */

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
  
  var MAX_FONT_SIZE = 16
    , BOX_SIZE = +document.getElementById('tape_size_slider').value
    , width  = tape_canvas.width
    , height = tape_canvas.height
    , text_dim, tape, shift, xpos, ypos, font_size
  
  tape_ccontext.save();
  
  // draw border
  tape_ccontext.clearRect(0, 0, width, height);
  tape_ccontext.strokeStyle = "black"
  tape_ccontext.strokeRect(0, 0, width, height)
  tape_ccontext.translate(width/2, BOX_SIZE)
  // initialise font
  tape_ccontext.textBaseline = "middle"
  tape_ccontext.font = MAX_FONT_SIZE+"pt sans-serif"
  
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
        font_size = MAX_FONT_SIZE
        do {
          tape_ccontext.font = font_size+"pt sans-serif"
          text_dim = tape_ccontext.measureText(tape.content[j])
          font_size --
        } while (text_dim.width > BOX_SIZE-1)
        
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

