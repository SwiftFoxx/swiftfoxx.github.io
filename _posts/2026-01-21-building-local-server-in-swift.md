---
layout: post
title: Swift — How To Build And Run A Local Server Using Swift
display_title: Build And Run Local Server With Swift
hashtag: swift
description: Build and run a local HTTP server in Swift using an executable package, covering low-level networking, basic HTTP parsing, routing, and user management.
og_image: https://swiftfoxx.github.io/swiftblog-assets/images/posts/og-images/local.server.cover.png
date: Jan 21, 2026
revision: Jan 28, 2026
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

You can find the complete project (following this article) here [SwiftLocalServer](/downloads/download-local-server/).

---

## Using Other Libraries

Using 3rd party libraries, such as Vapor, takes away the hassle to create and maintain your own code for the server and the give us a more 'readable' way to defining routes. But that makes debugging harder, and you have no control over how the server behaves. [Vapor](https://vapor.codes){: .inline-link }

### Adding Dependencies

The way you can use a 3rd party library is by adding them as dependencies. It's different from adding a dependency to an app. We need to update the `Package.swift`{: .inline-link } in order for Xcode to recognize and install the dependencies.

Open Package.swift in Xcode. Each server framework you use gets added as a dependency in `Package.swift`{: .inline-code }. Here’s the general pattern:

```swift
// swift-tools-version:5.6
import PackageDescription

let package = Package(
    name: "SwiftLocalServer",
    platforms: [
        .macOS(.v12)
    ],
    dependencies: [
        // Dependencies will go here
    ],
    targets: [
        .executableTarget(
            name: "SwiftLocalServer",
            dependencies: []),
        .testTarget(
            name: "SwiftLocalServerTests",
            dependencies: ["SwiftServer"]),
    ]
)
```

You’ll modify the `dependencies`{: .inline-code } array and target dependencies for each library below.

### Vapor

Vapor is one of the most popular Swift server frameworks and lets you write routes, middleware, and JSON APIs in a Swift idiomatic way.

#### Step 1: Add Vapor to Dependencies

```swift
dependencies: [
    .package(url: "https://github.com/vapor/vapor.git", from: "4.0.0")
],
targets: [
    .executableTarget(
        name: "SwiftServer",
        dependencies: [
            .product(name: "Vapor", package: "vapor")
        ])
]
```

Save the file and run:

```bash
swift build
```

#### Step 2: Write a Vapor Server

Update main.swift with:

```swift
import Vapor

var env = try Environment.detect()
let app = Application(env)
defer { app.shutdown() }

// Define a basic route
app.get("hello") { req -> String in
    return "Hello from Vapor!"
}

try app.run()
```

This tells Vapor to start a server and respond on `/hello`{: .inline-code }.

#### Step 3: Run the Server

```bash
swift run
```

Open a browser and visit `http://localhost:8080/hello`{: .inline-code }. You should see the text response.

### Perfect (lightweight Swift server)

Perfect is another Swift-based web server and toolkit for REST services.

#### Step 1: Add Perfect Dependencies

```swift
dependencies: [
    .package(url: "https://github.com/PerfectlySoft/Perfect-HTTPServer.git", from: "3.0.0")
],
targets: [
    .executableTarget(
        name: "SwiftServer",
        dependencies: [
            .product(name: "PerfectHTTPServer", package: "Perfect-HTTPServer")
        ])
]
```

Build the package:

```bash
swift build
```

#### Step 2: Perfect Server Code

Replace main.swift with:

```swift
import PerfectHTTP
import PerfectHTTPServer

// Create a server
let server = HTTPServer()

// Create a route handler
var routes = Routes()
routes.add(method: .get, uri: "/hello") { request, response in
    response.setBody(string: "Hello from Perfect!")
    response.completed()
}

server.addRoutes(routes)
server.serverPort = 8080

do {
    try server.start()
} catch {
    print("Error starting Perfect server: \(error)")
}
```

Run it:

```bash
swift run
```

Open a browser and visit `http://localhost:8080/hello`{: .inline-code }.

### Kitura (community-maintained, but historically a Swift server option)

Kitura was an IBM-backed Swift server framework for REST APIs and routing. While no longer in active development, it still works for learning purposes.

#### Step 1: Add Kitura

```swift
dependencies: [
    .package(url: "https://github.com/Kitura/Kitura.git", from: "2.9.0")
],
targets: [
    .executableTarget(
        name: "SwiftServer",
        dependencies: [
            .product(name: "Kitura", package: "Kitura")
        ])
]
```

Build the package:

```bash
swift build
```

#### Step 2: Basic Kitura Server

Replace main.swift with:

```swift
import Kitura

let router = Router()

router.get("/hello") { request, response, next in
    response.send("Hello from Kitura!")
    next()
}

Kitura.addHTTPServer(onPort: 8080, with: router)
Kitura.run()
```

Run:

```bash
swift run
```

Open a browser and visit `http://localhost:8080/hello`{: .inline-code }.

## Testing Your Local Server

After running any of these servers, open a browser or send a request with curl:

```bash
curl http://localhost:8080/hello
```

You should see the string response you defined.

As you expand beyond a simple route, each library lets you add JSON APIs, database integration, templating and middleware. Vapor’s `Content`{: .inline-code } protocol makes JSON easy, Perfect provides connectors for databases, and even older frameworks like Kitura support routing and middleware stacks.

## Closing Thoughts

Building a local server in Swift follows a consistent pattern regardless of the framework. Swift Package Manager provides a standard way to create executable projects and manage third-party dependencies, which keeps setup and iteration simple. Most server libraries expose similar concepts such as routing, request handling, and response generation, even though their APIs differ.

Using Swift on the server also aligns well with app development workflows. Sharing language, tooling, and mental models between client and server reduces context switching and makes local testing easier. As requirements grow, these same foundations can be extended to support structured APIs, persistence, and deployment without changing the core project setup.