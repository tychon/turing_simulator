/* Functions for simulation.
 */

//TODO
  //match = /\s*(\w*)/.exec(document.getElementById('input').value)
  //machine.tape = machine.input = match? match[1] || ''
  //document.getElementById('input').value = machine.input
  //machine.head_pos = 0

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
    , pos = pos_px || -BOX_SIZE / 2 - machine.head_pos * BOX_SIZE
    , text_dim
  
  tape_ccontext.save();
  
  tape_ccontext.clearRect(0, 0, width, height);
  tape_ccontext.strokeStyle = "black"
  tape_ccontext.strokeRect(0, 0, width, height)
  tape_ccontext.translate(width/2, height/2-BOX_SIZE/2)
  
  tape_ccontext.textBaseline = "middle"
  tape_ccontext.font = FONT_SIZE+"pt sans-serif"
  
  for (var i = 0; i < machine.tape.length; i++) {
    tape_ccontext.strokeRect(pos, 0, BOX_SIZE, BOX_SIZE)
    if (machine.tape[i] != machine.blank_symbol) {
      text_dim = tape_ccontext.measureText(machine.tape[i])
      tape_ccontext.fillText(machine.tape[i],
                             pos+BOX_SIZE/2 - text_dim.width/2 - 1,
                             BOX_SIZE/2);
    }
    pos += BOX_SIZE
  }
  
  tape_ccontext.strokeStyle = "red"
  tape_ccontext.strokeRect(-BOX_SIZE/2-1, -5, BOX_SIZE+2, BOX_SIZE+10)
  
  tape_ccontext.restore()
}

