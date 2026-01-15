---
layout: post
title: 'SwiftUI Tutorial: How To Customize Buttons'
description: Almost no designer uses the default button styles that Apple gives us and it takes ages to figure out the whats and hows. Let's get into buttons and actions.
og_image: https://swiftfoxx.github.io/swiftblog-assets/images/posts/og-images/buttons.cover.png
date: Jan 10, 2026
tags: swiftui, tutorial
---

# Buttons, Did You Say?

<p>{{ page.date | date: "%b %d, %Y" }} <span class="hashtag">SwiftUI</span></p>

![Divider Symbolic Image](https://swiftfoxx.github.io/swiftblog-assets/images/posts/Cover%20Images/buttons.cover.png){: .cover-image }

If you want an action, you need a button.
{: .quote }

Buttons are one of the most fundamental building blocks in SwiftUI. They represent intent. When a user taps a button, they are explicitly asking the system to do something. SwiftUI treats that idea very seriously, and that’s what makes Button special compared to almost any other interactive view.

This article covers what a Button is, how it’s used, why it matters, and all the ways you can customize it—from pure SwiftUI to borrowing power from UIKit and AppKit.

## What Is a Button in SwiftUI?

At its simplest, a Button is a view that triggers an action.

```swift
Button("Save") {
    save()
}
```

A Button is more than a tappable label in SwiftUI. It is a semantic control. The framework understands that this element *performs an action*, *participates in accessibility*, *responds to keyboard, pointer, and controller input*, *adapts automatically to platform conventions*. That semantic meaning is the key difference between a Button and any other view element with a tap gesture.

{% include image-carousel.html
id="buttons-mac"
  images="
    https://swiftfoxx.github.io/swiftblog-assets/images/posts/macOS-buttons-light.png,
    https://swiftfoxx.github.io/swiftblog-assets/images/posts/macOS-buttons-dark.png
  "
  caption="Buttons on MacBook"
 %}

## Buttons Are Special Form of Control

SwiftUI treats buttons as intentful controls, not just gesture targets. What you get with a button for free are listed below:

|      |                                             |
| :--- | :------------------------------------------ |
| ✓    | Voiceover and Switch Control support        |
| ✓    | Keyboard focus on iPad and macOS            |
| ✓    | Default animations and pressed states       |
| ✓    | Platform-specific interaction behavior      |
| ✓    | System styling that evolves with OS updates |

{: .empty2_5 }

## System Button Styles

The native iOS/macOS experience comes from what we are used to on those platforms. Those styles are achievable with system APIs.

```swift
Button("Plain") { ... }
    .buttonStyle(.plain)

Button("Borderless") { ... }
    .buttonStyle(.borderless)

Button("Bordered") { ... }
    .buttonStyle(.bordered)

Button("Prominent") { ... }
    .buttonStyle(.borderedProminent)
```
<!-- Add images for each -->

## Customizing (Specifying) Buttons

### Label

Single element layout

```swift
Button {
    play()
} label: {
    Image(systemName: "play.circle.fill")
        .font(.largeTitle)
}
```

Complex layout

```swift
Button {
    openProfile()
} label: {
    HStack {
        Image(systemName: "person.crop.circle")
        Text("Profile")
        Spacer()
        Image(systemName: "chevron.right")
    }
    .padding()
}
```

### Button Roles

Button roles communicate meaning to the system.

```swift
Button("Delete", role: .destructive) {
    deleteItem()
}
```

In confirmation dialogs and menus, roles affect placement, color, and emphasis automatically. <!-- 👈🏽 Example with images -->

### Control Size and Shape

```swift
Button("Continue") { }
    .controlSize(.large)

Button("OK") { }
    .controlSize(.small)
```

```swift
Button("Send") { }
    .buttonStyle(.bordered)
    .clipShape(Capsule())
```

### Disabling and Loading States

```swift
Button {
    submit()
} label: {
    if isSubmitting {
        ProgressView()
    } else {
        Text("Submit")
    }
}
```

No gesture juggling. The button handles state correctly.

## Custom ButtonStyle

When system styles aren’t enough, you create your own.

```swift
struct PressableButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding()
            .background(.blue)
            .foregroundStyle(.white)
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .opacity(configuration.isPressed ? 0.8 : 1)
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

```swift
Button("Tap Me") { }
    .buttonStyle(PressableButtonStyle())
```

You get pressed-state handling for free—something gestures don’t give you cleanly.

## Button vs Tap Gesture 

### Semantics

This is valid:

```swift
Text("Save")
    .onTapGesture {
        save()
    }
```

But SwiftUI now sees this as static text, not a **control**.

That means VoiceOver won’t announce it as a button, keyboard users can’t activate it, focus system ignores it, system can’t apply button behaviors.

**If it behaves like a button, it should be a Button.**

### State, Priority, and Evolution

Gestures are low-level. Buttons are high-level.

Consider pressed feedback:

```swift
.onTapGesture { }
```

No pressed state.
No cancellation.
No interaction priority.

Buttons handle: press down vs. release, gesture cancellation, conflicts with scroll views, future input types Apple adds later.

SwiftUI evolves buttons. Gestures stay primitive.

## Buttons Inside Lists, Menus, and Toolbars

Buttons integrate deeply with containers.

```swift
List {
    Button("Archive") { archive() }
    Button("Delete", role: .destructive) { delete() }
}
```

In menus:

```swift
Menu("Actions") {
    Button("Edit") { edit() }
    Button("Duplicate") { duplicate() }
}
```

In toolbars:

```swift
.toolbar {
    Button {
        addItem()
    } label: {
        Image(systemName: "plus")
    }
}
```

## Buttons Inside Alerts And Sheets

Buttons behave standard in `sheet`{: .inline-code } but it's got some special features in `alert`{: .inline-code } and `confirmationDialog`{: .inline-code }.

```swift
HStack {
    Text("John Doe")
    Button {
        showDeleteSheet.toggle()
    } label: {
        Image(systemName: "trash")
    }
}
.sheet(isPresented: $showDeleteSheet) {
    UserDeleteSheet()
}
```

This example shows a sheet being presented on an action. The sheet comprised of another View called **UserDeleteSheet**. The reason to add this example here is to show that buttons can be designed as per requirement when it comes to sheets. There could be any number of buttons and they might have multiple roles and designs. The system does not automatically style them based on any parameter — the decision lays with the one who writes the code.

But for alerts and confirmation dialogs, adding roles to the button does affect how it looks. For instance, a button with a **destructive** role would show up in red, while a button with **confirm** role would show in the app's accent color.

```swift
.alert("Are you sure?", isPresented: $showAlert) {
      Button("Confirm", role: .confirm) { }
      Button("Delete", role: .destructive) { }
}
```

and

```swift
.confirmationDialog("Are you sure?", isPresented: $showDialog) {
      Button("Confirm", role: .confirm) { }
      Button("Delete", role: .destructive) { }
}
```

{% include image-carousel.html
  id="post-hero"
  images="
    https://swiftfoxx.github.io/swiftblog-assets/images/posts/iOS-alert-light.png,
    https://swiftfoxx.github.io/swiftblog-assets/images/posts/iOS-alert-dark.png,
    https://swiftfoxx.github.io/swiftblog-assets/images/posts/iOS-confirm-dialog-light.png,
    https://swiftfoxx.github.io/swiftblog-assets/images/posts/iOS-confirm-dialog-dark.png,
    https://swiftfoxx.github.io/swiftblog-assets/images/posts/macOS-confirm-dialog-light.png,
    https://swiftfoxx.github.io/swiftblog-assets/images/posts/macOS-confirm-dialog-dark.png
  "
  caption="Alerts and Confirmation Dialogs on iPhone & MacBook"
%}

{: .empty2_5 }

This is how the system manages the colors and semantics. Buttons are not only UI elements with tap gestures — they are a communication tool.

---

{: .empty1 }

## Final Thoughts

Buttons in SwiftUI aren’t just views you tap—they’re contracts with the system. They encode intent, accessibility, interaction, and future compatibility in a single type.

If it behaves like a button, looks like a button, or acts like a button—use Button.

SwiftUI will do the rest.