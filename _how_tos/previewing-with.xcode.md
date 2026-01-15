---
layout: post
title: 'Xcode Tutorial: How To Preview anything With Preview Canvas'
description: Previewing with Xcode
og_image: https://swiftfoxx.github.io/swiftblog-assets/images/posts/xcode-preview-mockup.png
date: Jan 8, 2026
tags: swiftui, xcode, tutorial
---

# The Magical 'Preview' Canvas

<p>{{ page.date | date: "%b %d, %Y" }} <span class="hashtag">Xcode</span></p>

<figure>
    <img src="https://swiftfoxx.github.io/swiftblog-assets/images/posts/xcode-preview-mockup.png" alt="Xcode Preview">
    <figcaption>Xcode Preview</figcaption>
</figure>

SwiftUI’s Preview Canvas is fluid and intuitive.

At first glance, it looks like a faster way to see the design without running the app. But it’s much more than that. It’s your canvas, and a silent critic who lets you know when there are problems in the code.

## The Simplest Possible Preview

The `#Preview`{: .inline-code } macro, which removes a huge chunk of boilerplate code keeping the ability to dictate how the view appears.

```swift
#Preview {
    Text("Hello, Preview")
}
```

This code will follow the implicitly calculated size for the preview — size that fits the content for macOS and the whole screen for iOS.

In order to specify the size, you add a `frame`{: .inline-code } modifier.

```swift
#Preview {
    Text("Hello, Preview")
        .frame(width: 200, height: 40)
}
```

And in order to change the color scheme, you write:

```swift
#Preview {
    Text("Hello, Preview")
        .preferredColorScheme(.dark)
}
```

Xcode's Preview feature is real-time and interactive. For instance, a `Text`{: .inline-code } would update the string displayed on the canvas as you type in the Editor.

## Previewing a Real View With Real Data

Let's create a simple view with static data. Paste the following in your Editor and see what it renders:

```swift
struct ProfileView: View {
    let username: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "person.circle.fill")
                .font(.largeTitle)
            Text(username)
        }
    }
}

#Preview {
    ProfileView(username: "JohnDoe")
}
```

## Variations — Side by Side

Previews become more useful when you show multiple scenarios at once. Scenarios might be color schemes, accessibility features and many more.

```swift
#Preview("Short name") {
    ProfileView(username: "Alex")
}

#Preview("Long name") {
    ProfileView(username: "Alexander Hamilton")
}
```

Xcode renders these together, making layout issues obvious while you develop.

## Device Sizes

Many layout bugs only appear on specific screen sizes. Sometimes these bugs get more pronounced when we use **size classes**. One way to preview those use cases would be to declare the device directly in the `#Preview`{: .inline-code } macro.

```swift
#Preview("Small device", device: .iPhoneSE) {
    ProfileView(username: "Swift")
}

#Preview("Large device", device: .iPhone15ProMax) {
    ProfileView(username: "Swift")
}
```

Previewing on multiple devices together can minimize bugs that might get unnoticed during development.

Light Mode, Dark Mode, and Color Assumptions

Hardcoded colors and poor contrast are easy to miss before testing. We can test the colors alongside building the complete interface with logic:

```swift
#Preview("Light Scheme") {
    ProfileView(username: "Swift")
}

#Preview("Dark Scheme") {
    ProfileView(username: "Swift")
        .preferredColorScheme(.dark)
}
```

## Accessibility: Where Layouts Go to Break

Variable text sizes are one of the fastest ways to expose fragile UI. SwiftUI provides ways to get that tested too. Take a look at the `environment`{: .inline-code } modifier.

```swift
#Preview("Accessibility XXL") {
    ProfileView(username: "Swift")
        .environment(\.sizeCategory, .accessibilityExtraExtraExtraLarge)
}
```

---

{: .empty1 }

## Previews Are About State

Views do get complex and the complexity doesn’t always come from layout but from state. Here is an example of managing the state of a view and conditionally displaying View elements:

```swift
enum LoadState {
    case loading
    case loaded
    case error
}

struct ContentView: View {
    let state: LoadState

    var body: some View {
        switch state {
        case .loading:
            ProgressView()
        case .loaded:
            Text("Content Loaded")
        case .error:
            Text("Something went wrong")
        }
    }
}
```

These states can be based on other logics, such as, networking. But they can be viewed separately nevertheless.

```swift
#Preview("Loading") {
    ContentView(state: .loading)
}

#Preview("Loaded") {
    ContentView(state: .loaded)
}

#Preview("Error") {
    ContentView(state: .error)
}
```

## Navigation

No app is built without navigation. In order for a complete experience we need to go back and forth between scenes of an app. For instance, the **iMessage** app shows the list of messages in the inbox. We navigate to the chat scene by tapping on a message.

But the previews are isolated views that are drawn on the canvas. Therefore, a view can not access the Navigation controller from another view. Hence, we need to wrap the previewing view in a `NavigationStack`{: .inline-code }.

```swift
#Preview {
    NavigationStack {
        ProfileView(username: "Swift")
    }
}
```

---

{: .empty1 }

## When Previews Feel Slow, Pay Attention

Sluggish previews are usually a signal, not a tooling problem. They often indicate:
- oversized views
- heavy work in body
- implicit global dependencies
- launch-time complications

Well-designed views preview quickly.

---

{: .empty1 }

### Closing Thought

If you treat the Preview Canvas as a playground instead of a mirror, it becomes one of the most valuable tools in your workflow.
