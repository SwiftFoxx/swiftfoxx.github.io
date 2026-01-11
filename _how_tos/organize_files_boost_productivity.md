---
layout: post
title: Organize Files to Boost Productivity
description: How to structure Swift & SwiftUI projects for long-term maintainability.
date: Jan 07 2026
---

# Organize Your Files To Boost Productivity
<!-- No way to style plain text, i.e. <p> in md -->
<p>{{ page.date | date: "%b %d, %Y" }} <span class="hashtag">projectStructure</span></p>

{: .empty1 }

Organizing your files in a specific structure is important not only because it "*looks*" good, but also because it can speed up your development, improve how you code, and even decrease build and compile time.

It's debatable which one is the best structure for files and folders that seems to reach no conclusions. But it is imperative to arrange those things in ways that seem beneficial for the project's requirements and the architecture that's being maintained.

Let's explore **how to organize files**, **why each structure exists**, and **when to use which architecture** — with concrete, and real-world examples.

## Why File Organization Matters
In Swift projects, file organization directly affects *navigation speed in Xcode*, *architectural discipline*, *mental context switching*, *merge conflicts*, *compile-time clarity*.

While a good structure mirrors how you think about the app, enforces boundaries naturally, grows linearly with complexity, a bad structure encourages massive files, hides dependencies, couples unrelated features, makes refactors painful.

## The Golden Rule (Before Any Architecture)

Files should be grouped by why they exist, not what they are.
{: .quote }

A good example of that would be a structure as follows:
```text
Features
├─Login/
├─ Profile/
├─ Settings/
```

Types are an implementation detail.
Features are the product.

## A Clean SwiftUI App (W/O an Architecture)

An ideal structure for looking around or smaller projects, such as, a timer app that just starts and stops the timer on tap.

This is the most basic structure of all — the foundation of the understanding of engineering a project. Even though, the understanding of structuring the code is rather important to compile the file structure itself. And therefore, it's always advisable to start with the basic and keep building as you go. 

With a stronger understanding of the code's components, the place for them would be determined during development.

```text
MyApp/
├─ App/
│  └─ MyAppApp.swift
│
├─ Features/
│  └─ Home/
│     ├─ HomeView.swift
│     └─ HomeViewModel.swift
│
├─ Shared/
│  ├─ Components/
│  ├─ Extensions/
│  └─ Utilities/
│
├─ Resources/
│  ├─ Assets.xcassets
│  └─ Localizable.strings
```
This structure is **clean**, **isolated**, and **decoupled**.

But scaling the app would create hundreds of files inside `Features`{: .inline-code } which would most certainly overwhelm the process of managing the project later.

## Feature Based Organization
Most projects using SwiftUI as interface would benefit from this structure. But again, it may pose some challenges for scalable and complicated projects.

```text
Features/
├─ Login/
│  ├─ LoginView.swift
│  ├─ LoginViewModel.swift
│  ├─ LoginService.swift
│  └─ LoginModels.swift
│
├─ Profile/
│  ├─ ProfileView.swift
│  ├─ ProfileViewModel.swift
│  └─ ProfileModels.swift
```
In this specific structure:
1. files referencing to the same (modular) feature are grouped together inside the same folder
2. modifying a feature would require very less effort and time
3. ownership is obvious rather than abstract
4. onboarding is faster

Therefore, if you have nothing else to worry about for your project, incorporating this structure would help you work better.

## MVVM File Structure
**MVVM works well with SwiftUI** — it's not just a statement, it's a fact.

This structure works so well with SwiftUI that you may be able to pull off any kind of project with minimal effort because *SwiftUI handles rendering*, *ViewModels manage state*, and *Models remain simple*.

{: .empty1}

```text
Features/
├─ Feed/
│ ├─ FeedView.swift
│ ├─ FeedViewModel.swift
│ ├─ FeedState.swift
│ └─ FeedService.swift
│
├─ Settings/
│  ├─ SettingsView.swift
│  ├─ SettingsViewModel.swift
│  ├─ SettingsState.swift
│  └─ SettingsService.swift
```
**MVVM** enforces using of ViewModels with Views for the interaction between the View and the Model.

Referencing and manipulating the Model directly from the View is doable but strongly discouraged. Data manipulation and networking are designed to be done in lower priority qOS. The main thread is always allocated for View updates. And therefore working with Data and network in that thread do freeze the View.

When a ViewModel sits between the Model and the View, it gets very straightforward to direct the heavy and memory-hungry code to run in threads other than the Main thread.

MVVM also offers decoupling of features, service, and workers to keep it clean and easy to maintain. And if the structure is followed correctly, testing gets easier with mock services and mock ViewModels.

## Clean Architecture

For large and scalable projects where multiple teams work together to build features and ship the app, the **Clean Architecture** works wonders. This architecture is good for long-term maintenance too.

```text
App/
Core/
│
├─ Domain/
│  ├─ Entities/
│  ├─ UseCases/
│  └─ Repositories/
│
├─ Data/
│  ├─ Network/
│  ├─ Persistence/
│  └─ RepositoryImpl/
│
├─ Presentation/
│  └─ Features/
│     └─ Feed/
│        ├─ FeedView.swift
│        ├─ FeedViewModel.swift
│        └─ FeedMapper.swift
```

It may look like MVVM on the surface, but this is named "Clean" for a reason. The architecture granulates things to the point where dependency becomes intentional.

In simple words, this architecture, **enforces dependency direction**, **isolates business logic**, **makes testing trivial**, **supports multiple UIs**.

## Modular Architecture — Swift Packages
For scalable SwiftUI apps, modules matter. And Modular Architecture separates the granulated areas even more.

```text
MyApp/
├─ App/
├─ Packages/
│  ├─ DesignSystem/
│  ├─ Networking/
│  ├─ AuthFeature/
│  └─ ProfileFeature/
```

The word that always comes to mind while working with Modular Architecture is **isolation**. Every module is isolated by design since one module does not have access to another. This way the all the different logics are put in their places that rarely mixes up. You can import and access any module wherever you want.

This architecture offers **compile-time isolation**, **faster builds**, **clearer ownership**, and **reusable features**.

Swift Packages are first-class citizens in SwiftUI projects.

## Extensions

We may need to extend any class, struct, or protocol at any point of time for reducing complexity and repetition in our code. This is another measure to keep the logic clean and readable.

An example of extension might look like this:

```swift
extension Array {
   subscript (safe index: Int) -> Element? {
    guard count > index else {
      return nil
    }
    return self[index]
  }
}
```

The point to bring it up in an article concerning file and folder structure is that all the extensions you create should never be written in the same file. This calls for huge files and delayed building.

A good example of structuring your extensions is:

```text
Extensions/
├─ View+Modifiers.swift
├─ Color+Theme.swift
└─ String+Validation.swift
```
## Naming Conventions (They Matter)

Small things to keep in mind:
- One type per file
- File name = primary type name
- Avoid generic names (Manager, Helper, Util)

## Preview-Friendly Organization

SwiftUI previews thrive when files are small.

**Tips**
1. keep Views under ~200 lines
2. extract subviews early
3. colocate preview data

```text
LoginView+PreviewData.swift
```

---

{: .empty2_5 }
The architecture and file-folder structure are the things that matter more than the ability to code. *If you have to think about where a file goes, your structure isn’t clear enough*.