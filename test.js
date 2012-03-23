/* Functions used for testing the TM.

test = {
  input : ([string])
  total_words : (int)       // number of words
  steps_avg : (float)
  memory_avg : (float)
  results : ([{
    result : (string)       // "accepted"/"rejected" , [result-word]
    steps : (int)
    max_storage_occ : (int)
  }])
}
 */

function resetTest() {
  test = {
    input: filterInput(document.getElementById('test_input').value),
    steps_avg: 0,
    memory_avg: 0
  }
}

function startTest() {
  disableGui()
  
  enableGui()
}

