---
layout: post
title: 'Swift Tutorial: How Many Ways Are There To Make A Chunk Of Code Reusable'
display_title: How Many Ways Are There To Make A Chunk Of Code Reusable
hashtag: Swift
description: A comprehensive guide to code reusability in Swift, covering functions, types, protocols, generics, composition, and modular design with real examples.
og_image: https://swiftfoxx.github.io/swiftblog-assets/images/posts/og-images/reusable.code.cover.png
date: Jan 9, 2026
tags: general, development, swift
keywords: swift code reusability, reusable code swift, swift protocols generics, swift composition patterns, modular swift design, swift architecture patterns, scalable swift code
---

![cover image](https://swiftfoxx.github.io/swiftblog-assets/images/posts/Cover%20Images/reusable.code.cover.png){: .cover-image }

Reusability is the key for making any app scalable and flexible. Without it, we keep writing the same piece of code over and over in different files. And this repetition results in increased complexity, more difficult to write test cases and more.

While reusable code can be written in almost any manner but few of them actually help and are community standard. This article walks through the major ways code becomes reusable, using real Swift examples and realistic scenarios.

## Extraction: Functions and Methods

The most fundamental form of reuse happens when repeated logic is extracted into a function. This is where nearly all reusable code begins.

Imagine a SwiftUI app where multiple views need to format a date the same way.

```swift
public final class Utility {
static func formattedDate(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    return formatter.string(from: date)
}
}
```

Now, any view can format a `Date`{: .inline-code } object using the function.

```swift
struct FeedView: View {
    var body: some View {
        VStack(alignment: .left, spacing: 16) {
            Text("Enjoy your feed today")
                .font(.largeTitle)
            Text(Utility.formattedDate(Date()))
        }
    }
}
```

In real projects, this technique prevents subtle bugs caused by slightly different implementations of “the same” logic scattered across files. When formatting rules change, you update one place instead of hunting ten.

However, functions stop scaling well once behavior needs configuration or state. That is when reuse moves to the next level.

## Types: Structs, Classes, and Enums

When reusable logic needs to carry state or represent a concept, it naturally becomes a type.

Consider networking code that talks to an API. A function alone cannot describe retries, headers, or authentication state cleanly.

```swift
struct APIClient {
    let baseURL: URL

    func request(path: String) async throws -> Data {
        let url = baseURL.appendingPathComponent(path)
        let (data, _) = try await URLSession.shared.data(from: url)
        return data
    }
}
```
This struct is reusable because it encapsulates both behavior and configuration. Multiple screens can create their own instance, or a single shared instance can be injected.

Enums also enable reuse by centralizing decision logic.

```swift
enum AppTheme {
    case light
    case dark

    var backgroundColor: Color {
        switch self {
        case .light: return .white
        case .dark: return .black
        }
    }
}
```

Here, reuse is not about lines of code but about shared meaning. Every part of the app interprets “theme” the same way.

## Protocols and Abstractions

Swift is a language that prefers protocols. A protocol is a set of 'rules' that decide how an inheritance works. Protocols allow reuse without sharing concrete implementations. This is where code reuse becomes architectural.

**Services** load data but the views don't need to know where the data comes from. To do it without a protocol would look like this:

```swift
final actor AccountService {
    func loadData() async throws -> Data {
        try await URLSession.shared.data(from: accountURL).0
    }
}

final actor ExploreService {
    func load() async throws -> Data {
        try await URLSession.shared.data(from: exploreURL).0
    }
}
```
At a glance, these types are doing the same job. They both load remote data asynchronously. But structurally, they have nothing in common. The method names differ, the types are unrelated, and there is no shared contract describing their role.

That leak shows up immediately in the view layer.

```swift
struct SettingsView: View {
    @State private var text = "Loading"
    var body: some View {
        Text(text)
            .task {
                let accountData = await AccountService().loadData()
                text = "Loaded Data"
            }
    }
}
```
The view now knows which service to construct and which method to call. If the service changes, the view changes. If you want to reuse this view with a different data source, you duplicate it or add branching logic. Reuse becomes accidental and brittle.

However, introducing a protocol fixes this by formalizing the shared behavior.

```swift
protocol DataLoadingService {
    func loadData() async throws -> Data
}
```

Now both services can conform to the same rule set.

```swift
final actor AccountService: DataLoadingService {
    func loadData() async throws -> Data {
        try await URLSession.shared.data(from: accountURL).0
    }
}

final actor ExploreService: DataLoadingService {
    func loadData() async throws -> Data {
        try await URLSession.shared.data(from: exploreURL).0
    }
}
```

Nothing about the concrete implementations is shared, and that’s the point. What’s shared is the expectation.

The view can now depend on behavior instead of a concrete type.

```swift
struct SettingsView<Service: DataLoadingService>: View {
    let service: Service
    @State private var text = "Loading"

    var body: some View {
        Text(text)
            .task {
                _ = try? await service.loadData()
                text = "Loaded Data"
            }
    }
}
```

At this point, reuse becomes deliberate. The view is reusable with any service that conforms to `DataLoadingService`{: .inline-code }. Testing becomes a breeze. Swapping implementations stops being a refactor and starts being configuration.

Without protocols, code reuse relies on copy-paste discipline and naming conventions. With protocols, reuse is enforced by the compiler. That difference is not stylistic. It is structural, and over time, it is the difference between a codebase that scales and one that resists change.

## Extensions

Extensions allow reuse without ownership. They are ideal when you want to add shared behavior to types you do not control or when functionality conceptually belongs to an existing type.

```swift
extension String {
    var isValidEmail: Bool {
        contains("@") && contains(".")
    }
}
```

This code becomes reusable everywhere strings are used, without creating helper objects or utility files.

In real apps, extensions often serve as glue. They let you keep models clean while still sharing logic across features.

The danger is overuse. Too many extensions can scatter behavior across files, making it hard to discover where functionality lives.

## Composition

Composition reuses behavior by assembling smaller reusable parts rather than inheriting from a shared base.

In SwiftUI, this happens constantly.

```swift
struct PrimaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(title, action: action)
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(8)
    }
}
```

This view is reused across screens, but it is also composed of reusable SwiftUI primitives.

Composition scales better than inheritance because it avoids rigid hierarchies. You can replace parts without breaking consumers.

This pattern is also common outside UI. A service composed of smaller helpers is easier to reuse than one massive object that does everything.

## Generics

Generics allow reuse across types while preserving type safety.

Consider caching values.

```swift
struct Cache<Key: Hashable, Value> {
    private var storage: [Key: Value] = [:]

    mutating func insert(_ value: Value, for key: Key) {
        storage[key] = value
    }

    func value(for key: Key) -> Value? {
        storage[key]
    }
}
```

This cache works for images, API responses, view models, or anything else. The behavior is reused without knowing the concrete types ahead of time.

Generics shine when behavior is identical but data types vary. They reduce duplication without sacrificing clarity.

## Modules and Packages

At a higher level, reuse crosses project boundaries.

A Swift Package might contain logging, analytics, or design system components shared across multiple apps.

```swift
import MyDesignSystem

PrimaryButton(title: "Continue") {
    submit()
}
```

Here, reuse is intentional, versioned, and documented. Changes must consider downstream users.

This level of reuse introduces cost. APIs must remain stable, and abstractions must be carefully designed. It is worth it only when code truly belongs to more than one product.

## Patterns and Conventions

Not all reuse is literal code reuse. Sometimes what gets reused is structure.

When every feature follows the same folder layout, naming conventions, and data flow, developers mentally reuse knowledge instead of copying code.

For example, if every screen has a View, ViewModel, and State, adding a new screen is faster even if no files are shared.

This kind of reuse reduces cognitive load. It matters as much as technical reuse in large teams.

---

{: .empty1 }

## Choosing the Right Level of Reuse

Not every repeated line deserves abstraction. Premature reuse often creates more complexity than it saves. A good rule is that reuse should emerge from repetition, not anticipation. When code appears twice, notice it, when it appears three times, extract it, when it appears across features, abstract it, and when it appears across apps, package it.

Each reuse technique exists because it solves a different problem. Functions reduce duplication, Types model concepts, Protocols enable change, Composition scales, Modules cross boundaries.

The skill is not knowing all the ways to reuse code. It is knowing when to stop.