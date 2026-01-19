---
layout: post
title: Actors In Swift
display_title: Actors In Swift
hashtag: Swift
description: A deep, practical guide to actors in Swift, explaining actor isolation, reentrancy, async/await behavior, and how to write correct and predictable concurrent code.
og_image: https://swiftfoxx.github.io/swiftblog-assets/images/posts/Cover%20Images/actor.png
date: Jan 17, 2026
tags: swift
keywords: swift actors, actors in swift, swift concurrency, actor isolation, actor reentrancy, swift async await, mainactor, concurrent state management swift, actor pitfalls swift, swift concurrency model
discussion: 1
---

![Actor in Swift](https://swiftfoxx.github.io/swiftblog-assets/images/posts/Cover%20Images/actor.png){: .cover-image }

Swift actors are often introduced as a way to avoid concurrency bugs without relying on locks or manual synchronization. They promise isolated mutable state and serialized access, which sounds like a guarantee that logic will execute predictably. In practice, however, actors behave differently than many developers initially expect. The gap between expectation and reality is usually caused by actor reentrancy.

Actor reentrancy is not an edge case. It is a fundamental part of Swift Concurrency, and ignoring it leads to subtle bugs that are difficult to reproduce and even harder to reason about. This article explains how reentrancy works, why it exists, where it causes problems, and how to structure actor code to avoid incorrect behavior.

## What Actor Reentrancy Actually Means

An actor processes one task at a time, but only while it is actively executing. When an actor method reaches an await, it suspends and releases the executor. At that point, the actor is free to start executing another message. When the suspended method later resumes, it continues running inside the actor, but the actor’s state may have changed in the meantime.

This behavior is what is often misunderstood. Actors do serialize execution, but they do not guarantee that an async method will run from start to finish without interruption. Reentrancy means that execution can be interleaved across suspension points.

A simple example makes this visible:

```swift
actor Counter {
    private var value = 0

    func increment() async {
        let current = value
        await Task.sleep(nanoseconds: 100_000_000)
        value = current + 1
    }
}
```

If two tasks call increment() concurrently, both can read the same initial value before either writes the updated one. Even though no two lines of code execute at the same time, the final result is still incorrect. The actor protected memory access, but not logical intent.

## Why Reentrancy Is a Design Choice

At first glance, it might seem safer if actors simply blocked until an async method finished completely. However, that approach would introduce a serious problem: deadlocks. If an actor held on to its executor across an await, and the awaited operation depended on the actor becoming available again, the system could stall indefinitely.

Reentrancy allows the actor to make forward progress. By releasing the executor at suspension points, the runtime ensures that other work can continue. The cost of that decision is that developers must treat await as a boundary where assumptions can no longer be trusted.

## A Common Failure Case: Financial Transactions

Consider an actor that manages a balance and allows withdrawals:

```swift
actor BankAccount {
    private var balance: Int

    init(balance: Int) {
        self.balance = balance
    }

    func withdraw(_ amount: Int) async {
        guard balance >= amount else {
            print("Insufficient funds")
            return
        }

        await authorize(amount)

        balance -= amount
        print("New balance:", balance)
    }

    private func authorize(_ amount: Int) async {
        await Task.sleep(nanoseconds: 200_000_000)
    }
}
```

This implementation looks correct. The balance is checked, authorization is performed, and then the balance is updated. However, two concurrent withdrawals can both pass the initial check, suspend during authorization, and then resume and deduct funds independently. The result may be a negative balance.

The issue is not that the actor failed to serialize execution. The issue is that the logic relied on a condition that was checked before an await and assumed to still be valid afterward.

## The Core Principle to Follow

Any assumption made before an await must be treated as potentially invalid after that await.

Actors prevent data races, but they do not preserve invariants across suspension points. Logical consistency must be maintained explicitly.

## Correcting the Withdrawal Logic

One way to fix the withdrawal logic is to avoid touching state until after the suspension:

```swift
func withdraw(_ amount: Int) async {
    await authorize(amount)

    guard balance >= amount else {
        print("Insufficient funds")
        return
    }

    balance -= amount
}
```

In this version, the entire state-sensitive operation happens after the await, making it impossible for the balance check and deduction to be separated by reentrancy.

If the logic requires checking before authorization, then the state must be revalidated after the suspension:

```swift
func withdraw(_ amount: Int) async {
    guard balance >= amount else {
        return
    }

    await authorize(amount)

    guard balance >= amount else {
        print("Balance changed during authorization")
        return
    }

    balance -= amount
}
```

This approach explicitly acknowledges that the balance may have changed while the task was suspended.

## Reentrancy and Duplicate Work in Caches

Reentrancy can also cause inefficiencies. A cache actor may unintentionally perform the same expensive operation multiple times.

```swift
actor ImageCache {
    private var storage: [URL: Data] = [:]

    func image(for url: URL) async -> Data {
        if let data = storage[url] {
            return data
        }

        let data = await download(url)
        storage[url] = data
        return data
    }

    private func download(_ url: URL) async -> Data {
        await Task.sleep(nanoseconds: 150_000_000)
        return Data()
    }
}
```

If multiple callers request the same image concurrently, each request can trigger a separate download. The actor is functioning correctly, but it is not coordinating in-progress work.

A better approach is to store pending tasks:

```swift
actor ImageCache {
    private enum Entry {
        case loading(Task<Data, Never>)
        case ready(Data)
    }

    private var storage: [URL: Entry] = [:]

    func image(for url: URL) async -> Data {
        if let entry = storage[url] {
            switch entry {
            case .ready(let data):
                return data
            case .loading(let task):
                return await task.value
            }
        }

        let task = Task {
            await download(url)
        }

        storage[url] = .loading(task)
        let data = await task.value
        storage[url] = .ready(data)
        return data
    }
}
```

This ensures that only one download occurs and that all callers receive the same result.

## Why Avoiding await Is Not Realistic

It may be tempting to avoid suspension points entirely inside actors, but this quickly becomes impractical. Network calls, file I/O, system APIs, and many framework operations are asynchronous. Actors are most useful precisely because they allow async operations while maintaining isolated state.

The real goal is not to eliminate await, but to ensure that invariants are not split across them.

## Preventing Reentrancy When Necessary

In some cases, reentrancy is undesirable. An actor method may need to behave as a single uninterrupted operation. This can be enforced using an explicit async lock or semaphore inside the actor.

```swift
actor ExclusiveActor {
    private var isExecuting = false

    func perform() async {
        while isExecuting {
            await Task.yield()
        }

        isExecuting = true
        defer { isExecuting = false }

        await Task.sleep(nanoseconds: 200_000_000)
    }
}
```

This pattern should be used sparingly. Preventing reentrancy increases predictability but also increases the risk of blocking progress if not designed carefully.

## Subtle Sources of Reentrancy Bugs

Reentrancy issues often appear during refactors rather than initial implementation. Adding a single await to an existing method can invalidate assumptions that previously held true. This is especially common with UI code on the main actor, helper methods that evolve over time, and abstraction layers that hide asynchronous behavior.

Any change that introduces a new suspension point should prompt a review of surrounding state assumptions.

## Closing Thoughts

A useful way to reason about actors is to think of them as state machines that can pause and resume. Each await is a boundary where execution may be interrupted and later resumed under different conditions.

Actor code should be written so that the state is valid at every suspension point, and so that resuming after that point does not rely on outdated assumptions.

Actor reentrancy is not a flaw in Swift Concurrency. It is a tradeoff that enables safety and progress at the same time. Understanding it is essential for writing correct, scalable concurrent Swift code.