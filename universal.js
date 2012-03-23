/* Some functions used by all the different features.
 */

function setToString(array) {
  var out = '{'
  array.forEach(function (val) {out += val+', '})
  return out.substring(0, out.length-2) + '}'
}
function arrayToString(array) {
  var out = ''
  array.forEach(function (val) {out += val+', '})
  return out.substring(0, out.length-2)
}
function arrayEqu(a1, a2) {
  if (a1.length != a2.length) return false
  for (var i = 0; i < a1.length; a1 ++) if (a1[i] != a2[i]) return false
  return true
}
function findNextTransition() {
  var t, diff
  for (var i = 0; i < machine.transitions.length; i++) {
    t = machine.transitions[i]
    if (t.origin != sim.state) continue
    diff = false
    for (var j = 0; j < t.read.length; j++) {
      if (t.read[j] != sim.tapes[j].content[sim.tapes[j].head_pos]) {
        diff = true
        break
      }
    }
    if (diff) continue
    
    return {index: i, transition: t}
  }
  return null
}

