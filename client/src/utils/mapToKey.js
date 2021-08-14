export default function (arr, key) {
  return arr.reduce((obj, item) => {
    Object.assign(obj, { [item[key]]: item });
    return obj;
  }, {});
}
