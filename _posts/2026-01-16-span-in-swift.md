---
layout: post
title: What is Span in Swift?
display_title: Span in Swift
hashtag: Swift
description: A deep dive into Span in Swift. What it is, why it exists, when to use it, and how it enables safer, more honest, and more performant APIs without copying or unsafe pointers.
og_image: https://swiftfoxx.github.io/swiftblog-assets/images/posts/Cover%20Images/actor.isolation.cover.png
date: Jan 16, 2026
tags: general
keywords: swift span, span element swift, swift 6 ownership, borrowing in swift, swift memory management, unsafe buffer pointer, contiguous memory swift, swift performance, swift systems programming, non owning views swift, swift arrays vs span
discussion: 1
---

When I hear `span`{: .inline-code }, I think about HTML. Just like `<div><span>content</span></div>`{: .inline-code }.

I was surprised when I came across `Span`{: .inline-code } in Swift. Let's take a look at what it is, why it exists, and when it actually makes sense to use it in real code.

If you’ve written Swift long enough, you’ve probably internalized a simple mental model: arrays own their memory, slices borrow it, and everything else is either copied or reference-counted behind your back. That model worked fine until Swift started taking performance, ownership, and predictability seriously at scale.

`Span`{: .inline-code } is the result of that shift.

## Where Span Comes From

`Span`{: .inline-code } arrived during the Swift 5.9 / Swift 6 transition era, alongside explicit ownership, move-only types, and a broader push to make performance characteristics visible rather than accidental. This wasn’t a random addition. It came from the same pressure that led to `UnsafeBufferPointer`{: .inline-code } being both indispensable and uncomfortable.

Before Span, you had two realistic choices when dealing with contiguous memory:

You either passed an `Array`{: .inline-code }, which implied ownership and often implied copying, or you dropped down to `UnsafeBufferPointer`{: .inline-code }, which gave you raw power but also removed most of Swift’s safety rails.

Slices (ArraySlice) tried to fill the gap, but they were never meant to be a general-purpose borrowing abstraction. They carry index offsets, confusing semantics, and are easy to misuse in APIs.

Span exists because Swift needed a way to say: “Here is a view into contiguous memory, I do not own it, I will not outlive it, and I want the compiler to enforce that.”

## What Span Actually Is

At its core, `Span<Element>`{: .inline-code } is a lightweight, non-owning view over contiguous elements. It does not allocate, does not retain, does not copy. It simply points at memory that must already exist.

Think of it as the safe, Swift-native counterpart to `UnsafeBufferPointer`{: .inline-code }, but designed to work with the language’s ownership and lifetime rules instead of bypassing them.

Here’s the simplest possible example:

```swift
let numbers = [1, 2, 3, 4, 5]

numbers.withSpan { span in
    print(span.count)
    print(span[0])
}
```

Nothing was copied here. `span`{: .inline-code } is borrowing the array’s storage for the duration of the closure. The compiler knows that span cannot escape that scope, and that’s the entire point.

This is not just a convention. It’s enforced.

## Why Swift Needed Span In The First Place

The short answer is performance without lying.

For years, Swift APIs pretended that passing arrays around was cheap. Sometimes it was. Sometimes it wasn’t. Copy-on-write helped, but it also hid costs in ways that became painful in hot paths, parsers, codecs, rendering pipelines, and networking stacks.

The moment you want to write something like a tokenizer, an image decoder, or a binary protocol parser, you immediately run into the same problem: you want to look at memory without owning it, and you want the compiler to help you not mess that up.

Without `Span`{: .inline-code }, you either wrote APIs like this:

```swift
func parse(_ bytes: [UInt8]) {
    // Might copy, might not, caller has no idea
}
```

Or you went full unsafe:

```swift
func parse(_ buffer: UnsafeBufferPointer<UInt8>) {
    // Fast, but lifetime correctness is entirely on you
}
```

Neither option is great. One hides costs, and the other hides danger.

`Span`{: .inline-code } makes the tradeoff explicit and checkable.

## How Span Changes API Design

The most important thing Span does is force you to be honest about ownership.

If a function takes a Span, it is saying very clearly: “I do not need to own this data. I only need to read it right now.”

That changes how APIs feel when you use them.

Compare this:

```swift
func hash(_ data: [UInt8]) -> Int
```

with this:

```swift
func hash(_ data: Span<UInt8>) -> Int
```

The second version communicates intent immediately. There’s no question about copying. There’s no ambiguity about lifetime. The function can’t stash the data away, and the compiler won’t let it.

At the call site, this usually looks like:

```swift
let bytes = loadFile()

bytes.withSpan { span in
    let result = hash(span)
    print(result)
}
```

This pattern shows up everywhere once you start looking for it. Parsing, hashing, compression, encoding, decoding—anything that consumes data without owning it benefits from this clarity.

## Span Versus Slices

It’s tempting to ask why we couldn’t just fix `ArraySlice`{: .inline-code }. The answer is that slices are fundamentally the wrong abstraction.

An `ArraySlice`{: .inline-code } still feels like an array. It has indices that don’t start at zero. It can escape freely. It doesn’t communicate borrowing semantics. And most importantly, it doesn’t integrate with Swift’s ownership model.

A `Span`{: .inline-code } is intentionally limited. You can subscript it, iterate it, and that’s mostly it. Those limitations are a feature, not a weakness. They make it easier for the compiler to reason about lifetimes and easier for humans to reason about correctness.

If you’ve ever had to explain to someone why `slice[0]`{: .inline-code } crashes because the slice’s start index isn’t zero, you already know why `Span`{: .inline-code } exists.

## Real-World Usage: Parsing Binary Data

Let’s ground this in something concrete.

Imagine you’re parsing a binary header from a file or network packet. You don’t want to copy anything, and you definitely don’t want unsafe pointer arithmetic leaking everywhere.

With Span, this becomes straightforward:

```swift
struct Header {
    let version: UInt8
    let flags: UInt8
    let length: UInt16
}

func parseHeader(_ data: Span<UInt8>) -> Header? {
    guard data.count >= 4 else { return nil }

    let version = data[0]
    let flags = data[1]
    let length = UInt16(data[2]) << 8 | UInt16(data[3])

    return Header(version: version, flags: flags, length: length)
}
```

At the call site:

```swift
buffer.withSpan { span in
    if let header = parseHeader(span) {
        print(header)
    }
}
```

No copying. No unsafe pointers. No lifetime bugs. The compiler enforces that `parseHeader`{: .inline-code } cannot stash data anywhere.

This is exactly the kind of code Span was designed for.

## Mutable Spans And Controlled Mutation

There is also `MutableSpan`{: .inline-code }, which does exactly what it sounds like: a mutable view into contiguous memory.

This is useful when you want to write into a buffer without reallocating it or exposing unsafe APIs.

For example:

```swift
func zeroOut(_ data: inout MutableSpan<UInt8>) {
    for i in 0..<data.count {
        data[i] = 0
    }
}
```

And at the call site:

```swift
var buffer = [UInt8](repeating: 1, count: 1024)

buffer.withMutableSpan { span in
    zeroOut(&span)
}
```

Again, the key point is scope. Mutation is allowed, but only while the borrow is active. Once the closure ends, the span is gone.

## Why Span Fits Swift’S Direction

If you zoom out, Span makes a lot of sense in the broader context of where Swift is heading.

Swift is moving away from “trust me, this is probably fine” abstractions and toward explicit ownership, explicit borrowing, and predictable performance. `Span`{: .inline-code } fits that philosophy perfectly.

It doesn’t replace arrays. It doesn’t replace unsafe pointers. It sits between them, providing a safe, expressive middle ground that works with the compiler instead of around it.

It also makes Swift more competitive in domains where C and C++ historically dominated, not because they were nicer languages, but because they let you see and control memory. Span brings that control without abandoning safety.

## When You Should Actually Use It

You don’t need `Span`{: .inline-code } everywhere. UI code, business logic, and most application-level Swift will never touch it, and that’s fine.

You should reach for `Span`{: .inline-code } when you are writing APIs that consume data without owning it, when performance matters, or when copying would be wasteful or misleading. If you find yourself writing functions that take arrays but never store them, `Span`{: .inline-code } is probably a better fit.

The moment you start thinking about lifetimes and memory access patterns, `Span`{: .inline-code } stops feeling like an advanced feature and starts feeling like the obvious tool.

## Final Thoughts

`Span`{: .inline-code } is one of those features that quietly improves Swift without demanding attention. It doesn’t change how most people write code day to day, but it makes it possible to write better low-level Swift when you need to.

It gives you honesty in APIs, safety without ceremony, and performance without magic. That combination is rare, and it’s exactly why Span exists.

Once you start using it, it’s hard to go back to pretending arrays are always cheap.