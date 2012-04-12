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
  for (var i = 0; i < a1.length; i ++) if (a1[i] != a2[i]) return false
  return true
}
