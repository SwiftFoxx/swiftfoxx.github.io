---
layout: post
title: Swift — How To Build And Run A Local Server Using Swift
display_title: Build And Run Local Server With Swift
hashtag: swift
description: Server in swift
og_image: https://swiftfoxx.github.io/swiftblog-assets/images/posts/og-images/local.server.cover.png
date: Jan 21, 2026
tags: swift, server, xcode
keywords: swift, server, dev server, local server, swift server, local server in swift
---

![Local Server With Swift](https://swiftfoxx.github.io/swiftblog-assets/images/posts/og-images/local.server.cover.png){: .cover-image }

You can use the **Swift Package Manager (SwiftPM)** if you want to build a standalone executable that runs as a local HTTP server. SwiftPM handles building, dependency resolution, and execution.

## Creating a Swift Executable Package

To start, create a new folder and run:

```bash
› mkdir SwiftLocalServer
› cd SwiftLocalServer
› swift package init --type executable
```

Inside `Sources/SwiftLocalServer/main.swift`{: .inline-code } is where your server will live. This executable will compile into something you can run with `swift run`{: .inline-code }, and it’s how we’ll build everything up.

We’ll lean on Apple’s Network framework to work with networking at the lowest level. It lets us listen for connections without any external dependencies.

## Building From Scratch

### Listening on a Port — The Bare Minimum

The first step in any server is listening for TCP connections. The Network framework lets us do that:

```swift
import Foundation
import Network

@main
struct SwiftLocalServer {
  static func main() {
    createListener()
  }

  private static func createListener() {
    do {
            let listener = try NWListener(using: .tcp, on: 8080)
            listener.newConnectionHandler = { newConnection in
                newConnection.start(queue: .main)
                newConnection.receive(minimumIncompleteLength: 1, maximumLength: 8192) { data, contentContext, isComplete, error in
                    if let data, let request = String(data: data, encoding: .utf8) {
                        print("Request received: \(request)")
                    }
                }
            }

            listener.start(queue: .main)
            dispatchMain()
        } catch {
            print("Error from try-catch: ", error)
        }
  }
}
```

This code creates a TCP listener on port **8080**. 

We have 2 options to get the code up and running. We can run it from Xcode itself, or we can use Terminal which is my absolute favorite for this kind of projects.

If you are using Terminal like me, just paste in this line:

```bash
swift run
```

All you need to do in order to actually get something in the console/Terminal is load `localhost:8080`{: .inline-code } in any browser.

The output should look like this:

```text
Request received: GET / HTTP/1.1
Host: localhost:8080
Sec-Fetch-Dest: document
User-Agent: [Redacted]
Upgrade-Insecure-Requests: 1
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Sec-Fetch-Site: none
Sec-Fetch-Mode: navigate
Accept-Language: en-US,en;q=0.9
Priority: u=0, i
Accept-Encoding: gzip, deflate
Connection: keep-alive
```

**But** before writing your own code in `SwiftLocalServer`{: .inline-code }, you need to update the `Package.swift`{: .inline-code }. You need to specify that the package is being built for mac platforms, not otherwise.

Add **platform** value just under the `name`{: .inline-code } parameter like so:

```swift
platforms: [.macOS(.v10_15)],
```

Now your Package.swift should look similar to this:

```swift
// swift-tools-version: 6.2
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "SwiftLocalServer",
    platforms: [.macOS(.v10_15)],
    targets: [
        // Targets are the basic building blocks of a package, defining a module or a test suite.
        // Targets can depend on other targets in this package and products from dependencies.
        .executableTarget(
            name: "SwiftLocalServer"
        ),
    ]
)
```

### Parsing Basic HTTP

Real HTTP has a method (`GET`{: .inline-code }, `POST`{: .inline-code }, etc.), a path (`/users`{: .inline-code }, `/users/123`{: .inline-code }), headers, and possibly a body. 

To make sense of incoming text, let's implement a simple parser:

```swift
final class Parser {
    nonisolated(unsafe) static let shared = Parser()
    private init() {}
    
    func parseRequest(_ text: String) -> (method: String, path: String, headers: [String: String], body: String) {
        let lines = text.components(separatedBy: "\r\n")
        let requestLine = lines[0].split(separator: " ")
        let method = String(requestLine[0])
        let path = String(requestLine[1])
        
        var headers: [String: String] = [:]
        var body: String = ""
        var isBody = false
        
        for line in lines.dropFirst() {
            if line.isEmpty {
                isBody = true
                continue
            }
            
            if isBody {
                body += line
            } else {
                let parts = line.split(separator: ":")
                if parts.count > 2 {
                    headers[String(parts[0])] = parts[1].trimmingCharacters(in: .whitespaces)
                }
            }
        }
        return (method, path, headers, body)
    }
}
```

Now, let's parse our request, shall we?

Use `Parse`{: .inline-code } class to parse your request:

```swift
listener.newConnectionHandler = { newConnection in
                newConnection.start(queue: .main)
                newConnection.receive(minimumIncompleteLength: 1, maximumLength: 8192) { data, contentContext, isComplete, error in
                    if let data, let request = String(data: data, encoding: .utf8) {
                        print("Request received: \(request)")
                        let parsed = Parser.shared.parseRequest(request)
                        print("""
                                Parsed Request:

                                → Method: \(parsed.method)
                                → Path: \(parsed.path)
                                → Headers: \(parsed.headers)
                                → Body: \(parsed.body)
                            """)
                    }
                }
            }
```

Stop the execution in Terminal with `⌃ + C`{: .inline-code } or click the stop button on Xcode and run it again.

Now when you load `localhost:8080`{: .inline-code }, you should see this:

```text
Request received: GET / HTTP/1.1
Host: localhost:8080
Sec-Fetch-Dest: document
User-Agent: [Redacted]
Upgrade-Insecure-Requests: 1
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Sec-Fetch-Site: none
Sec-Fetch-Mode: navigate
Accept-Language: en-US,en;q=0.9
Priority: u=0, i
Accept-Encoding: gzip, deflate
Connection: keep-alive


Parsed Request:

→ Method: GET
→ Path: /
→ Headers: ["Host": "localhost"]
→ Body: 
```

### User Store

You’ll want to manage user data. A simple struct makes this easy:

```swift
struct User: Codable {
    let id: UUID
    var name: String
    var favorite: Bool
}

var users: [User] = []
```

This array holds users in memory. For a simple local server, this is fine; for real apps you’d persist to a database.

### Routing and CRUD Logic

Now respond based on paths. After parsing a request in your listener, branch on method and path:

```swift
final class Route {
    typealias Payload = (method: String, path: String, headers: [String: String], body: String)

    nonisolated(unsafe) static let shared = Route()
    private init() {}

    func serve(to payload: Payload) {
        switch (payload.method, payload.path) {
        case ("GET", "/users"):
            sendJSON(users)

        case ("POST", "/users"):
            if let data = body.data(using: .utf8),
               let newUser = try? JSONDecoder().decode(User.self, from: data) {
                users.append(newUser)
                sendJSON(newUser)
            }

        case ("GET", let p) where p.starts(with: "/users/"):
            let idStr = String(p.split(separator: "/")[1])
            if let id = UUID(uuidString: idStr),
               let found = users.first(where: { $0.id == id }) {
                sendJSON(found)
            } else {
                sendResponse(status: 404, body: "Not Found")
            }

        case ("DELETE", let p) where p.starts(with: "/users/"):
            let idStr = String(p.split(separator: "/")[1])
            if let id = UUID(uuidString: idStr),
               let idx = users.firstIndex(where: { $0.id == id }) {
                let removed = users.remove(at: idx)
                sendJSON(removed)
            }

        default:
            sendResponse(status: 404, body: "Not Found")
        }
    }
}
```

Here you check for a simple **Bearer token authorization** in headers if you like. If it doesn’t match, you return a basic 401 Unauthorized.

And you use `Route`{: .inline-code } inside `newConnectionHandler`{: .inline-code } and you have got yourself a running local server using Swift.

```swift
listener.newConnectionHandler = { newConnection in
                newConnection.start(queue: .main)
                newConnection.receive(minimumIncompleteLength: 1, maximumLength: 8192) { data, contentContext, isComplete, error in
                    if let data, let request = String(data: data, encoding: .utf8) {
                        print("Request received: \(request)")
                        let parsed = Parser.shared.parseRequest(request)
                        Route.shared.serve(to: parsed)
                    }
                }
            }
```

The key parts here are:

<div class="two-col-grid">
<div>Listing Users</div>
<div><span class="inline-code">GET /Users</span></div>
<div>Creating Users</div>
<div><span class="inline-code">POST /Users</span></div>
<div>Fetching by ID</div>
<div><span class="inline-code">GET /Users/:id</span></div>
<div>Deleting Users</div>
<div><span class="inline-code">DELETE /Users/:id</span></div>
</div>


{: .mt-2 }

Responses are sent with helper functions like `sendJSON`{: .inline-code } and `sendResponse`{: .inline-code }.

### Crafting Valid HTTP Responses

Every handler needs to send correct headers and body:

```swift
func sendResponse(status: Int, body: String) {
    let response = """
    HTTP/1.1 \(status)
    Content-Type: text/plain
    Content-Length: \(body.utf8.count)

    \(body)
    """
    connection.send(content: response.data(using: .utf8))
}

func sendJSON<T: Codable>(_ value: T) {
    let body = try! JSONEncoder().encode(value)
    let header = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: \(body.count)\r\n\r\n"
    connection.send(content: header.data(using: .utf8)!)
    connection.send(content: body)
}
```

These build basic HTTP replies from your data types. `sendJSON`{: .inline-code } uses `Codable`{: .inline-code } to convert structs to JSON.

You can find the complete project (following this article) here SwiftLocalServer.

---

## Using 3rd-Party Libraries

### Vapor: A Full-Featured Swift Web Framework

For most real APIs, developers use **Vapor**, the dominant Swift server framework built on SwiftNIO. Vapor lets you define routes, parse JSON, and handle auth without dealing with raw sockets. It’s shipped by an active community and supported as one of the main server options for Swift. [Wikipedia](https://en.wikipedia.org/wiki/Vapor_%28web_framework%29?utm_source=chatgpt.com){: .inline-link }

<!-- Add code for installing the dependency -->

When you create a Vapor project (for example with the Vapor toolbox), you get an application where routes are declared in a clean declarative form. A typical route looks like:

```swift
app.get("users") { req in
    return users
}

app.post("users") { req in
    let input = try req.content.decode(CreateUser.self)
    let user = User(id: UUID(), name: input.name, favorite: false)
    users.append(user)
    return user
}
```

Vapor handles all HTTP parsing, JSON encoding, and response generation for you. It also supports middleware like authentication (including bearer tokens and JWT), content validation, and database integration. [swift.org](https://swift.org/getting-started/vapor-web-server/?utm_source=chatgpt.com){: .inline-link }

For authorization with Vapor, you can build middleware that checks `Authorization`{: .inline-code } headers before letting requests reach your handlers. Vapor’s routing system makes it easy to parameterize URLs (e.g., `/users/:id`{: .inline-code }) and provides typed parameter extraction.

#### Adding Authentication and Persistence

