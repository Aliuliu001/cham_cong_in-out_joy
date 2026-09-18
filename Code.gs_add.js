// Thêm hàm getBaoCaoThangTatCa(thangStr) vào Code.gs
function getBaoCaoThangTatCa(thangStr) {
  var list = getNhanVienList();
  var out = [];
  list.forEach(function (n) {
    var r = getBaoCaoThang(n.ma, thangStr);
    out.push(r);
  });
  out.sort(function (a, b) { return a.ma < b.ma ? -1 : 1; });
  return out;
}
