---
layout: post
title: 'SwiftUI Tutorial: Section Finale! Let''s Build A Settings Scene'
description: Section Finale! Let's Build A Settings Scene.
og_image: https://swiftfoxx.github.io/swiftblog-assets/images/posts/og-images/settings-scene.png
date: Jan 14, 2026
revision: Jan 18, 2026
tags: tutorial, app tutorial
---

# Section Finale!

## Let's Build A Settings Scene

<p>{{ page.date | date: "%b %d, %Y" }} <span class="hashtag">App Tutorial</span></p>

<figure>
    <img src="https://swiftfoxx.github.io/swiftblog-assets/images/posts/settings-scene.png" alt="Xcode Welcome Screen">
    <figcaption>Settings Scene</figcaption>
</figure>

A settings scene is one of those parts of an app that users interact with repeatedly, yet rarely think about. The reason to choose to build a settings scene is that it's supposed to be very simple — unless you're creating a Settings App.

The UI and the flow of the project are intentionally kept simpler than it should be. This project is a compact but thoughtfully structured example of how to build a flexible, native-feeling settings experience in SwiftUI without overengineering it.

What makes this project interesting is not just the visual result, but how responsibilities are separated across files, how state is managed, and how reusable view components are composed together into something that feels cohesive. In this article, we’ll walk through the project file by file, following the same mental path you would take while building it from scratch.

### Project Entry Point and Scene Configuration

Every SwiftUI app starts by defining its scenes, and this project is no different. The entry point lives in `settingssceneApp.swift`{: .inline-code }.

Let's remove `ContentView.swift`{: .inline-code }, and create a new View called `SettingsView.swift`{: .inline-code }. Now we replace the View name inside `WindowGroup { }`{: .inline-code } with the newly created one.

```swift
@main
struct settingssceneApp: App {
  var body: some Scene {
    WindowGroup {
      SettingsView()
    }
  }
}
```

While we are at it, let's make it a single window for macOS and leave it as is for iOS (iOS does not support anything else). What we need to do in order for that is we add `#if`{: .inline-code } preprocessor check.

```swift
@main
struct settingssceneApp: App {
  var body: some Scene {
    #if os(macOS)
    Window("Settings", id: "main") {
      SettingsView()
    }
    #else
    WindowGroup {
      SettingsView()
    }
    #endif
  }
}
```

The conditional compilation here allows the same SettingsView to work naturally across platforms. On macOS, the settings live inside a dedicated window with a title, which feels right in a desktop environment. On iOS and iPadOS, the same view is embedded inside a WindowGroup.

### The Core Container: SettingsView

With the entry point sorted, the next thing we want to focus on is the container that will hold everything else. This is where `SettingsView.swift`{: .inline-code } comes in.

At this stage, the goal is not to build the settings UI itself, but to establish the structure it will live in. A settings screen is, at its core, a navigable list.

Inside `SettingsView.swift`{: .inline-code }, we start by defining a navigation container and a list. Nothing more.

```swift
struct SettingsView: View {
  var body: some View {
    NavigationStack {
      List {
      }
      .navigationTitle("Settings")
    }
  }
}
```

The navigation stack, and title are in place, the list styling is system-native, and the screen feels immediately familiar. This is intentional. A settings scene should feel correct long before it feels complete.

{% include image-carousel.html
id="ss-init"
  images="
    https://swiftfoxx.github.io/swiftblog-assets/images/posts/settings/ss.ios.1.png,
    https://swiftfoxx.github.io/swiftblog-assets/images/posts/settings/ss.mac.1.png
  "
  caption="Settings list with a navigation title"
 %}

### Creating first component: *SettingRow*

Now that the container is in place, we can start thinking about how rows are added to this list. This is where the project deliberately avoids going straight to `Toggle`{: .inline-code }, `Picker`{: .inline-code }, or custom stacks.

Instead, we introduce `SettingRow`{: .inline-code }.

If you look inside `SettingRow`{: .inline-code }, you’ll notice that it’s really just a `LabeledContent`{: .inline-code } with a thin wrapper around it. That choice is very deliberate.

```swift
import SwiftUI

struct SettingRow<E: View>: View {
  let title: String
  let trailingElement: E

  /// Initialize the view
  ///
  /// @discussion
  /// The initializer accepts a ``title`` (String) and
  /// a ``trailingElement`` (E) which is a type of View.
  ///
  /// View is a protocol and the conformance works in
  /// different ways in SwiftUI Views.
  ///
  /// Hence, it's mandatory to declare a generic type.
  init(title: String, trailingElement: E) {
    self.title = title
    self.trailingElement = trailingElement
  }

  /// Initialize the view
  ///
  /// @discussion
  /// The initializer accepts a ``title`` (String) and
  /// a ``trailingElement`` which is a **ViewBuilder** closure.
  init(title: String, @ViewBuilder trailingElement: () -> E) {
    self.title = title
    self.trailingElement = trailingElement()
  }

  var body: some View {
    // Creating the View with specified title and trailingElement
    LabeledContent(title) {
      trailingElement
    }
  }
}
```

Wrapping `LabeledContent`{: .inline-code } does a few things at once, even though it doesn’t look impressive on the surface. It gives the row a name that carries intent. It creates a stable abstraction that can change internally without touching every call site. And it becomes a natural place to experiment with initializer design and view composition without leaking that complexity into `SettingsView`{: .inline-code }.

More importantly, it lets the settings screen speak in terms of meaning rather than layout. When you add a `SettingRow`{: .inline-code }, you’re not placing text next to a control—you’re declaring a setting.

### Adding Elements to The Scene

With `SettingRow`{: .inline-code } in place, adding content to `SettingsView`{: .inline-code } becomes straightforward and readable.

```swift
List {
  Section {
    SettingRow("Appearance") {
      AppearanceMenu(selectedAppearance: $appearance)
    }
  }
}
```

This reads cleanly, almost like a sentence. The view doesn’t care what `AppearanceMenu`{: .inline-code } does internally. It only knows that this row is responsible for appearance.

This separation becomes more important as the settings screen grows.

#### AppearanceMenu

{% include image-carousel.html
id="ss-init"
  images="
    https://swiftfoxx.github.io/swiftblog-assets/images/posts/settings/ss.ios.2.png,
    https://swiftfoxx.github.io/swiftblog-assets/images/posts/settings/ss.mac.2.png
  "
  caption="Settings list with menu expanded"
 %}

`AppearanceMenu`{: .inline-code } itself follows the same philosophy. Instead of pushing users into a new screen just to select a preference, the menu lives inline, anchored to the trailing edge of the row.

```swift
import SwiftUI

struct AppearanceMenu: View {
  @Binding var selectedAppearance: Appearance

  var body: some View {
    Menu {
      ForEach(Appearance.allCases, id: \.rawValue) { appearance in
        Button {
          selectedAppearance = appearance
        } label: {
          Label(appearance.title, systemImage: appearance.systemImage)
        }
      }
    } label: {
      Label("appearance", systemImage: selectedAppearance.systemImage)
        .labelStyle(.iconOnly)
    }
    .foregroundStyle(.primary)
    .menuStyle(.borderlessButton)
    .menuIndicator(.hidden)
  }
}
```

The important part here isn’t the menu itself, but where it lives. By keeping it inline, the user never loses context. The settings screen remains scannable, calm, and predictable.

#### ColorPickerMenu, And AdsPicker

The same pattern continues with components like `ColorPickerMenu`{: .inline-code } and `AdsPicker`{: .inline-code }. Each of them solves a different problem, but none of them introduce a new structural idea. They all slot into `SettingRow`{: .inline-code } and respect the same visual rhythm.

That consistency is what keeps the settings scene from feeling overwhelming.

##### ColorPickerMenu

```swift
import SwiftUI

struct ColorPickerMenu: View {
  @Binding var selection: SupportedColor

  var body: some View {
    Menu {
      ForEach(SupportedColor.allCases, id: \.rawValue) { color in
        Button {
          selection = color
        } label: {
          HStack {
            Image(systemName: "circle.fill")
              .symbolRenderingMode(.palette)
              .foregroundStyle(color.color)
            Text(color.name)
          }
        }
      }
    } label: {
      HStack {
        Image(systemName: "circle.fill")
          .foregroundStyle(selection.color)
      }
    }
    #if os(macOS)
    .menuStyle(.borderlessButton)
    .menuIndicator(.hidden)
    #endif
  }
}
```

##### AdPickerMenu

```swift
import SwiftUI

struct AdPickerMenu: View {
  @Binding var selection: AdType

  var body: some View {
    Picker("Ads", selection: $selection) {
      ForEach(AdType.allCases, id: \.self) { type in
        Text(type.description)
          .tag(type)
      }
    }
  }
}
```

#### PersonView

At the very top of the list sits `PersonView`{: .inline-code }. This is the one place where the settings screen stops being purely functional.

```swift
import SwiftUI

struct PersonView<D: View>: View {
  let destination: D

  var body: some View {
    NavigationLink(destination: destination) {
      HStack {
        Image("avatar")
          .resizable()
          .aspectRatio(1, contentMode: .fill)
          .frame(width: 50, height: 50)
          .clipShape(.circle)
        VStack(alignment: .leading) {
          Text("Swift Foxx")
            .font(.title2)
            .fontWeight(.semibold)
          Text("Your account, cloud, and more")
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
      }
    }
  }
}
```

This view is responsible for displaying the image and the name of the user and provide a way for navigating to *account details*.

### Next Stop — Add Features Grouped By Relevance

{% include image-carousel.html
id="ss-init"
  images="
    https://swiftfoxx.github.io/swiftblog-assets/images/posts/settings/settings-light.png,
    https://swiftfoxx.github.io/swiftblog-assets/images/posts/settings/settings-dark.png,
    https://swiftfoxx.github.io/swiftblog-assets/images/posts/settings/settings-mac-light.png,
    https://swiftfoxx.github.io/swiftblog-assets/images/posts/settings/settings-mac-dark.png
  "
  caption="Settings form in different color schemes"
 %}

Now the next thing that becomes obvious is repetition. Several rows follow the same pattern: a title on the leading side, a compact control on the trailing side, and no navigation in between.

This is where `SettingRow`{: .inline-code } starts to pay for itself.

Because every setting is expressed through the same abstraction, adding new preferences becomes an act of composition rather than layout. The list doesn’t grow more complex as features are added; it simply grows longer.

That distinction matters.

One example of this is `ColorPickerMenu`{: .inline-code }. Color selection is traditionally treated as a special case, often pushed into a modal or a full-screen picker. In this project, it’s treated like any other preference.

The picker lives inline, constrained by the same row width, and visually aligned with every other control.

```swift
SettingRow("Accent Color") {
  ColorPickerMenu(selectedColor: $accentColor)
}
```

This keeps the mental model intact. The user is still “in settings,” not temporarily somewhere else. The control adapts to the screen, not the other way around.

`AdsPicker`{: .inline-code } introduces a slightly different kind of setting. Unlike appearance or color, this choice isn’t purely aesthetic. It’s closer to policy than personalization.

Even so, it uses the same structure.

```swift
SettingRow("Personalized Ads") {
  AdsPicker(selection: $adsPreference)
}
```

There’s no visual escalation here. No warning styling. No modal confirmation. The settings screen treats it as just another decision the user can make, and that restraint is important. The UI stays emotionally flat, even when the setting itself carries weight.

### Final Thoughts

The result is a settings scene that’s easy to extend, easy to refactor, and—most importantly—easy to live with.

And that’s exactly what a settings screen should be. Although many things depend on the business logic and the designer's take on the concepts, but the core expression remains the same — it should be scalable, fast, reusable, and easy to refactor.

You'll find the completed project on my GitHub if you like. [GitHub](https://github.com/SwiftFoxx/swiftblog-settings-scene.git){: .inline-link }