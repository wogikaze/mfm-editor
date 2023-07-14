// <stdin>
function countIf(f, xs) {
    return xs.filter(f).length;
  }
  function count(a, xs) {
    return countIf((x) => x === a, xs);
  }
  function concat(xss) {
    return [].concat(...xss);
  }
  function intersperse(sep, xs) {
    return concat(xs.map((x) => [sep, x])).slice(1);
  }
  function erase(a, xs) {
    return xs.filter((x) => x !== a);
  }
  function difference(xs, ys) {
    return xs.filter((x) => !ys.includes(x));
  }
  function unique(xs) {
    return [...new Set(xs)];
  }
  function sum(xs) {
    return xs.reduce((a, b) => a + b, 0);
  }
  function maximum(xs) {
    return Math.max(...xs);
  }
  function groupBy(f, xs) {
    const groups = [];
    for (const x of xs) {
      const lastGroup = groups.at(-1);
      if (lastGroup !== void 0 && f(lastGroup[0], x)) {
        lastGroup.push(x);
      } else {
        groups.push([x]);
      }
    }
    return groups;
  }
  function groupOn(f, xs) {
    return groupBy((a, b) => f(a) === f(b), xs);
  }
  function groupByX(collections, keySelector) {
    return collections.reduce((obj, item) => {
      const key = keySelector(item);
      if (!Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = [];
      }
      obj[key].push(item);
      return obj;
    }, {});
  }
  function lessThan(xs, ys) {
    for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
      if (xs[i] < ys[i])
        return true;
      if (xs[i] > ys[i])
        return false;
    }
    return xs.length < ys.length;
  }
  function takeWhile(f, xs) {
    const ys = [];
    for (const x of xs) {
      if (f(x)) {
        ys.push(x);
      } else {
        break;
      }
    }
    return ys;
  }
  function cumulativeSum(xs) {
    const ys = Array.from(xs);
    for (let i = 1; i < ys.length; i++)
      ys[i] += ys[i - 1];
    return ys;
  }
  function toArray(x) {
    return Array.isArray(x) ? x : x != null ? [x] : [];
  }
  function toSingle(x) {
    return Array.isArray(x) ? x[0] : x;
  }
  export {
    concat,
    count,
    countIf,
    cumulativeSum,
    difference,
    erase,
    groupBy,
    groupByX,
    groupOn,
    intersperse,
    lessThan,
    maximum,
    sum,
    takeWhile,
    toArray,
    toSingle,
    unique
  };