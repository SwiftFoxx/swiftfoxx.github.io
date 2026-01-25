---
layout: post
title: Explore Lazy in Swift Collections
display_title: Explore Lazy in Swift Collections
hashtag: Swift
description: Explore Lazy in Swift Collections
# og_image: ''
date: Jan 20, 2026
tags: swift
keywords: swift
---

Working with Swift collections often means chaining operations like `map`{: .inline-code }, `filter`{: .inline-code }, `compactMap`{: .inline-code }, etc. By default, these are eager: they do all the work immediately and return a fully materialized result. But Swift also supports *lazy* evaluation for sequences and collections, letting you defer work until it’s actually needed — lowering work and memory use in the right cases. [Apple Developer](https://developer.apple.com/documentation/swift/sequence/lazy?utm_source={{ site.url }}){: .inline-link }

## What Lazy Means in Swift Collections

When you call `.lazy`{: .inline-code } on a sequence or collection, Swift wraps it in a lazy adapter type — something like `LazySequence`{: inline-code } or `LazyCollection`{: inline-code }. Those adapters don’t do any transformation work up front; instead, they store your pipeline (filter, map, etc.) and only execute it when you actually pull items.

Here’s the definition from Apple’s docs:

The lazy property returns a sequence containing the same elements as this sequence, but on which some operations, such as map and filter, are implemented lazily.
{: .quote }

That doesn’t mean everything magically becomes fast or free — it means Swift *saves work* when you don’t need it or when you only look at part of the result.

For example, if you only want the **first element** that matches some criteria, lazy evaluation avoids scanning the whole collection.

## Eager vs. Lazy

Here’s how eager and lazy pipelines behave differently.

### Eager Mapping and Filtering

```swift
let numbers = Array(1...30)

let result = numbers
    .filter { $0 % 3 == 0 }  // filter now
    .map { $0 * 2 }          // map now

print("Result:", result)
```

In this snippet, Swift filters and then maps every element immediately. If numbers has 30 items, all 30 are filtered and mapped before `result`{: .inline-code } exists.


### Lazy Mapping and Filtering

```swift
let lazyResult = numbers.lazy
    .filter { $0 % 3 == 0 }  // nothing yet
    .map { $0 * 2 }          // still nothing yet

print("Lazy pipeline created:", lazyResult)
```

At this point, Swift hasn’t run either filter or map. It’s just built a pipeline that can be executed later. Only once you request an element will Swift run the work:

```swift
if let firstMatch = lazyResult.first {
    print("First lazy match:", firstMatch)
}
```

Only as many elements as needed get processed. That’s a big difference when your collection is large, or you’re only interested in part of the result.

This core lazy behavior — computing when asked — is what makes lazy sequences powerful without creating intermediate arrays or storage.

## How Lazy Works Under the Hood

When you do collection.lazy, Swift returns a type that represents a lazy wrapper. There are many such types depending on the operation:
- `LazyMapSequence`
- `LazyFilterSequence`
- `LazyMapCollection`
- `LazyFilterCollection`

Each one wraps the base sequence or collection and your closures. Unlike eager versions that build new arrays, these wrappers store the pipeline until iteration begins. [Apple Developer](https://developer.apple.com/documentation/swift/lazyfiltercollection?utm_source={{ site.url }}){: .inline-link }

This means the transformation steps form a chain of operations that only runs when needed (e.g., when you iterate or access an element via `first`{: .inline-code }, `prefix`{: .inline-code }, or a loop).

## Why Use Lazy Collections

There are several practical reasons to use lazy evaluation:

### Avoid Unnecessary load

If you only need a few elements from a large dataset, lazy evaluation stops as soon as the needed output is obtained.

For example:

```swift
// Find the first string longer than 5 characters
let names = ["Sam", "Alexandra", "Jen", "Christopher", "Lee"]

let firstLong = names.lazy
    .filter { $0.count > 5 }
    .map { $0.uppercased() }
    .first

print(firstLong ?? "No match")
```

Only enough elements to find the first match get processed.

### Reduce Intermediate Storage

Without lazy, every step in a chain creates a new array. With lazy, there are no intermediate arrays — just the pipeline.

### Better Performance in Some Cases

Because lazy pipelines delay work and stop early when possible, they can outperform eager chains when you don’t need all results or when the pipeline is long. [Stack Overflow](https://stackoverflow.com/questions/51917054/why-and-when-to-use-lazy-with-array-in-swift?utm_source={{ site.url }}){: .inline-link }

## Lazy Can Surprise You Too

Lazy isn’t always better by default. There are some nuances worth knowing.

### Non-cached Computation

Lazy pipelines don’t cache results. If you access the same element multiple times, Swift runs the pipeline each time:

```swift
let series = (1...100).lazy.filter { $0 % 5 == 0 }

print(series.first!)  // pipeline runs
print(series.first!)  // pipeline runs again
```

Both calls rerun the work.

### Collections vs. Sequences

Lazy wrappers behave differently depending on whether you’re dealing with *Sequence* or *Collection* types. Some lazy collection operations like slicing (`prefix`{: .inline-code }, `suffix`{: .inline-code }, or indexed access) can trigger unexpected work because the standard library may have to compute indices under the hood to satisfy Collection requirements. [Swift Forums](https://forums.swift.org/t/lazyfiltercollection-is-not-a-collection/2528?utm_source={{ site.url }}){: .inline-link }

Here’s an illustrative scenario:

```swift
let ints = Array(1...1000)

let lazyFiltered = ints.lazy
    .filter { $0 % 2 == 0 }
let slice = lazyFiltered.prefix(10)  // Might do more work internally

print(Array(slice))
```

Even though you only ask for 10 elements, Swift sometimes needs to find index positions or compute counts to satisfy `Collection`{: .inline-code } semantics, which can require scanning more of the sequence.

## Real-World Examples

Here are some tailored examples showing practical use.

**Searching Instead of Full Processing**

```swift
let big = Array(1...10_000_000)

// Without lazy
let result = big.filter { $0 % 7 == 0 }.first
print("First divisible by 7:", result ?? -1)

// With lazy
let lazyResult = big.lazy.filter { $0 % 7 == 0 }.first
print("First lazy match:", lazyResult ?? -1)
```

The lazy version avoids scanning the whole array once it finds the first match.

**Conditional Counting**

```swift
let scores = [33, 76, 28, 91, 50, 88]

let countAbove50 = scores.lazy
    .filter { $0 > 50 }
    .reduce(0) { $0 + 1 }

print("Scores above 50:", countAbove50)
```

Instead of building a filtered array and then counting it, lazy evaluation does this on the fly, walking the list once and counting the matches.

When Not to Use Lazy

Lazy is not always the best choice:
- When you need all results immediately and will iterate the full sequence anyway.
- When performance requirements expect **O(1)** indexing for all operations, but your lazy collection may have **O(n)** behavior because it computes indices on demand.
- When you repeatedly access the same elements with random access — caching might serve you better.

In those cases, converting the lazy pipeline to a concrete array can sometimes be faster:

```swift
let computed = Array(numbers.lazy.filter { $0 > 10 })
// Now use `computed` with indexed access
```

## Closing Thoughts

Swift’s standard library implements lazy so that operations like map and filter are defined lazily, meaning they compute elements only as they are pulled.  ￼

But lazy isn’t always strictly faster — it depends on usage and how you access the results. Understanding when and how evaluation happens helps you make better decisions about performance and memory in your Swift code.