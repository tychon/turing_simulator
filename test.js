/* Functions used for testing the TM.

test = {
  word_length : (int)
  max_steps : (int)
  total_words : (int)       // number of words
  steps_avg : (float)
  results : ([{
    input : ([string])
    result : (string)       // "accepted"/"rejected" , "accepted"/"break", [result-word]
    steps : (int)
    max_storage_occ : (int)
  }])
}
 */

function resetTest() {
  var word_length = parseInt(document.getElementById('test_word_length').value)
  if (!word_length || word_length < 1) word_length = 1
  else if (word_length > 30) word_length = 30
  
  var max_steps = parseInt(document.getElementById('test_break_num').value)
  if (! max_steps || max_steps < 1) max_steps = 1
  
  test = {
    word_length: word_length,
    total_words: Math.pow(machine.alphabet.length-1, word_length),
    max_steps: max_steps,
    steps_avg: 0,
    memory_avg: 0,
    results: []
  }
  
  testUpdateGui()
}

function testUpdateGui() {
  document.getElementById('test_word_length_mirror').innerHTML = test.word_length
  document.getElementById('test_num_of_words').innerHTML = test.total_words
  document.getElementById('test_break_mirror').innerHTML = test.max_steps
  
  if (test.results && test.results.length > 0) {
    document.getElementById('test_info').innerHTML = '<br>Average amount of steps: '+test.steps_avg
    
    var html = '<table border="1" class="test"><thead><tr><th>Word</th><th>Steps</th><th>Max storage</th><th>Result</th></tr></thead>\n<tbody>'
    test.results.forEach(function(res) {
      html += '<tr><td>'+res.input.join(machine.multi_character_symbols? ' ' : '')+'</td><td>'+res.steps+'</td><td>'+res.max_storage_occ+'</td><td>'+res.result+'</td></tr>\n'
    })
    html += '</tbody></table>\n'
    
    document.getElementById('test_result').innerHTML = html
  } else {
    document.getElementById('test_info').innerHTML = ''
    document.getElementById('test_result').innerHTML = ''
  }
}

function startTest() {
  disableGui()
  test.results = []
  
  // move blank symbol to the end of the alphabet
  var blankIndex = machine.alphabet.indexOf(machine.blank_symbol)
  machine.alphabet.splice(blankIndex, 1)
  machine.alphabet.push(machine.blank_symbol)
  updateTMview()
  
  // the counter contains the indices of the symbols in the alphabet
  var input, result, counter = []
  // initialize counter
  for (var i = 0; i < test.word_length; i++) counter.push(0)
  
  outerloop: while (true) {
    // convert counter
    input = []
    counter.forEach(function(symindex) { input.push(machine.alphabet[symindex]) })
    result = speedSimulation(input)
    test.results.push(result)
    test.steps_avg += result.steps / test.total_words
    //testUpdateGui()
    
    // increase counter
    for (var i = 0; i < counter.length; i++) {
      counter[i] ++
      if (counter[i] < machine.alphabet.length-1) break
      else {
        counter[i] = 0
        if (i == counter.length-1) break outerloop
      }
    }
  }
  
  testUpdateGui()
  enableGui()
}

/* Comprehension for simulation.

return {
  input : ([string])
  result : (string)
  steps : (int)
  max_storage_occ : (int)
}
*/
function speedSimulation(input) {
  var steps = 0
    , min_diff = 0
    , max_diff = 0
    , state = machine.initial_state
    , tapes = []
    , result = '???'
    , trans, tape
  
  // initialize tapes
  for (var i = 0; i < machine.tape_count; i++) {
    tapes.push({
      head_pos: 0,
      content: [machine.blank_symbol],
      diff: 0,
      min_diff: 0,
      max_diff: 0
    })
  }
  tapes[0].content = input.slice()
  
  // work!
  outerloop: while (state != machine.final_state && steps < test.max_steps) {
    steps ++
    
    // find next transition
    trans = null
    transsearch: for (var i = 0; i < machine.transitions.length; i++) {
      trans = machine.transitions[i]
      if (trans.origin != state) continue
      for (var j = 0; j < tapes.length; j++) {
        if (trans.read[j] != tapes[j].content[tapes[j].head_pos])
          continue transsearch
      }
      
      break // found!
    }
    
    if (! trans) {
      // not found :-(
      result = 'broken'
      break
    }
    
    // apply transition
    state = trans.dest
    for (var i = 0; i < tapes.length; i++) {
      tape = tapes[i]
      // write
      tape.content[tape.head_pos] = trans.write[i]
      
      // move
      if (trans.move[i] == 'L') {
        if (tape.head_pos == 0) {
          if (tape.content.length > 1 || tape.content[0] != machine.blank_symbol)
            tape.content.unshift(machine.blank_symbol)
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
      } else if (trans.move[i] == 'R') {
        if (tape.head_pos == 0 && tape.content[0] == machine.blank_symbol) {
          // shorten tape if it begins with blanks
          if (tape.content.length > 1) tape.content.shift()
          else ; // tape is empty
        } else {
          if (tape.head_pos == tape.content.length-1)
            tape.content.push(machine.blank_symbol)
          tape.head_pos ++
        }
        
        tape.diff ++
        if (tape.diff > tape.max_diff) tape.max_diff = tape.diff
      }
      
      if (tape.min_diff < min_diff) min_diff = tape.min_diff
      if (tape.max_diff > max_diff) max_diff = tape.max_diff
      
      //TODO check restriction: linear bounded space
    }
  }
  
  // evaluate result
  if (state == machine.final_state) {
    // ok
    if (machine.purpose == 'decider') {
      if (tapes[0].content[tapes[0].head_pos] == '1') result = 'accepted'
      else if (tapes[0].content[tapes[0].head_pos] == '0') result = 'rejected'
      else result = 'illegal result'
    } else if (machine.purpose == 'acceptor') result = 'accepted'
    else if (machine.purpose == 'calculator') {
      result = tapes[0].content.slice(tapes[0].head_pos)
      result = result.join(machine.multi_character_symbols? ' ' : '')
    } else result = 'illegal result'
  } else {
    // the sim was aborted
    result = 'max step limit exceeded'
  }
  
  return {
    input: input,
    result: result,
    steps: steps,
    max_storage_occ: (max_diff - min_diff + 1) * machine.tape_count
  }
}

