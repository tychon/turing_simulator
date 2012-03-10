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
      for (var j = 2; j < 2+machine.tape_count; j++) trans.read.push(groups[j])
      for (var j = 3+machine.tape_count; j < 3+2*machine.tape_count; j++) trans.write.push(groups[j])
      for (var j = 3+2*machine.tape_count; j < 3+3*machine.tape_count; j++) trans.move.push(groups[j])
      
      if (machine.properties.indexOf('offline') != -1
       && trans.move[0] != 'R') {
        errors.innerHTML += 'Transition '+(i+1)+' has to move R on the first band: '+transitions[i]+'\n'
      }
      
      machine.transitions.push(trans)
    } else {
      errors.innerHTML += 'Transition '+(i+1)+' not valid: '+transitions[i]+'\n'
    }
  }
  document.getElementById('machine_json').innerHTML = JSON.stringify(machine)
  
  machine.alphabet = extractMachineAlphabet();
  updateTMview();
}
function updateTMview() {
  var t, html = '<em>Turing machine:</em><br>'
      + 'Properties: <em>'+setToString(machine.properties)+'</em><br>\n'
      + 'Number of tapes: <em>'+machine.tape_count+'</em><br>\n'
      + 'Initial state: <em>'+machine.initial_state+'</em><br>\n'
      + 'Blank Symbol: <em>'+machine.blank_symbol+'</em><br>\n'
      + 'Final state: <em>'+machine.final_state+'</em><br>\n'
      + 'Tape alphabet: <em>'+setToString(machine.alphabet)+'</em><br>\n'
      + '<table border="1" class="transitions" style="margin-top:5px"><tr><th>#</th><th></th><th>origin</th>'
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
  document.getElementById('machine').innerHTML = html;
}
function setToString(array) {
  var out = '{'
  array.forEach(function (val) {out += val+', '})
  return out.substring(0, out.length-2) + '}'
}
/* Returns the tape alphabet as an array.
 */
function extractMachineAlphabet() {
  var alphabet = [];
  machine.transitions.forEach(function (val) {
    for (var i = 0; i < machine.tape_count; i++) {
      if (alphabet.indexOf(val.read[i]) == -1) alphabet.push(val.read[i]);
      if (alphabet.indexOf(val.write[i]) == -1) alphabet.push(val.write[i]);
    }
  });
  return alphabet.sort();
}

