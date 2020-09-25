# sketches-js

This repo contains the JavaScript implementation of the distributed quantile sketch algorithm `DDSketch` [1]. `DDSketch` is mergeable, meaning that multiple sketches from distributed systems can be combined in a central node.

# DDSketch

DDSketch has relative error guarantees: it computes quantiles with a controlled relative error.

For instance, using `DDSketch` with a relative accuracy guarantee set to 1%, if the expected quantile value is 100, the computed quantile value is guaranteed to be between 99 and 101. If the expected quantile value is 1000, the computed quantile value is guaranteed to be between 990 and 1010.

`DDSketch` works by mapping floating-point input values to bins and counting the number of values for each bin. The mapping to bins is handled by `IndexMapping`, while the underlying structure that keeps track of bin counts is `Store`. `DDSketch.memoryOptimal()` constructs a sketch with a logarithmic index mapping, hence low memory footprint, whereas `DDSketch.fast()` and `DDSketch.balanced()` offer faster ingestion speeds at the cost of larger memory footprints. The size of the sketch can be upper-bounded by using collapsing stores. For instance, `DDSketch.memoryOptimalCollapsingLowest()` is the version of `DDSketch` described in the paper, and also implemented in [Go](https://github.com/DataDog/sketches-go/) and [Python](https://github.com/DataDog/sketches-py/). It collapses lowest bins when the maximum number of buckets is reached. For using a specific `IndexMapping` or a specific implementation of `Store`, the constructor can be used.

The memory size of the sketch depends on the range that is covered by the input values: the larger that range, the more bins are needed to keep track of the input values. As a rough estimate, if working on durations using `DDSketch.memoryOptimal(0.02)` (relative accuracy of 2%), about 2kB (275 bins) are needed to cover values between 1 millisecond and 1 minute, and about 6kB (802 bins) to cover values between 1 nanosecond and 1 day. The number of bins that are maintained can be upper-bounded using collapsing stores (see for example `DDSketch.memoryOptimalCollapsingLowest()` and `DDSketch.memoryOptimalCollapsingHighest()`).

# References
[1] Charles Masson, Jee E. Rim and Homin K. Lee. DDSketch: A Fast and Fully-Mergeable Quantile Sketch with Relative-Error Guarantees. 2019.
