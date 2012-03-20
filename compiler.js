/* Functions used to parse/compile the description

// Description of the machine-object:
machine = {
  type : (string)           // one of these: "one tape", "multi-track", "multi-tape"
  purpose : (string)        // one of these: "decider", acceptor", "calculator"
  offline : (bool)
  linear_bouded : (bool)
  multi_character_symbols : (bool) // the alphabet contains symbols longer than one character //TODO
  tape_count : (int)        // the number of tapes; -1 if the Tm is a one tape Tm
  initial_state : (string)
  final_state : (string)
  blank_symbol : (string)
  transitions : ([string])         // the transitions of this automaton:
      // multi-tape: Q x alphabet^n x Q x alphabet^n x movement^n
      // multi-track: Q x alphabet^n x Q x alphabet^n x movement (only one movement)
  determinism : {
    satisfied : (bool)  // true if the Tm is deterministic; equivalent to left_total && right_unique
    left_total : (bool)
    left_total_errormsg : (string)
    right_unique : (bool)
    right_unique_errormsg : (string)
  }
  description : (string) // a short text describing this Tm.
}
 */

function descrChanged() {
  if (document.getElementById('one_tape').checked) {
    document.getElementById('span_tape_count').style.visibility = 'hidden'
    document.getElementById('span_offline').style.visibility = 'hidden'
    document.getElementById('span_offline').checked = false
  } else {
    document.getElementById('span_tape_count').style.visibility = 'visible'
    document.getElementById('span_offline').style.visibility = 'visible'
  }
  
  if (document.getElementById('autocompl_determinism').checked) {
    document.getElementById('autocompl_number').disabled = false
    document.getElementById('autocompl_tip').style.display = 'inline'
  }
  else {
    document.getElementById('autocompl_number').disabled = true
    document.getElementById('autocompl_tip').style.display = 'none'
  }
  
  if (document.getElementById('componthefly').checked) compile()
}

function compile() {
  machine = {}
  var match
  
  // type
  if (document.getElementById('one_tape').checked) machine.type = 'one tape'
  else if (document.getElementById('multitrack').checked) machine.type = 'multi-track'
  else if (document.getElementById('multitape').checked) machine.type = 'multi-tape'
  
  // purpose
  if (document.getElementById('decider').checked) machine.purpose = 'decider'
  else if (document.getElementById('acceptor').checked) machine.purpose = 'acceptor'
  else if (document.getElementById('calculator').checked) machine.purpose = 'calculator'
  
  // restrictions
  if (document.getElementById('offline').checked) machine.offline = true
  if (document.getElementById('linear_bounded').checked) machine.linear_bounded = true
  
  match = /\s*(\d+)\s/.exec(document.getElementById('tape_count').value+' ')
  machine.tape_count = match? parseInt(match[1], 10) || 1 : 1
  if (machine.type = 'one tape') machine.tape_count = 1
  
  match = /\s*(\w+)\s/.exec(document.getElementById('initial_state').value+' ')
  machine.initial_state = match? match[1] || 'q0' : 'q0'
  
  match = /\s*(\w+)\s/.exec(document.getElementById('final_state').value+' ')
  machine.final_state = match? match[1] || 'qf' : 'qf'
  
  // blank symbol
  match = /\s*([^,\(\){}\s]+)\s/.exec(document.getElementById('blank_symbol').value+' ')
  machine.blank_symbol = match? match[1] || '_' : '_'
  if (machine.blank_symbol.length > 1) machine.multi_character_symbols = true
  else machine.multi_character_symbols = false
  
  // comment
  machine.comment = document.getElementById('comment').value
  
  // parse transitions
  var errors = document.getElementById('compiler_errors')
    , transitions = document.getElementById('transitions').value.split('\n')
  errors.innerHTML = ''
  machine.transitions = []
  for (var i = 0; i < transitions.length; i++) {
    if (transitions[i].replace(/^\s+/, '').replace(/\s+$/, '').length == 0) continue;
    var regexpstr = '\\s*\\(\\s*(\\w+)\\s*'
    for (var j = 0; j < machine.tape_count; j++) regexpstr += ',\\s*(\\w)\\s*'
    regexpstr += '\\)\\s*\\->\\s*\\(\\s*(\\w+)\\s*'
    for (var j = 0; j < machine.tape_count; j++) regexpstr += ',\\s*(\\w)\\s*'
    for (var j = 0; j < machine.tape_count; j++) regexpstr += ',\\s*([RLN])\\s*'
    regexpstr += '\\)'
    var groups = new RegExp(regexpstr).exec(transitions[i])
    if (groups) {
      var trans = {
        origin: groups[1],
        read: [],
        dest: groups[2+machine.tape_count],
        write: [],
        move: []
      }
      
      if (trans.origin == machine.final_state) {
        errors.innerHTML += 'Transition '+(i+1)+' not valid: Final state must not have any outgoing transitions.\n'
        continue;
      }
      
      for (var j = 2; j < 2+machine.tape_count; j++) trans.read.push(groups[j])
      for (var j = 3+machine.tape_count; j < 3+2*machine.tape_count; j++) trans.write.push(groups[j])
      for (var j = 3+2*machine.tape_count; j < 3+3*machine.tape_count; j++) trans.move.push(groups[j])
      
      if (machine.properties.indexOf('offline') != -1 && trans.move[0] != 'R') {
        errors.innerHTML += 'Transition '+(i+1)+' has to move R on the first band: '+transitions[i]+'\n'
        continue;
      }
      
      machine.transitions.push(trans)
    } else {
      errors.innerHTML += 'Transition '+(i+1)+' not valid: '+transitions[i]+'\n'
    }
  }
  document.getElementById('machine_json').innerHTML = JSON.stringify(machine)
  
  // alphabet and states
  machine.alphabet = extractMachineAlphabet()
  machine.states = listMachineStates()
  
  // determinism
  machine.deterministic = isDeterministic()
  
  // TODO sort?
  
  updateTMview()
}
function updateTMview() {
  var t, html = '<span class="machineheader">Turing machine:</span><br>'
      + 'Type: <span class="machine_prop">'+machine.type+'</span><br>\n'
  if (machine.type != 'one tape') html += 'Number of tapes: <span class="machine_prop">'+machine.tape_count+'</span><br>\n'
  html += 'Purpose: <span class="machine_prop">'+machine.purpose+'</span><br>\n'
        + 'Restrictions: <span class="machine_prop">{'
  if (machine.linear_bounded) html += 'linear_bounded'
  if (machine.offline) html += 'offline'
  html += '}</span><br>\n'
        + 'States: <span class="machine_prop">'+setToString(machine.states)+'</span><br>\n'
        + 'Tape alphabet: <span class="machine_prop">'+setToString(machine.alphabet)+'</span><br>\n'
        + 'Initial state: <span class="machine_prop">'+machine.initial_state+'</span><br>\n'
        + 'Blank Symbol: <span class="machine_prop">'+machine.blank_symbol+'</span><br>\n'
        + 'Final state: <span class="machine_prop">'+machine.final_state+'</span><br>\n'
  html += 'Turing table:<br><table border="1" class="transitions"><thead class="transitions"><tr><th>#</th><th></th><th>origin</th>'
  for (var i = 0; i < machine.tape_count; i++) html += '<th>read '+(i+1)+'</th>'
  html += '<th></th><th>dest</th>'
  for (var i = 0; i < machine.tape_count; i++) html += '<th>write '+(i+1)+'</th>'
  for (var i = 0; i < machine.tape_count; i++) html += '<th>move '+(i+1)+'</th>'
  html += '</thead></tr>\n'
  for (var i = 0; i < machine.transitions.length; i++) {
    t = machine.transitions[i]
    html += '<tr><td>'+i+'</td><td></td><td>'+t.origin+'</td>'
    t.read.forEach(function (val){html+= '<td>'+val+'</td>'})
    html += '<td></td><td>'+t.dest+'</td>'
    t.write.forEach(function (val){html+= '<td>'+val+'</td>'})
    t.move.forEach(function (val){html+= '<td>'+val+'</td>'})
    html += '</tr>\n'
  }
  html += '</table>\n'
  if (machine.comment && machine.comment != '') html += 'Comment: <p class="machine_comment">'+machine.comment+'</p>\n'
  
  html += '<span class="machineheader">Qualities:</span><br>\n'
  if (machine.deterministic == '') html += '<span class="quality_ok">deterministic</span><br>'
  else html += '<span class="quality_nok">not deterministic</span> <br> Error message: '
             + '<a href="#" id="determinism_errormsg_showhide" onclick="showHide(\'determinism_errormsg_showhide\', \'quality_errormsg\', \'block\'); return false;" class="hide_show_button">(show)</a> '
             + '<pre id="quality_errormsg" class="quality_errormsg" style="display: none">'+machine.deterministic+'</pre>'
  
  document.getElementById('machine').innerHTML = html;
}
function listMachineStates() {
  var states = [machine.initial_state]
  if (states.indexOf(machine.final_state) == -1) states.push(machine.final_state)
  machine.transitions.forEach(function (val) {
    if (states.indexOf(val.origin) == -1) states.push(val.origin)
    if (states.indexOf(val.dest) == -1) states.push(val.dest)
  })
  return states.sort()
}
/* Returns the tape alphabet as an array.
 */
function extractMachineAlphabet() {
  var alphabet = [machine.blank_symbol]
  machine.transitions.forEach(function (val) {
    for (var i = 0; i < machine.tape_count; i++) {
      if (alphabet.indexOf(val.read[i]) == -1) alphabet.push(val.read[i])
      if (alphabet.indexOf(val.write[i]) == -1) alphabet.push(val.write[i])
    }
  })
  return alphabet.sort()
}

/* Controls, if a transition exists for every alphabet-state-combination.
 * If the appropriate checkbox is checked, missing transitions will be added.
 * Returns a string containing the error message. If the string is '' the
 * Tm is deterministic.
 */
function isDeterministic() {
  var autocomplete = false, autotrans, errorstr = '';
  if (document.getElementById('autocompl_determinism').checked) {
    autocomplete = true
    autotransnum = parseInt(document.getElementById('autocompl_number').value)-1
    if (autotransnum >= 0 && autotransnum < machine.transitions.length)
      autotrans = machine.transitions[autotransnum]
    else {
      document.getElementById('autocompl_number').value = ''
      autocomplete = false
    }
  }
  
  // for every state
  machine.states.forEach(function (state) {
    if (state == machine.final_state) return
    
    counter = [] // count the indices for the alphabet
    // initialize counter
    for (var i = 0; i < machine.tape_count; i++) counter.push(0);
    
    // for every input symbol combination
    while (true) {
      read = []
      for (var j = 0; j < counter.length; j++) read.push(machine.alphabet[counter[j]])
      
      // search in machine.transitions
      found = false
      for (var j = 0; j < machine.transitions.length; j++) {
        t = machine.transitions[j]
        if (t.origin != state) continue
        if (! arrayEqu(read, t.read)) continue
        if (found) {
          errorstr += 'Transition '+(j+1)+' doubled: '+t.origin+' with '+arrayToString(t.read)+'\n'
        } else found = true;
      }
      if (!found) {
        if (autocomplete) {
          //TODO
          machine.transitions.push({
            origin: state,
            read: read.slice(),
            dest: autotrans.dest,
            write: autotrans.write,
            move: autotrans.move
          })
        } else
          errorstr += 'Missing transition: '+state+' with '+arrayToString(read)+'\n'
      }
      
      counter[0] ++
      for (var j = 0; j < machine.tape_count; j++) {
        if (counter[j] == machine.alphabet.length) {
          counter[j] = 0
          if (j+1 < counter.length) counter[j+1] ++
          else return;
        }
        else break
      }
    }
  })
  
  return errorstr
}

