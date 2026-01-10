---
layout: post
title: All about creating a project with Xcode
description: All about creating a project with Xcode.
---

# All About Creating a Project With Xcode
<!-- No way to style plain text, i.e. <p> in md -->
<p>Jan 05, 2026 <span class="hashtag">xcode</span></p>

The article walks through every single step involved in creating a new project with Xcode, explains why each option exists, and what choices actually matter in real-world development.

Open Xcode and you see this:

<figure>
    <img src="https://swiftfoxx.github.io/swiftblog-assets/images/posts/xcode-welcome-window.png" alt="Xcode Welcome Screen">
    <figcaption>Xcode Welcome Screen</figcaption>
</figure>

## Introduction

Xcode is Apple's **official IDE** for building software across Apple platforms [Apple](https://developer.apple.com/xcode/){: .inline-link }

Apple says

> Xcode offers the tools you need to develop, test, and distribute apps for Apple platforms, including predictive code completion, generative intelligence powered by the best coding models, advanced profiling and debugging tools, and simulators for Apple devices.
{: .quote}

## Important to Know

{: .empty1 }

<!-- Summary -->
### Summary
- **Languages:** Swift, Objective-C
- **Other Languages:** C/C++, Metal
- **Frameworks:** SwiftUI, UIKit, AppKit, Foundation, Combine, Core Data & many more
- **Platforms:** iOS, macOS, watchOS, tvOS, visionOS

{: .empty1 }

### Prerequisites

Before starting make sure you have

- **Mac with a recent macOS version** that supports the latest Xcode.
- **Xcode** installed from AppStore or Apple. [1](https://apps.apple.com/in/app/xcode/id497799835?mt=12Xcode){: .inline-link } [2](https://developer.apple.com/download/applications/){: .inline-link }
- **Apple Developer Account** that you can add in Xcode for *code signing*
- **For Windows**, use a remote Mac, a cloud Mac service, or dual boot into macOS, because Xcode runs only on macOS.

## Starting A New Xcode Project

When you open Xcode, you'll see the **Welcome Window**.

As you can see in the figure, there are 3 options to choose from:
- Create New Project...
- Clone Git Repository...
- Open Existing Project...

Let's look at each option and what it does

**Create New Project** starts a new project from scratch. Xcode just creates basic files to get you going and does everything else, such as linking, and putting values to **plist** files. You can run this project, and you'll see a scene with a **Globe** <img class="inline-image" src="../Resources/svg/globe.svg" alt="globe svg" width="18px" height="18px"> and **Hello World!**

**Clone Git Repository** asks for a repository link. If you have a project already pushed to any git services, you'll be able to download that and open the `xcodeproj`{: .inline-code } or `xcworkspace`{: .inline-code} file. If Xcode fails to open the project for some reason, find the project file with the extensions mentioned and open it.

**Open Existing Project** enables you to open any local project either downloaded from git or not. Although, recently opened projects will be listed in the right panel.

{: .empty1}

## Platforms and Templates
