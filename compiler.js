/* Functions used to parse/compile the description
 */

function descrChanged() {
  if (document.getElementById('autocompl_determinism').checked) {
    document.getElementById('autocompl_number').disabled = false
    document.getElementById('autocompl_tip').style.display = 'inline'
  }
  else {
    document.getElementById('autocompl_number').disabled = true
    document.getElementById('autocompl_tip').style.display = 'none'
  }
  
  if (document.getElementById('componthefly').checked)
    compile();
}
function compile() {
  machine = {}
  var match
  
  machine.properties = []
  if (document.getElementById('offline').checked) machine.properties.push('offline')
  if (document.getElementById('type_calculator').checked) machine.properties.push('calculator')
  if (document.getElementById('type_decision_maker').checked) machine.properties.push('decision maker')
  if (document.getElementById('type_acceptor').checked) machine.properties.push('acceptor')
  
  match = /\s*(\d+)\s/.exec(document.getElementById('tape_count').value+' ')
  machine.tape_count = match? parseInt(match[1], 10) || 1 : 1
  
  match = /\s*(\w+)\s/.exec(document.getElementById('initial_state').value+' ')
  machine.initial_state = match? match[1] || 'q1' : 'q1'
  
  match = /\s*(\w)/.exec(document.getElementById('blank_symbol').value)
  machine.blank_symbol = match? match[1] || '_' : '_'
  
  match = /\s*(\w+)/.exec(document.getElementById('final_state').value)
  machine.final_state = match? match[1] || 'qf' : 'qf'
  
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
  
  machine.alphabet = extractMachineAlphabet()
  machine.states = listMachineStates()
  machine.deterministic = isDeterministic();
  
  // TODO sort?
  
  updateTMview()
}
function updateTMview() {
  var t, html = '<span class="machineheader">Turing machine:</span><br>'
      + 'Properties: <span class="machine_prop">'+setToString(machine.properties)+'</span><br>\n'
      + 'Number of tapes: <span class="machine_prop">'+machine.tape_count+'</span><br>\n'
      + 'States: <span class="machine_prop">'+setToString(machine.states)+'</span><br>\n'
      + 'Tape alphabet: <span class="machine_prop">'+setToString(machine.alphabet)+'</span><br>\n'
      + 'Initial state: <span class="machine_prop">'+machine.initial_state+'</span><br>\n'
      + 'Blank Symbol: <span class="machine_prop">'+machine.blank_symbol+'</span><br>\n'
      + 'Final state: <span class="machine_prop">'+machine.final_state+'</span><br>\n'
  html += 'Turing table:<br><table border="1" class="transitions" style="margin-top:5px"><tr><th>#</th><th></th><th>origin</th>'
  for (var i = 0; i < machine.tape_count; i++) html += '<th>read '+(i+1)+'</th>'
  html += '<th></th><th>dest</th>'
  for (var i = 0; i < machine.tape_count; i++) html += '<th>write '+(i+1)+'</th>'
  for (var i = 0; i < machine.tape_count; i++) html += '<th>move '+(i+1)+'</th>'
  html += '</tr>\n'
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
  else html += '<span class="quality_nok">not deterministic</span> <pre class="quality_errormsg">'+machine.deterministic+'</pre><br>'
  
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
 * TM is deterministic.
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

