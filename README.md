# sketches-js

This repo contains the TypeScript implementation of the distributed quantile sketch algorithm [DDSketch](http://www.vldb.org/pvldb/vol12/p2195-masson.pdf). DDSketch is mergeable, meaning that multiple sketches from distributed systems can be combined in a central node.

## Installation

```
git clone https://github.com/DataDog/sketches-js.git
cd sketches-js
yarn install
yarn test
```

## Usage

### Initializing

To initialize a sketch with the default parameters:

```js
const DDSketch = require('ddsketch');
const sketch = new DDSketch();
```

To configure the sketch's parameters:

```js
const sketch = new DDSketch({
  relativeAccuracy: 0.05, // defaults to 0.01
  binLimit: 1024,         // defaults to 2048
  minValue: 1.0e-9        // defaults to 1.0e-9
});
```

### Add a value to the sketch

```js
sketch.accept(0);
sketch.accept(3.1415);
sketch.accept(-20);
```

### Retrieve a value at a given quantile from the sketch

```js
sketch.getValueAtQuantile(0)
sketch.getValueAtQuantile(0.5)
sketch.getValueAtQuantile(0.9)
sketch.getValueAtQuantile(0.99)
sketch.getValueAtQuantile(1)
```

## Algorithm

DDSketch has relative error guarantees: it computes quantiles with a controlled relative error.

For instance, using `DDSketch` with a relative accuracy guarantee set to 1%, if the expected quantile value is 100, the computed quantile value is guaranteed to be between 99 and 101. If the expected quantile value is 1000, the computed quantile value is guaranteed to be between 990 and 1010.

## References
* [DDSketch: A Fast and Fully-Mergeable Quantile Sketch with Relative-Error Guarantees](http://www.vldb.org/pvldb/vol12/p2195-masson.pdf). Charles Masson, Jee E. Rim and Homin K. Lee. 2019.
* Java implementation: [https://github.com/DataDog/sketches-java](https://github.com/DataDog/sketches-java)
* Go implementation: [https://github.com/DataDog/sketches-go](https://github.com/DataDog/sketches-go)
* Python implementation: [https://github.com/DataDog/sketches-py](https://github.com/DataDog/sketches-py)
