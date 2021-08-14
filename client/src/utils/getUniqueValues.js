export default function (arr, key) {
  if (key) {
    return arr.map((item) => item[key])
      .filter((value, index, self) => self.indexOf(value) === index);
  }
  return arr.filter((value, index, self) => self.indexOf(value) === index);
}
