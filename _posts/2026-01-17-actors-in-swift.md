---
layout: post
title: Actors In Swift
display_title: Actors In Swift
hashtag: Swift
description: A deep, practical guide to actors in Swift, explaining actor isolation, reentrancy, async/await behavior, and how to write correct and predictable concurrent code.
og_image: https://swiftfoxx.github.io/swiftblog-assets/images/posts/Cover%20Images/actor.png
date: Jan 17, 2026
revision: Jan 20, 2026
tags: swift
keywords: swift actors, actors in swift, swift concurrency, actor isolation, actor reentrancy, swift async await, mainactor, concurrent state management swift, actor pitfalls swift, swift concurrency model
discussion: 1
---

![Actor in Swift](https://swiftfoxx.github.io/swiftblog-assets/images/posts/Cover%20Images/actor.png){: .cover-image }

Apple announced Actor in WWDC 2021 that shipped with Swift 5.5. [WWDC](https://developer.apple.com/videos/play/wwdc2021/10133){: .inline-link }

Developers used to often run into **Data Races**, and it would be more common than you think. `Actors`{: .inline-code } bring the most needed solution to this problem by means of `isolation`{: .inline-code } and `async/await`{: .inline-code }. Let’s unpack how this works in practice.

## Actor Declaration and Isolation

You declare an `actor`{: .inline-code } with the actor keyword, which defines a special reference type. For example:

```swift
actor BankAccount {
    private(set) var balance: Double = 0.0

    func deposit(_ amount: Double) {
        balance += amount
    }

    func withdraw(_ amount: Double) {
        balance -= amount
    }
}
```

This `BankAccount`{: .inline-code } behaves like a class with a stored property `balance`{: .inline-code } and two methods. The key difference is that `balance`{: .inline-code } (and the methods above) are **actor-isolated**. They can only be accessed from within that specific `BankAccount`{: .inline-code } instance’s own execution context. If you try to read or write balance from outside the actor, the compiler will reject that. [1](https://forums.swift.org/t/concurrency-actors-actor-isolation/41613#:~:text=As%20noted%20in%20the%20error,isolated%20by){: .inline-link }

Let's see an example of that:
```swift
let account = BankAccount()
let current = account.balance
```

Attempting something like this results in an error:

actor-isolated property ‘balance’ can only be referenced from inside the actor
{: .error }

This happens because Swift enforces **actor isolation**. By default, all stored properties, computed properties, subscripts, and synchronous instance methods are isolated to `self`{: .inline-code }. In the example `BankAccount`{: .inline-code }, `balance`{: .inline-code } and the methods `deposit(_:)`{: .inline-code } and `withdraw(_:)`{: .inline-code } can only run inside the actor. [1](https://forums.swift.org/t/concurrency-actors-actor-isolation/41613#:~:text=As%20noted%20in%20the%20error,isolated%20by){: .inline-link }

Behind the scenes, Swift transforms an actor into a class conforming to a hidden **Actor protocol** (which itself inherits `Sendable`{: .inline-code }). All actor types *implicitly conform to `Sendable`{: .inline-code }* because the actor guarantees serial access to its mutable state. In practice this means you can pass actor references across threads safely; the compiler will enforce that any interaction with an actor’s state is done through the actor’s isolated context. [1](https://swiftrocks.com/how-actors-work-internally-in-swift#:~:text=actors%20are%20a%20syntax%20sugar,protocol){: .inline-link } [2](https://hackmd.io/@Rowan/Skyq4U-xT#:~:text=Sendable%20Actors%20,mutable%20state%EC%97%90%20%EC%A0%91%EA%B7%BC%ED%95%A0%20%EC%88%98%20%EC%9E%88%EB%8F%84%EB%A1%9D){: .inline-link }

## Calling Actor Methods

Since actor-isolated state can’t be directly accessed from arbitrary threads, Swift requires that calls from outside the actor be made asynchronously. In concrete terms, any method you want to call from the outside of the actor must be marked async or return through a concurrency primitive. For example, to use the `BankAccount`{: .inline-code } actor, you do this:
```swift
let account = BankAccount()
Task {
    // Call deposit asynchronously - this enqueues a message on the actor
    await account.deposit(100.0)
    // After the deposit completes, we could read the balance (if we had an async getter)
}
```

Here `await account.deposit(100.0)`{: .inline-code } does not execute `deposit(_:)`{: .inline-code } immediately on the current thread. Instead, Swift enqueues a task (a message) to the actor’s private queue. The actor’s executor will pick up tasks from that queue one by one and run them to completion. As Gregor’s proposal notes, *“an actor processes the messages in its mailbox sequentially, so that a given actor will never have two concurrently-executing tasks running actor-isolated code. This ensures that there are no data races on actor-isolated mutable state.”* [1](https://forums.swift.org/t/concurrency-actors-actor-isolation/41613#:~:text=Asynchronous%20function%20invocations%20are%20turned,would%20eventually%20process%20the%20deposit){: .inline-link } [2](https://forums.swift.org/t/concurrency-actors-actor-isolation/41613#:~:text=Asynchronous%20function%20invocations%20are%20turned,would%20eventually%20process%20the%20deposit){: .inline-link } [3](https://forums.swift.org/t/concurrency-actors-actor-isolation/41613#:~:text=As%20noted%20in%20the%20error,isolated%20by){: .inline-link }

Even reading a simple property requires `await`{: .inline-code } unless that property is actor-independent. For instance, we might add an `async`{: .inline-code } getter to `BankAccount`{: .inline-code }:

```swift
actor BankAccount {
    private(set) var balance: Double = 0.0

    func deposit(_ amount: Double) {
        balance += amount
    }

    func getBalance() async -> Double {
        return balance
    }
}

Task {
    await account.deposit(50.0)
    let b = await account.getBalance() // Must await to read balance
}
```
Because balance is var (mutable), the `getBalance()`{: .inline-code } method must be async to be called from outside. If we had tried to define `func getBalance() -> Double`{: .inline-code } (synchronous), the compiler would forbid calling it from outside the actor. In fact, Swift enforces that **synchronous instance methods of an actor are actor-isolated and cannot be invoked from outside the actor**. They cannot be placed on the queue, so they are effectively private to the actor’s context. Thus, any method intended for external use is typically marked `async`{: .inline-code }, and you always use `await`{: .inline-code } to call it.

Internally (within the actor), you can call its own methods directly without `await`{: .inline-code } because you are already on the actor’s executor. For example, inside another `async`{: .inline-code } method of the same actor, calling `deposit(…)`{: .inline-code } can just be a normal call. Outside the actor, every interaction becomes an asynchronous message.

**Execution Model**: An actor’s executor is like a private, serial dispatch queue. When you do `await account.deposit(…)`{: .inline-code }, Swift transforms that into enqueuing a *partial task* on `account`{: .inline-code }’s queue. The actor will process tasks in FIFO order (unless other scheduling intervenes), always running one at a time. The runtime guarantees that “an actor never is concurrently running on multiple threads”. In practice, this means your actor code cannot have two threads inside it at the same time, eliminating classic data races on its isolated state. [1](https://forums.swift.org/t/concurrency-actors-actor-isolation/41613#:~:text=Asynchronous%20function%20invocations%20are%20turned,would%20eventually%20process%20the%20deposit){: .inline-link } [2](https://forums.swift.org/t/concurrency-actors-actor-isolation/41613#:~:text=Asynchronous%20function%20invocations%20are%20turned,would%20eventually%20process%20the%20deposit){: .inline-link }
{: .quote }

## Actor Reentrancy and Interleaving

A subtle but crucial feature of Swift actors is **reentrancy**. By default, Swift actors allow a form of controlled concurrency: if an actor-isolated async method suspends, the actor is free to start executing another message before the first method has fully returned. In other words, an actor can “re-enter” itself while a previous call is awaiting. As the Swift proposal explains, “Actor-isolated functions are reentrant. When an actor-isolated function suspends, reentrancy allows other work to execute on the actor before the original actor-isolated function resumes.” The result is *interleaving*: parts of one async call may run, then pause, then another async call to the same actor may run in the middle, and then the first one resumes. [1](https://forums.swift.org/t/actor-reentrancy/59484#:~:text=%3E%20,we%20refer%20to%20as%20interleaving){: .inline-link }

You can find more about Actor Reentrancy <a href="/actor-isolation-problem-in-swift-6.2/" target="_blank">here</a>.

## Avoiding Surprises

Given actor reentrancy, a good rule is to design methods so that state checks and updates happen atomically, without interruption. For example, instead of writing:

```swift
func withdraw(amount: Double) async throws {
    if balance < amount { 
        throw InsufficientFunds()
    }
    await Task.sleep(1)      // imaginary delay
    balance -= amount
}
```

which could allow balance to be modified by another task during the `await`{: .inline-code }, it’s often safer to perform the entire operation without suspension. You might restructure it as:

```swift
func withdraw(amount: Double) throws {
    if balance < amount { throw InsufficientFunds() }
    balance -= amount
}
```

and call that method with await from outside, knowing it won’t suspend in the middle. In fact, one recommendation is to **put code that must remain atomic into a single synchronous actor-isolated method**. If you truly need to do multiple `awaits`{: .inline-code }, re-check your preconditions after each `await`{: .inline-code }, or consider serializing calls another way. [1](https://forums.swift.org/t/making-actor-non-reentrant/73131#:~:text=There%20is%20no%20way%2C%20but,and%20avoid%20any%20reentrancy%20problems){: .inline-link }

Because Swift doesn’t currently offer a `nonReentrant`{: .inline-code } attribute, one pattern is to manually queue work inside the actor. For example, you could use an `AsyncStream`{: .inline-code } or a semaphore to process calls one by one, but this is advanced. In most cases, thoughtful API design – minimizing awaited sections or re-checking state – suffices. [1](https://forums.swift.org/t/making-actor-non-reentrant/73131#:~:text=There%20is%20no%20way%2C%20but,and%20avoid%20any%20reentrancy%20problems){: .inline-link }

## Sendable and Actor Safety

A key consequence of actor isolation is that actors are implicitly thread-safe. The Swift type system marks all actor types as conforming to `Sendable`{: .inline-code }. This reflects the guarantee that no two threads can access an actor’s mutable state simultaneously; any cross-thread access is mediated by the actor’s queue. In code terms, you can freely move an actor reference between tasks or threads without special locks, because the compiler enforces that any interaction is done via `async/await`{: .inline-code } calls.

More concretely, consider passing an actor into a **Task closure** or as a completion handler argument. Since the actor ensures serialized access, there’s no data race even if multiple tasks attempt to call it concurrently – they simply queue up. Swift’s concurrency model thus “guarantee[s] that all access to [an actor’s] mutable state is performed sequentially”, which is why actors are considered `Sendable`{: .inline-code } by default.

## Actor Independence and Nonisolated Members

By default, only the actor’s own isolated context can touch its mutable `vars`{: .inline-code } or synchronous methods. However, Swift provides ways to work with data that doesn’t need such strict isolation. We already saw that immutable `let`{: .inline-code } properties of value types are actor-independent. You can also annotate specific methods or properties as `nonisolated`{: .inline-code } if they are safe to call from any thread. For example, a static helper method or a computed property that only reads external state could be marked `nonisolated`{: .inline-code }, bypassing the actor checks. But use this sparingly: marking things `nonisolated`{: .inline-code } is like opting out of the actor’s protections, so you should only do it when you’re sure the code is inherently thread-safe.

## Putting It All Together: An Example

Suppose we want an actor to manage an integer counter. Here’s a sample design:

```swift
actor Counter {
    private var value = 0

    func increment() {
        value += 1
    }

    func getValue() async -> Int {
        return value
    }
}
```

Because `increment()`{: .inline-code } is synchronous, it cannot be called from outside the actor. Instead, in real usage we’d mark it async too (or rely on the fact that calling it with await still queues it). A more typical usage might be:

```swift
actor Counter {
    private var value = 0

    func increment() async {
        value += 1
    }

    func getValue() async -> Int {
        return value
    }
}

let counter = Counter()
Task {
    for _ in 1...100 {
        await counter.increment()
    }
    print("Final count:", await counter.getValue())
}
```

Each `await counter.increment()`{: .inline-code } enqueues an increment on `counter`{: .inline-code }. The actor processes these one at a time, so even though we launched many tasks possibly in parallel, the actor serializes the increments. We never see a data race on `value`{: .inline-code }.

One subtlety: if `increment()`{: .inline-code } did some work and *awaited* inside (for example, awaiting a network call before actually incrementing), other tasks could interleave. In that case, we’d ensure correctness by either moving the increment before any awaits or re-checking state after any await. But as written, the increment is straightforward and safe.

## Best Practices and Pitfalls

- Use await for actor calls: Always call actor methods and property getters from an async context using `await`{: .inline-code }. Forgetting `await`{: .inline-code } will be a compile-time error (or a warning) because the call is asynchronous.
- Favor small synchronous transactions: If possible, do all related state changes in one synchronous actor method. This avoids splitting logic around suspension points. As one Swift Forums user advises, “think about the logic transactionally and avoid any reentrancy problems” by using a single sync method. [1](https://forums.swift.org/t/making-actor-non-reentrant/73131#:~:text=There%20is%20no%20way%2C%20but,and%20avoid%20any%20reentrancy%20problems){: .inline-link }
- Re-check after awaits: If you must use await inside an actor method, remember that the actor could have processed other messages during that time. For example, if you checked `if count == 0`{: .inline-code } then `await`{: .inline-code }, by the time you resume count might no longer be `0`{: .inline-code }.
- Immutability is cheap: Store immutable data (let) inside your actor whenever possible. Immutable values are actor-independent, so they can be used freely across concurrency domains. [1](https://forums.swift.org/t/concurrency-actors-actor-isolation/41613#:~:text=On%20the%20other%20hand%2C%20the,independent){: .inline-link }
- Testing and logging: To understand actor behavior, logging before and after awaits (like in the earlier example) can reveal interleaving. Testing edge cases (for example, two tasks racing to call an async method) helps ensure you didn’t miss a corner case.
- Avoid mixing in blocking code: Never call blocking APIs (like semaphores or long-CPU loops) inside an actor without careful design. Blocking the actor’s queue halts all its work. If you need mutual exclusion, Swift’s concurrency provides structured tools (like AsyncSemaphore libraries), but mixing legacy blocking calls is error-prone.

## Closing Thoughts

By following the patterns above (encapsulating state changes, checking state after awaits, and using async for external calls), you can build concurrent Swift programs that are both efficient and easy to understand. Actors are a powerful feature, and a deep understanding of their isolation and reentrancy makes the difference between subtle bugs and rock-solid async code.

{: .mt-3 }

**Sources** *swift.org*, *swiftrocks.com*, *hackmd.io* [1](https://forums.swift.org/t/concurrency-actors-actor-isolation/41613#:~:text=Actors%20provide%20a%20model%20for,is%20left%20as%20future%20work){: .inline-link } [2](https://forums.swift.org/t/concurrency-actors-actor-isolation/41613#:~:text=As%20noted%20in%20the%20error,isolated%20by){: .inline-link } [3](https://forums.swift.org/t/concurrency-actors-actor-isolation/41613#:~:text=Asynchronous%20function%20invocations%20are%20turned,would%20eventually%20process%20the%20deposit){: .inline-link } [4](https://swiftrocks.com/how-actors-work-internally-in-swift#:~:text=actors%20are%20a%20syntax%20sugar,protocol){: .inline-link } [5](https://hackmd.io/@Rowan/Skyq4U-xT#:~:text=Sendable%20Actors%20,mutable%20state에%20접근할%20수%20있도록){: .inline-link }
{: .note }